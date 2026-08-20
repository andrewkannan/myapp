import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.includes('ROSTER_EDIT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { records } = await request.json();
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    const users = await prisma.user.findMany();
    const stations = await prisma.station.findMany();

    const createdShifts = [];
    const createdLeaves = [];
    const createdTimeOffs = [];
    const errors = [];

    // Use a transaction for all inserts to ensure fast performance and safety
    await prisma.$transaction(async (tx) => {
      for (const [index, record] of records.entries()) {
        const { date, staffAbbreviation, recordType, value, period, remarks } = record;
        const rowNum = index + 1; // Excel row number (approx)

        if (!date || !staffAbbreviation || !recordType || !value) {
          errors.push(`Row ${rowNum}: Missing required fields.`);
          continue;
        }

        const user = users.find(u => u.abbreviation?.toUpperCase() === staffAbbreviation.toUpperCase());
        if (!user) {
          errors.push(`Row ${rowNum}: Staff abbreviation '${staffAbbreviation}' not found.`);
          continue;
        }

        // Fix the date parser to treat string as local date correctly
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          errors.push(`Row ${rowNum}: Invalid date format '${date}'.`);
          continue;
        }
        parsedDate.setHours(12, 0, 0, 0); // Noon to avoid timezone issues

        const type = recordType.toUpperCase();

        if (type === 'ROSTER') {
          const station = stations.find(s => s.name.toUpperCase() === value.toUpperCase());
          if (!station) {
            errors.push(`Row ${rowNum}: Station '${value}' not found.`);
            continue;
          }
          
          await tx.shift.create({
            data: {
              date: parsedDate,
              userId: user.id,
              stationId: station.id,
              shiftPeriod: period || 'Full',
              status: 'Scheduled',
              remarks: remarks || null
            }
          });
          createdShifts.push(rowNum);

        } else if (type === 'LEAVE') {
          await tx.leave.create({
            data: {
              userId: user.id,
              date: parsedDate,
              period: period || 'FULL',
              type: value.toUpperCase(),
              status: 'APPROVED',
              remarks: remarks || null
            }
          });
          createdLeaves.push(rowNum);

        } else if (type === 'TIMEOFF') {
          const hours = parseFloat(period) || 0;
          await tx.timeOffRecord.create({
            data: {
              userId: user.id,
              date: parsedDate,
              reason: value.toUpperCase(),
              hours: hours,
              status: 'APPROVED',
              approvedById: session.id
            }
          });
          createdTimeOffs.push(rowNum);

        } else {
          errors.push(`Row ${rowNum}: Unknown Record_Type '${recordType}'.`);
        }
      }
    });

    if (createdShifts.length > 0 || createdLeaves.length > 0 || createdTimeOffs.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          action: 'BULK_UPLOAD',
          details: `Uploaded ${createdShifts.length} shifts, ${createdLeaves.length} leaves, ${createdTimeOffs.length} timeoffs. Errors: ${errors.length}`
        }
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        shifts: createdShifts.length,
        leaves: createdLeaves.length,
        timeOffs: createdTimeOffs.length,
        errors: errors.length
      },
      errors
    });

  } catch (error) {
    console.error('Error processing bulk upload:', error);
    return NextResponse.json({ error: 'Internal server error processing bulk upload' }, { status: 500 });
  }
}
