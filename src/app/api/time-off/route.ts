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

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.timeOffRecord.findFirst({
      where: {
        userId: finalUserId,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'A Time Off entry already exists for this date. Cannot have duplicates on the same day.' }, { status: 400 });
    }

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

    if (finalStatus === 'APPROVED' && hours <= 0) {
      await prisma.leave.create({
        data: {
          userId: finalUserId,
          date: new Date(date),
          period: 'FULL',
          type: 'TO',
          status: 'APPROVED',
          remarks: reason || 'Time Off Claim'
        }
      });
    }

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
    const { id, userId, date: bodyDate, date, reason, studyAccNo, startTime, endTime, hours, status } = body;

    let targetId = id;
    if (!targetId && userId && bodyDate) {
      const startOfDay = new Date(bodyDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(bodyDate);
      endOfDay.setHours(23, 59, 59, 999);
      const existing = await prisma.timeOffRecord.findFirst({
        where: { userId, date: { gte: startOfDay, lte: endOfDay } }
      });
      if (existing) targetId = existing.id;
    }

    if (!targetId) return NextResponse.json({ error: 'Record ID or UserId/Date required' }, { status: 400 });

    const updateData: any = {};
    if (date) updateData.date = new Date(date);
    if (reason !== undefined) updateData.reason = reason;
    if (studyAccNo !== undefined) updateData.studyAccNo = studyAccNo;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (hours !== undefined) updateData.hours = hours;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.timeOffRecord.update({
      where: { id: targetId },
      data: updateData
    });

    // Sync with Leaves for Roster display
    if (updated.hours <= 0) {
      if (updated.status === 'APPROVED') {
        const existing = await prisma.leave.findFirst({
          where: { userId: updated.userId, date: updated.date, type: 'TO' }
        });
        if (!existing) {
          await prisma.leave.create({
            data: {
              userId: updated.userId,
              date: updated.date,
              period: 'FULL',
              type: 'TO',
              status: 'APPROVED',
              remarks: updated.reason || 'Time Off Claim'
            }
          });
        }
      } else if (updated.status === 'CANCELLED') {
        const startOfDay = new Date(updated.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(updated.date);
        endOfDay.setHours(23, 59, 59, 999);
        await prisma.leave.deleteMany({
          where: { userId: updated.userId, date: { gte: startOfDay, lte: endOfDay }, type: 'TO' }
        });
      }
    }

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
    const userId = searchParams.get('userId');
    const dateStr = searchParams.get('date');

    if (id) {
      await prisma.timeOffRecord.delete({ where: { id } });
    } else if (userId && dateStr) {
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      
      const records = await prisma.timeOffRecord.findMany({
        where: { userId, date: { gte: startOfDay, lte: endOfDay } }
      });
      
      for (const r of records) {
        await prisma.timeOffRecord.delete({ where: { id: r.id } });
      }
    } else {
      return NextResponse.json({ error: 'Record ID or UserId/Date required' }, { status: 400 });
    }

    // Also delete any derived Leave records
    if (id || (userId && dateStr)) {
       let delUserId = userId;
       let delDateStart = dateStr ? new Date(dateStr) : undefined;
       
       if (id && !userId) {
          // just let the admin route handle leave deletion or we don't do it here
       }
       if (delUserId && delDateStart) {
          delDateStart.setHours(0,0,0,0);
          const delDateEnd = new Date(delDateStart);
          delDateEnd.setHours(23,59,59,999);
          await prisma.leave.deleteMany({
            where: { userId: delUserId, date: { gte: delDateStart, lte: delDateEnd }, type: 'TO' }
          });
       }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete time off record:', error);
    return NextResponse.json({ error: 'Failed to delete time off record' }, { status: 500 });
  }
}
