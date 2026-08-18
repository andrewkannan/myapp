import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { getSession } from '@/lib/auth';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.some((p: string) => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE'].includes(p))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { fullName: true, abbreviation: true }
        }
      }
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
