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
    const { dates, type, period, remarks } = body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'Dates are required' }, { status: 400 });
    }

    const leaveDataBatch = dates.map(d => ({
      userId: session.id,
      date: new Date(d),
      type: type || 'AL',
      period: period || 'FULL',
      status: 'PENDING',
      remarks: remarks || null
    }));

    const created = await prisma.leave.createMany({
      data: leaveDataBatch
    });

    await prisma.auditLog.create({
      data: { userId: session.id, action: 'CREATE_LEAVE', details: `Requested ${created.count} days of ${type}` }
    });

    return NextResponse.json({ success: true, count: created.count });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json({ error: 'Failed to submit leave request' }, { status: 500 });
  }
}
