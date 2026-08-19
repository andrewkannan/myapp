import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';


export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const records = await prisma.timeOffRecord.findMany({
      where: { userId: session.id },
      orderBy: { date: 'asc' },
    });

    let runningBalance = 0;
    const recordsWithBalance = records.map(record => {
      if (record.status === 'APPROVED') {
        runningBalance += record.hours;
      }
      return { ...record, runningBalance };
    });

    return NextResponse.json({ records: recordsWithBalance, currentBalance: runningBalance });
  } catch (error: any) {
    console.error('Failed to fetch time off records:', error);
    return NextResponse.json({ error: 'Failed to fetch time off records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { date, reason, studyAccNo, startTime, endTime, hours } = body;

    if (!date || !reason || typeof hours !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newRecord = await prisma.timeOffRecord.create({
      data: {
        userId: session.id,
        date: new Date(date),
        reason,
        studyAccNo,
        startTime,
        endTime,
        hours,
        status: 'PENDING',
      }
    });

    return NextResponse.json(newRecord, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create time off record:', error);
    return NextResponse.json({ error: 'Failed to create time off record' }, { status: 500 });
  }
}
