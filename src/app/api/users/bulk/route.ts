import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';


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
    let errors: string[] = [];

    try {
      await prisma.$transaction(async (tx) => {
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
              await tx.user.update({
                where: { id },
                data: dataToSave
              });
              updatedCount++;
            } else if (abbreviation) {
              const existing = await tx.user.findUnique({ where: { abbreviation } });
              if (existing) {
                await tx.user.update({ where: { id: existing.id }, data: dataToSave });
                updatedCount++;
              } else {
                await tx.user.create({ data: dataToSave });
                createdCount++;
              }
            } else {
              await tx.user.create({ data: dataToSave });
              createdCount++;
            }
          } catch (err: any) {
            errors.push(`Failed to process user ${userData.abbreviation || userData.fullName}: ${err.message}`);
            throw err;
          }
        }

        await tx.auditLog.create({
          data: { 
            userId: session.id, 
            action: 'BULK_IMPORT', 
            details: `Bulk imported/updated users. Created: ${createdCount}, Updated: ${updatedCount}` 
          }
        });
      });

      return NextResponse.json({ createdCount, updatedCount, errors });
    } catch (error: any) {
      console.error('Bulk import transaction failed:', error);
      return NextResponse.json({ error: 'Failed to bulk import users due to a partial failure. Transaction rolled back.', details: errors }, { status: 500 });
    }
  } catch (error) {
    console.error('Bulk import route error:', error);
    return NextResponse.json({ error: 'Failed to bulk import users' }, { status: 500 });
  }
}
