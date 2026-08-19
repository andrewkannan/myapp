import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { getSession } from '@/lib/auth';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfRange = new Date(today);
    endOfRange.setDate(today.getDate() + 2); // Today + Tomorrow + Day After
    endOfRange.setHours(23, 59, 59, 999);

    const [shifts, leaves, stations] = await Promise.all([
      prisma.shift.findMany({
        where: {
          userId: session.id,
          date: { gte: today, lte: endOfRange },
          status: 'Scheduled'
        },
        include: { station: true }
      }),
      prisma.leave.findMany({
        where: {
          userId: session.id,
          date: { gte: today, lte: endOfRange },
          status: 'APPROVED'
        }
      }),
      prisma.station.findMany()
    ]);

    return NextResponse.json({ shifts, leaves, stations });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}
