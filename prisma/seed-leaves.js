const fs = require('fs');
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || (require('fs').existsSync('./dev.db') ? 'file:./dev.db' : 'file:./data/dev.db') });
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('Reading Excel file...');
  const workbook = xlsx.readFile('Annual leave 2026.xlsx');
  const sheet = workbook.Sheets['AL 2026'];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: null, header: 1 });

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const result = { leaves: [], publicHolidays: [] };
  let currentMonthNum = -1;

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
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

  for (const phDate of result.publicHolidays) {
    await prisma.publicHoliday.upsert({ where: { date: new Date(phDate) }, update: {}, create: { date: new Date(phDate), name: 'Public Holiday' } });
  }
  
  const allUsers = await prisma.user.findMany();
  const userMap = {};
  for (const u of allUsers) { if (u.abbreviation) userMap[u.abbreviation.toUpperCase()] = u.id; }
  
  let successCount = 0;
  await prisma.leave.deleteMany({});
  const leaveDataBatch = [];
  
  for (const leave of result.leaves) {
    let abbrev = leave.abbrev.toUpperCase();
    if (abbrev === 'A') continue;
    const userId = userMap[abbrev];
    if (userId) { leaveDataBatch.push({ userId: userId, date: new Date(leave.date), period: leave.period, type: leave.type, status: 'APPROVED' }); successCount++; }
  }
  await prisma.leave.createMany({ data: leaveDataBatch });
  console.log('Successfully extracted and inserted ' + successCount + ' leaves for 2026.');
}

seed().catch(console.error).finally(() => process.exit(0));
