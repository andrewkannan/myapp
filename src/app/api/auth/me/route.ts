import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

let walEnabled = false;

export async function GET() {
  if (!walEnabled) {
    try {
      await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
      await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
      walEnabled = true;
    } catch (e) {
      console.error('Failed to enable WAL', e);
    }
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: session });
}
