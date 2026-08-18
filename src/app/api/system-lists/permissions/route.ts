import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { getSession } from '@/lib/auth';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.includes('ROLE_MANAGE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { roles } = await request.json();
    
    // Process in a transaction
    await prisma.$transaction(
      roles.map((r: { id: string, permissions: string }) => 
        prisma.systemRole.update({
          where: { id: r.id },
          data: { permissions: r.permissions }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update permissions:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
