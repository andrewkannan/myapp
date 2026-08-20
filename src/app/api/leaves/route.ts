import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';


export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dates, type, period, remarks, targetUserId } = body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'Dates are required' }, { status: 400 });
    }

    const isScheduler = session.permissions?.includes('ROSTER_EDIT') || session.role === 'ADMIN';
    const finalUserId = isScheduler && targetUserId ? targetUserId : session.id;
    const finalStatus = isScheduler ? 'APPROVED' : 'PENDING';

    const leaveDataBatch = dates.map((d: any) => ({
      userId: finalUserId,
      date: new Date(d),
      type: type || 'AL',
      period: period || 'FULL',
      status: finalStatus,
      remarks: remarks || null
    }));

    const created = await prisma.leave.createMany({
      data: leaveDataBatch
    });

    await prisma.auditLog.create({
      data: { userId: session.id, action: 'CREATE_LEAVE', details: `Requested ${created.count} days of ${type}${isScheduler && targetUserId ? ' for user ' + targetUserId : ''}` }
    });

    return NextResponse.json({ success: true, count: created.count });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json({ error: 'Failed to submit leave request' }, { status: 500 });
  }
}
