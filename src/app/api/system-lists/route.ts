import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const roles = await prisma.systemRole.findMany({ orderBy: { name: 'asc' } });
    const modalities = await prisma.systemModality.findMany({ orderBy: { name: 'asc' } });
    
    // Seed defaults if empty
    if (roles.length === 0) {
      await prisma.systemRole.createMany({
        data: ['Radiographer', 'Sonographer', 'Nurse', 'Doctor', 'Scheduler', 'System Admin'].map(name => ({ name }))
      });
    }
    
    if (modalities.length === 0) {
      await prisma.systemModality.createMany({
        data: ['MRI', 'CT', 'US', 'X-Ray', 'PET/CT', 'Mammo', 'BMD'].map(name => ({ name }))
      });
    }
    
    const refreshedRoles = await prisma.systemRole.findMany({ orderBy: { name: 'asc' } });
    const refreshedModalities = await prisma.systemModality.findMany({ orderBy: { name: 'asc' } });

    return NextResponse.json({ roles: refreshedRoles, modalities: refreshedModalities });
  } catch (error) {
    console.error('Failed to fetch system lists:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { type, name } = await request.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    if (type === 'role') {
      const created = await prisma.systemRole.create({ data: { name: name.trim() } });
      return NextResponse.json(created);
    } else if (type === 'modality') {
      const created = await prisma.systemModality.create({ data: { name: name.trim() } });
      return NextResponse.json(created);
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    
    if (!id || !type) {
      return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
    }
    
    if (type === 'role') {
      await prisma.systemRole.delete({ where: { id } });
    } else if (type === 'modality') {
      await prisma.systemModality.delete({ where: { id } });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
