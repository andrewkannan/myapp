import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Calculate start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Fetch all locations, stations, and users
    const [locations, stations, users, shifts, leaves] = await Promise.all([
      prisma.location.findMany(),
      prisma.station.findMany(),
      prisma.user.findMany({ where: { isActive: true }, orderBy: { abbreviation: 'asc' } }),
      prisma.shift.findMany({
        where: {
          date: { gte: startDate, lte: endDate }
        },
        include: { user: true, station: true }
      }),
      prisma.leave.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          status: 'APPROVED'
        },
        include: { user: true }
      })
    ]);

    return NextResponse.json({ locations, stations, users, shifts, leaves });
  } catch (error) {
    console.error('Error fetching roster:', error);
    return NextResponse.json({ error: 'Failed to fetch roster data' }, { status: 500 });
  }
}
