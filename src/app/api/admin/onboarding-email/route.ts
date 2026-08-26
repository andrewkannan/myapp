import { NextResponse } from 'next/server';
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

    const getHtml = (name: string) => `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0369a1; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Welcome to AsiaMedic Roster System</h2>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px;">Dear ${name},</p>
          <p style="font-size: 15px; color: #4b5563;">${customMessage.replace(/\n/g, '<br/>')}</p>

          <div style="text-align: center; margin: 35px 0;">
            <p style="margin: 0 0 12px 0; font-size: 15px; color: #374151; font-weight: 600;">Click the button below to log in:</p>
            <a href="${appUrl}" style="display: inline-block; background-color: #ffffff; color: #5e5e5e; text-decoration: none; font-weight: 600; font-size: 16px; padding: 12px 24px; border: 1px solid #8c8c8c; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <img src="https://img.icons8.com/color/48/microsoft.png" alt="Microsoft" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 10px; border: none; outline: none; text-decoration: none;" />
              <span style="vertical-align: middle;">Sign in with Microsoft</span>
            </a>
          </div>

          <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #0369a1; margin: 20px 0; border-radius: 0 4px 4px 0;">
            <p style="margin: 0; font-size: 14px; color: #374151;">
              <strong>Login Instructions:</strong><br/>
              Please click the button above and log in using your company email and password.
            </p>
          </div>

          <div style="background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #111827;"><strong>📱 Quick Access on Mobile</strong></p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #4b5563;">You can save this portal as an app on your phone's home screen:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #4b5563; line-height: 1.5;">
              <li style="margin-bottom: 4px;"><strong>iPhone (Safari):</strong> Open the link, tap the <strong>Share</strong> icon (square with an arrow), and select <em>Add to Home Screen</em>.</li>
              <li><strong>Android (Chrome):</strong> Open the link, tap the <strong>Menu</strong> (three dots) at the top right, and select <em>Add to Home screen</em>.</li>
            </ul>
          </div>

          <p style="font-size: 14px; color: #6b7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            Best regards,<br/>
            <strong>IT Team</strong><br/>
            AsiaMedic Limited
          </p>
        </div>
      </div>
    `;

    if (testEmail) {
      await transporter.sendMail({
        from: `"AML Roster" <${process.env.SMTP_USER}>`,
        to: testEmail,
        subject: subject,
        html: getHtml('Admin')
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
        errors.push(`No email for ${u.abbreviation}`);
        continue;
      }
      try {
        await transporter.sendMail({
          from: `"AML Roster" <${process.env.SMTP_USER}>`,
          to: u.email,
          subject: subject,
          html: getHtml(u.fullName || u.abbreviation || 'Staff')
        });
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
