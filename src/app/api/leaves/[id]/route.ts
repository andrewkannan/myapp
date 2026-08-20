import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params;
    const session = await getSession();
    const isScheduler = session?.permissions?.some((p: string) => ['ROSTER_EDIT', 'LEAVE_APPROVE'].includes(p)) || session?.role === 'ADMIN';
    if (!session || !isScheduler) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, period, remarks, status } = body;

    const leave = await prisma.leave.update({
      where: { id: params.id },
      data: { type, period, remarks, status }
    });

    await prisma.auditLog.create({
      data: { userId: session.id, action: 'UPDATE_LEAVE', details: `Updated leave ${params.id}` }
    });

    return NextResponse.json({ success: true, leave });
  } catch (error) {
    console.error('Error updating leave:', error);
    return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const params = await context.params;
    const session = await getSession();
    const isScheduler = session?.permissions?.some((p: string) => ['ROSTER_EDIT', 'LEAVE_APPROVE'].includes(p)) || session?.role === 'ADMIN';
    if (!session || !isScheduler) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.leave.delete({
      where: { id: params.id }
    });

    await prisma.auditLog.create({
      data: { userId: session.id, action: 'DELETE_LEAVE', details: `Deleted leave ${params.id}` }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting leave:', error);
    return NextResponse.json({ error: 'Failed to delete leave' }, { status: 500 });
  }
}
