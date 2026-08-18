import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { getSession } from '@/lib/auth';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const locations = await prisma.location.findMany({ include: { stations: true } });
    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.some(p => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE'].includes(p))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { name } = await request.json();
    const location = await prisma.location.create({ data: { name } });
    
    await prisma.auditLog.create({ data: { userId: session.id, action: 'CREATE_LOCATION', details: `Created location ${name}` } });
    return NextResponse.json(location);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.some(p => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE'].includes(p))) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const deleted = await prisma.location.delete({ where: { id } });
    
    await prisma.auditLog.create({ data: { userId: session.id, action: 'DELETE_LOCATION', details: `Deleted location ${deleted.name}` } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
