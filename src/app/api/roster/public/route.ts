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
    // Fetch sequentially for better SQLite performance
    const locations = await prisma.location.findMany();
    const stations = await prisma.station.findMany();
    const users = await prisma.user.findMany({ where: { isActive: true }, orderBy: { abbreviation: 'asc' } });
    const shifts = await prisma.shift.findMany({
      where: { date: { gte: startDate, lte: endDate } }
    });
    const leaves = await prisma.leave.findMany({
      where: { date: { gte: startDate, lte: endDate }, status: 'APPROVED' }
    });
    const systemModalities = await prisma.systemModality.findMany({ orderBy: { name: 'asc' } });
    const timeOffRecords = await prisma.timeOffRecord.findMany({
      where: { date: { gte: startDate, lte: endDate }, status: 'APPROVED' }
    });

    const timeOffAsLeaves = timeOffRecords
      .filter(to => to.hours < 0)
      .map(to => ({
        id: to.id,
        userId: to.userId,
        date: to.date,
        type: 'TO',
        period: to.startTime && to.endTime ? `${to.startTime}-${to.endTime}` : 'FULL',
        status: 'APPROVED',
        remarks: to.reason,
        user: (to as any).user
      }));

    return NextResponse.json({ locations, stations, users, shifts, leaves: [...leaves, ...timeOffAsLeaves], modalities: systemModalities.map(m => m.name) });
  } catch (error) {
    console.error('Error fetching roster:', error);
    return NextResponse.json({ error: 'Failed to fetch roster data' }, { status: 500 });
  }
}
