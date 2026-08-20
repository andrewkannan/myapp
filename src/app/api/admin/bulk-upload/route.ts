import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.some((p: string) => ['ROSTER_EDIT', 'BULK_UPLOAD'].includes(p))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { type, records } = await request.json();
    if (!type || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Missing type or records' }, { status: 400 });
    }

    const users = await prisma.user.findMany();
    const stations = await prisma.station.findMany({ include: { location: true } });

    const created: number[] = [];
    const errors: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const [index, record] of records.entries()) {
        const rowNum = index + 2; // +2 because row 1 is header, data starts at row 2

        // ── ROSTER ──
        if (type === 'roster') {
          const { date, staffAbbreviation, location, station, shiftPeriod, startTime, endTime, status, remarks } = record;

          if (!date || !staffAbbreviation || !station) {
            errors.push(`Row ${rowNum}: Missing required fields (Date, Staff_Abbreviation, Station).`);
            continue;
          }

          const user = users.find(u => u.abbreviation?.toUpperCase() === staffAbbreviation.toUpperCase());
          if (!user) { errors.push(`Row ${rowNum}: Staff '${staffAbbreviation}' not found.`); continue; }

          const parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) { errors.push(`Row ${rowNum}: Invalid date '${date}'.`); continue; }
          parsedDate.setHours(12, 0, 0, 0);

          // Match station by name, optionally filtering by location
          let matchedStation = stations.find(s => {
            const nameMatch = s.name.toUpperCase() === station.toUpperCase();
            if (location) {
              return nameMatch && s.location.name.toUpperCase() === location.toUpperCase();
            }
            return nameMatch;
          });

          if (!matchedStation) { errors.push(`Row ${rowNum}: Station '${station}'${location ? ` at '${location}'` : ''} not found.`); continue; }

          await tx.shift.create({
            data: {
              date: parsedDate,
              userId: user.id,
              stationId: matchedStation.id,
              shiftPeriod: shiftPeriod || 'Full',
              startTime: startTime || null,
              endTime: endTime || null,
              status: status || 'Scheduled',
              remarks: remarks || null,
            }
          });
          created.push(rowNum);

        // ── LEAVE ──
        } else if (type === 'leave') {
          const { date, staffAbbreviation, leaveType, period, status, remarks } = record;

          if (!date || !staffAbbreviation || !leaveType) {
            errors.push(`Row ${rowNum}: Missing required fields (Date, Staff_Abbreviation, Leave_Type).`);
            continue;
          }

          const user = users.find(u => u.abbreviation?.toUpperCase() === staffAbbreviation.toUpperCase());
          if (!user) { errors.push(`Row ${rowNum}: Staff '${staffAbbreviation}' not found.`); continue; }

          const parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) { errors.push(`Row ${rowNum}: Invalid date '${date}'.`); continue; }
          parsedDate.setHours(12, 0, 0, 0);

          const validTypes = ['AL', 'MC', 'UPL', 'OFF'];
          const lt = leaveType.toUpperCase();
          if (!validTypes.includes(lt)) { errors.push(`Row ${rowNum}: Invalid Leave_Type '${leaveType}'. Use: ${validTypes.join(', ')}`); continue; }

          await tx.leave.create({
            data: {
              userId: user.id,
              date: parsedDate,
              period: (period || 'FULL').toUpperCase(),
              type: lt,
              status: (status || 'APPROVED').toUpperCase(),
              remarks: remarks || null,
            }
          });
          created.push(rowNum);

        // ── TIME-OFF ──
        } else if (type === 'timeoff') {
          const { date, staffAbbreviation, reason, studyAccNo, startTime, endTime, hours, status, remarks } = record;

          if (!date || !staffAbbreviation || !reason) {
            errors.push(`Row ${rowNum}: Missing required fields (Date, Staff_Abbreviation, Reason).`);
            continue;
          }

          const user = users.find(u => u.abbreviation?.toUpperCase() === staffAbbreviation.toUpperCase());
          if (!user) { errors.push(`Row ${rowNum}: Staff '${staffAbbreviation}' not found.`); continue; }

          const parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) { errors.push(`Row ${rowNum}: Invalid date '${date}'.`); continue; }
          parsedDate.setHours(12, 0, 0, 0);

          const parsedHours = parseFloat(hours) || 0;

          await tx.timeOffRecord.create({
            data: {
              userId: user.id,
              date: parsedDate,
              reason: reason,
              studyAccNo: studyAccNo || null,
              startTime: startTime || null,
              endTime: endTime || null,
              hours: parsedHours,
              status: (status || 'APPROVED').toUpperCase(),
              approvedById: (status || 'APPROVED').toUpperCase() === 'APPROVED' ? session.id : null,
            }
          });
          created.push(rowNum);

        } else {
          errors.push(`Row ${rowNum}: Unknown upload type '${type}'.`);
        }
      }
    });

    // Audit log
    if (created.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          action: 'BULK_UPLOAD',
          details: `Type: ${type.toUpperCase()}. Created: ${created.length}. Errors: ${errors.length}.`
        }
      });
    }

    return NextResponse.json({
      success: true,
      type,
      created: created.length,
      errorCount: errors.length,
      errors,
    });

  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
