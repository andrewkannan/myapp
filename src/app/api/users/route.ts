import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';

// Connect to the SQLite database file
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'dev.db');
const connection = new Database(dbPath);
const adapter = new PrismaBetterSqlite3(connection);
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
