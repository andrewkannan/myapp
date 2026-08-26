import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendOnboardingEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.includes('STAFF_MANAGE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { testEmail, userIds, subject, appUrl, customMessage } = await request.json();

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ error: 'SMTP server is not configured. Please add SMTP_USER and SMTP_PASS to the server environment.' }, { status: 500 });
    }

    if (testEmail) {
      await sendOnboardingEmail(testEmail, 'Admin', subject, appUrl, customMessage);
      return NextResponse.json({ success: true, count: 1 });
    }

    if (!userIds || !userIds.length) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } }
    });

    let sentCount = 0;
    const errors = [];

    for (const u of users) {
      if (!u.email) {
        errors.push(`No email for ${u.abbreviation}`);
        continue;
      }
      try {
        await sendOnboardingEmail(u.email, u.fullName || u.abbreviation || 'Staff', subject, appUrl, customMessage);
        sentCount++;
      } catch (err: any) {
        errors.push(`Failed sending to ${u.email}: ${err.message}`);
      }
    }

    if (sentCount === 0 && errors.length > 0) {
      return NextResponse.json({ error: 'All emails failed to send. Check logs.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: sentCount, errors });
  } catch (error: any) {
    console.error('Email error:', error);
    return NextResponse.json({ error: error.message || 'Internal error sending email' }, { status: 500 });
  }
}
