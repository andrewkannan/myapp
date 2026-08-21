import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.some((p: string) => ['STAFF_MANAGE', 'ROSTER_EDIT'].includes(p))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeToday = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: today
        }
      }
    });

    const totalUsers = await prisma.user.count({
      where: {
        isActive: true
      }
    });

    return NextResponse.json({ activeToday, totalUsers });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
