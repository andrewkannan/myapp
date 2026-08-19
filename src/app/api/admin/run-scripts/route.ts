import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';


export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.some((p: string) => ['System Admin', 'SYSTEM_ADMIN'].includes(p))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const logs: string[] = [];
    
    // 1. MERGE STATIONS
    const locations = await prisma.location.findMany();
    const camden = locations.find(l => l.name === 'CAMDEN');
    const novena = locations.find(l => l.name === 'NOVENA');

    if (camden) {
      const camdenStations = await prisma.station.findMany({ where: { locationId: camden.id } });
      const camdenMAM = camdenStations.find(s => s.name === 'MAM' || s.name === 'MAM / US');
      const camdenUS = camdenStations.find(s => s.name === 'US');
      if (camdenMAM && camdenUS && camdenMAM.name !== 'MAM / US') {
        await prisma.shift.updateMany({ where: { stationId: camdenUS.id }, data: { stationId: camdenMAM.id } });
        await prisma.station.update({ where: { id: camdenMAM.id }, data: { name: 'MAM / US' } });
        await prisma.station.delete({ where: { id: camdenUS.id } });
        logs.push('Merged CAMDEN MAM and US');
      } else {
        logs.push('CAMDEN stations already merged or not found');
      }
    }

    if (novena) {
      const novenaStations = await prisma.station.findMany({ where: { locationId: novena.id } });
      const novenaXR = novenaStations.find(s => s.name === 'XR' || s.name === 'XR / MAM');
      const novenaMAM = novenaStations.find(s => s.name === 'MAM');
      if (novenaXR && novenaMAM && novenaXR.name !== 'XR / MAM') {
        await prisma.shift.updateMany({ where: { stationId: novenaMAM.id }, data: { stationId: novenaXR.id } });
        await prisma.station.update({ where: { id: novenaXR.id }, data: { name: 'XR / MAM' } });
        await prisma.station.delete({ where: { id: novenaMAM.id } });
        logs.push('Merged NOVENA XR and MAM');
      } else {
        logs.push('NOVENA stations already merged or not found');
      }
    }

    // 2. SEED LEAVES
    try {
      const excelPath = path.join(process.cwd(), 'Annual leave 2026.xlsx');
      if (fs.existsSync(excelPath)) {
        const workbook = xlsx.readFile(excelPath);
        const sheet = workbook.Sheets['AL 2026'];
        const data = xlsx.utils.sheet_to_json(sheet, { defval: null, header: 1 });
        
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const result: { leaves: any[], publicHolidays: string[] } = { leaves: [], publicHolidays: [] };
        let currentMonthNum = -1;

        for (let r = 0; r < data.length; r++) {
          const row: any = data[r];
          const firstCell = typeof row[0] === 'string' ? row[0].trim().toUpperCase() : null;
          if (firstCell && months.includes(firstCell)) { currentMonthNum = months.indexOf(firstCell); continue; }
          if (currentMonthNum !== -1) {
            for (let day = 1; day <= 31; day++) {
              const cellValue = row[day];
              if (cellValue && typeof cellValue === 'string') {
                const val = cellValue.trim();
                const dateObj = new Date(Date.UTC(2026, currentMonthNum, day));
                if (dateObj.getUTCMonth() !== currentMonthNum) continue;

                if (val === 'PH') result.publicHolidays.push(dateObj.toISOString());
                else if (val !== 'SUN' && val !== 'SAT') {
                  let period = 'FULL', abbrev = val;
                  if (val.toLowerCase().endsWith(' pm')) { period = 'PM'; abbrev = val.substring(0, val.length - 3).trim(); }
                  else if (val.toLowerCase().endsWith(' am')) { period = 'AM'; abbrev = val.substring(0, val.length - 3).trim(); }
                  result.leaves.push({ abbrev, date: dateObj.toISOString(), period, type: 'AL' });
                }
              }
            }
          }
        }

        let phCount = 0;
        for (const phDate of result.publicHolidays) {
          await prisma.publicHoliday.upsert({ where: { date: new Date(phDate) }, update: {}, create: { date: new Date(phDate), name: 'Public Holiday' } });
          phCount++;
        }
        logs.push(`Processed ${phCount} public holidays from Excel`);

        const allUsers = await prisma.user.findMany();
        const userMap: Record<string, string> = {};
        for (const u of allUsers) { if (u.abbreviation) userMap[u.abbreviation.toUpperCase()] = u.id; }
        
        let imported = 0, skipped = 0;
        for (const item of result.leaves) {
          const uid = userMap[item.abbrev.toUpperCase()];
          if (!uid) { skipped++; continue; }
          
          const existing = await prisma.leave.findFirst({
            where: { userId: uid, date: new Date(item.date), period: item.period }
          });
          if (!existing) {
            await prisma.leave.create({
              data: {
                userId: uid,
                date: new Date(item.date),
                period: item.period,
                type: 'AL',
                status: 'APPROVED',
                remarks: 'Imported from 2026 Excel'
              }
            });
            imported++;
          }
        }
        logs.push(`Leaves: ${imported} imported, ${skipped} skipped (unknown staff)`);
      } else {
        logs.push('Excel file not found, skipping leaves seed');
      }
    } catch (e: any) {
      logs.push('Error seeding leaves: ' + e.message);
    }

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
