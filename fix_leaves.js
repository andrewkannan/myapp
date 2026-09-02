const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const records = await prisma.timeOffRecord.findMany({ where: { status: 'APPROVED', hours: { lte: 0 } } });
  for (const r of records) {
    const startOfDay = new Date(r.date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(r.date); endOfDay.setHours(23, 59, 59, 999);
    const existing = await prisma.leave.findFirst({ where: { userId: r.userId, date: { gte: startOfDay, lte: endOfDay }, type: 'TO' } });
    if (!existing) {
      await prisma.leave.create({ data: { userId: r.userId, date: r.date, period: 'FULL', type: 'TO', status: 'APPROVED', remarks: r.reason || 'Time Off Claim' } });
      console.log('Created missing leave for TO:', r.id);
    }
  }
}
main();
