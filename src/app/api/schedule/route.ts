import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfRange = new Date(today);
    endOfRange.setDate(today.getDate() + 2); // Today + Tomorrow + Day After
    endOfRange.setHours(23, 59, 59, 999);

    const [shifts, leaves, stations, timeOffRecords] = await Promise.all([
      prisma.shift.findMany({
        where: {
          userId: session.id,
          date: { gte: today, lte: endOfRange },
          status: 'Scheduled'
        },
        include: { station: { include: { location: true } } }
      }),
      prisma.leave.findMany({
        where: {
          userId: session.id,
          date: { gte: today, lte: endOfRange },
          status: 'APPROVED'
        }
      }),
      prisma.station.findMany({ include: { location: true } }),
      prisma.timeOffRecord.findMany({
        where: {
          userId: session.id,
          date: { gte: today, lte: endOfRange },
          status: 'APPROVED'
        }
      })
    ]);

    // Convert only claim time-off records (negative hours) to leave-like objects
    const timeOffAsLeaves = timeOffRecords
      .filter(to => to.hours < 0)
      .map(to => ({
        id: to.id,
        userId: to.userId,
        date: to.date,
        type: 'TO',
        period: to.startTime && to.endTime ? `${to.startTime} - ${to.endTime}` : 'FULL',
        status: 'APPROVED',
        remarks: `${to.reason} (${to.hours} hrs)`
      }));

    return NextResponse.json({ shifts, leaves: [...leaves, ...timeOffAsLeaves], stations });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}
