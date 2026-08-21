import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';


export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const users = await prisma.user.findMany({
      orderBy: { abbreviation: 'asc' },
      select: { id: true, abbreviation: true, fullName: true, role: true, email: true, modality: true, isActive: true, ssoEnabled: true, lastLoginAt: true }
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.some((p: string) => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE'].includes(p))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const data = await request.json();
    if (data.abbreviation === '') data.abbreviation = null;
    
    if (data.email && data.email.toLowerCase().endsWith('@asiamedic.com.sg') && data.ssoEnabled === undefined) {
      data.ssoEnabled = true;
    }

    const { abbreviation, fullName, role, password, email, modality, isActive, ssoEnabled } = data;
    const newUser = await prisma.user.create({ data: { abbreviation, fullName, role, password, email, modality, isActive, ssoEnabled } });
    
    await prisma.auditLog.create({
      data: { userId: session.id, action: 'CREATE_USER', details: `Created user ${newUser.abbreviation}` }
    });

    const { password: _, ...newUserWithoutPassword } = newUser as any;
    return NextResponse.json(newUserWithoutPassword);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.some((p: string) => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE'].includes(p))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const data = await request.json();
    if (data.abbreviation === '') data.abbreviation = null;

    const { abbreviation, fullName, role, password, email, modality, isActive, ssoEnabled } = data;
    const updateData = { abbreviation, fullName, role, password, email, modality, isActive, ssoEnabled };
    Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);

    const updated = await prisma.user.update({ where: { id }, data: updateData });
    
    await prisma.auditLog.create({
      data: { userId: session.id, action: 'UPDATE_USER', details: `Updated user ${updated.abbreviation}` }
    });

    const { password: _, ...updatedWithoutPassword } = updated as any;
    return NextResponse.json(updatedWithoutPassword);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.some((p: string) => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE'].includes(p))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Delete related records first to avoid foreign key constraints
    await prisma.shift.deleteMany({ where: { userId: id } });
    await prisma.leave.deleteMany({ where: { userId: id } });
    await prisma.timeOffRecord.deleteMany({ where: { userId: id } });
    await prisma.userPermission.deleteMany({ where: { userId: id } });
    await prisma.auditLog.deleteMany({ where: { userId: id } });

    const deleted = await prisma.user.delete({ where: { id } });
    
    await prisma.auditLog.create({
      data: { userId: session.id, action: 'DELETE_USER', details: `Deleted user ${deleted.abbreviation}` }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
