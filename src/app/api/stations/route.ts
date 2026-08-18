import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { getSession } from '@/lib/auth';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'MANAGER'].includes(session.accessLevel)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { name, locationId } = await request.json();
    const station = await prisma.station.create({ data: { name, locationId } });
    
    await prisma.auditLog.create({ data: { userId: session.id, action: 'CREATE_STATION', details: `Created station ${name}` } });
    return NextResponse.json(station);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create station' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'MANAGER'].includes(session.accessLevel)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const deleted = await prisma.station.delete({ where: { id } });
    
    await prisma.auditLog.create({ data: { userId: session.id, action: 'DELETE_STATION', details: `Deleted station ${deleted.name}` } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete station' }, { status: 500 });
  }
}
