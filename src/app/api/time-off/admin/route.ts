import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';


export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.some((p: string) => ['ROSTER_EDIT', 'TIMEOFF_APPROVE', 'STAFF_MANAGE'].includes(p))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let whereClause: any = {};
    if (userId) {
      whereClause.userId = userId;
    } else {
      whereClause.status = 'PENDING';
    }

    const records = await prisma.timeOffRecord.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, abbreviation: true } }
      }
    });

    return NextResponse.json(records);
  } catch (error: any) {
    console.error('Failed to fetch admin time off records:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.some((p: string) => ['ROSTER_EDIT', 'TIMEOFF_APPROVE', 'STAFF_MANAGE'].includes(p))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.timeOffRecord.update({
        where: { id },
        data: {
          status,
          approvedById: session.id
        }
      });

      // If approved and it's a claim (negative hours), add to Leaves for the roster
      if (status === 'APPROVED' && record.hours <= 0) {
        // Check if a leave already exists for this exact date to prevent duplicates
        const existing = await tx.leave.findFirst({
          where: {
            userId: record.userId,
            date: record.date,
            type: 'TO'
          }
        });
        if (!existing) {
          await tx.leave.create({
            data: {
              userId: record.userId,
              date: record.date,
              period: 'FULL',
              type: 'TO',
              status: 'APPROVED',
              remarks: record.reason || 'Time Off Claim'
            }
          });
        }
      }

      // If cancelled and it's a claim (negative hours), we must remove the Leave entry we added
      if (status === 'CANCELLED' && record.hours <= 0) {
        await tx.leave.deleteMany({
          where: {
            userId: record.userId,
            date: record.date,
            type: 'TO'
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: 'TIME_OFF_APPROVAL',
          details: `Time-off request ${id} ${status.toLowerCase()} by admin`
        }
      });

      return record;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to update time off record:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
