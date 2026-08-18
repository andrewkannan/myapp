import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { getSession } from '@/lib/auth';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.includes('STAFF_MANAGE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { users } = await request.json();
    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let errors = [];

    for (const userData of users) {
      try {
        const { id, abbreviation, fullName, role, email, modality, isActive, password } = userData;
        
        let dataToSave: any = {
          fullName,
          role,
          email,
          modality,
        };
        
        if (abbreviation) dataToSave.abbreviation = abbreviation;
        if (isActive !== undefined) dataToSave.isActive = isActive;
        
        if (userData.ssoEnabled !== undefined) {
          dataToSave.ssoEnabled = userData.ssoEnabled;
        } else if (email && email.toLowerCase().endsWith('@asiamedic.com.sg')) {
          dataToSave.ssoEnabled = true;
        }
        
        if (password) dataToSave.password = password;

        if (id) {
          await prisma.user.update({
            where: { id },
            data: dataToSave
          });
          updatedCount++;
        } else if (abbreviation) {
          const existing = await prisma.user.findUnique({ where: { abbreviation } });
          if (existing) {
            await prisma.user.update({ where: { id: existing.id }, data: dataToSave });
            updatedCount++;
          } else {
            await prisma.user.create({ data: dataToSave });
            createdCount++;
          }
        } else {
          await prisma.user.create({ data: dataToSave });
          createdCount++;
        }
      } catch (err: any) {
        errors.push(`Failed to process user ${userData.abbreviation || userData.fullName}: ${err.message}`);
      }
    }

    await prisma.auditLog.create({
      data: { 
        userId: session.id, 
        action: 'BULK_IMPORT', 
        details: `Bulk imported/updated users. Created: ${createdCount}, Updated: ${updatedCount}` 
      }
    });

    return NextResponse.json({ createdCount, updatedCount, errors });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ error: 'Failed to bulk import users' }, { status: 500 });
  }
}
