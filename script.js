const fs = require('fs');
const content = import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import nodemailer from 'nodemailer';

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

    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false, // TLS requires secure: false for starttls
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        ciphers: 'SSLv3'
      }
    });

    const getHtml = (name: string, abbr: string) => \
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #0369a1;">Welcome to the Roster & Leave Management System</h2>
        <p>Hi \,</p>
        <p>\</p>
        <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #0369a1; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Access the portal here:</strong> <a href="\" style="color: #0369a1;">\</a></p>
          <p style="margin: 0 0 10px 0;"><strong>Username:</strong> \</p>
          <p style="margin: 0;"><strong>Password:</strong> welcome123 (Temporary)</p>
        </div>
        <p style="color: #ea580c; font-weight: bold;">Important: Please change your password immediately after logging in for the first time.</p>
        <p>Best regards,<br/>Administration Team</p>
      </div>
    \;

    if (testEmail) {
      await transporter.sendMail({
        from: \\\"Roster System" <\>\\\,
        to: testEmail,
        subject: subject,
        html: getHtml('Admin', 'ADMIN')
      });
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
        errors.push(\\\No email for \\\\);
        continue;
      }
      try {
        await transporter.sendMail({
          from: \\\"Roster System" <\>\\\,
          to: u.email,
          subject: subject,
          html: getHtml(u.fullName, u.abbreviation)
        });
        sentCount++;
      } catch (err: any) {
        errors.push(\\\Failed sending to \: \\\\);
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
};
fs.writeFileSync('src/app/api/admin/onboarding-email/route.ts', content);
