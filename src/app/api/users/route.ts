import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { getSession } from '@/lib/auth';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { abbreviation: 'asc' }
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
    if (!session || !['ADMIN', 'MANAGER'].includes(session.accessLevel)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const data = await request.json();
    if (data.abbreviation === '') data.abbreviation = null;

    const newUser = await prisma.user.create({ data });
    
    await prisma.auditLog.create({
      data: { userId: session.id, action: 'CREATE_USER', details: `Created user ${newUser.abbreviation}` }
    });

    return NextResponse.json(newUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'MANAGER'].includes(session.accessLevel)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const data = await request.json();
    if (data.abbreviation === '') data.abbreviation = null;

    const updated = await prisma.user.update({ where: { id }, data });
    
    await prisma.auditLog.create({
      data: { userId: session.id, action: 'UPDATE_USER', details: `Updated user ${updated.abbreviation}` }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'MANAGER'].includes(session.accessLevel)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

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
