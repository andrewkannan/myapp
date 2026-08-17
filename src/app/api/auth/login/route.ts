import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const { abbreviation, password } = await request.json();

    const user = await prisma.user.findUnique({
      where: { abbreviation: abbreviation.toUpperCase() }
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionData = {
      id: user.id,
      abbreviation: user.abbreviation,
      fullName: user.fullName,
      accessLevel: user.accessLevel
    };

    const session = await encrypt(sessionData);

    (await cookies()).set('session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 // 1 day
    });

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
