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
    const { date, reason, studyAccNo, startTime, endTime, hours, targetUserId } = body;

    if (!date || !reason || typeof hours !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isScheduler = session.permissions?.includes('ROSTER_EDIT') || session.role === 'ADMIN';
    const finalUserId = isScheduler && targetUserId ? targetUserId : session.id;
    const finalStatus = isScheduler ? 'APPROVED' : 'PENDING';

    const newRecord = await prisma.timeOffRecord.create({
      data: {
        userId: finalUserId,
        date: new Date(date),
        reason,
        studyAccNo,
        startTime,
        endTime,
        hours,
        status: finalStatus,
      }
    });

    return NextResponse.json(newRecord, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create time off record:', error);
    return NextResponse.json({ error: 'Failed to create time off record' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isScheduler = session.permissions?.some((p: string) => ['ROSTER_EDIT', 'TIMEOFF_APPROVE'].includes(p)) || session.role === 'ADMIN';
    if (!isScheduler) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, date, reason, studyAccNo, startTime, endTime, hours, status } = body;

    if (!id) return NextResponse.json({ error: 'Record ID required' }, { status: 400 });

    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (reason !== undefined) updateData.reason = reason;
    if (studyAccNo !== undefined) updateData.studyAccNo = studyAccNo;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (hours !== undefined) updateData.hours = hours;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.timeOffRecord.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Failed to update time off record:', error);
    return NextResponse.json({ error: 'Failed to update time off record' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isScheduler = session.permissions?.some((p: string) => ['ROSTER_EDIT', 'TIMEOFF_APPROVE'].includes(p)) || session.role === 'ADMIN';
    if (!isScheduler) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Record ID required' }, { status: 400 });

    await prisma.timeOffRecord.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete time off record:', error);
    return NextResponse.json({ error: 'Failed to delete time off record' }, { status: 500 });
  }
}
