import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?error=No+authorization+code+provided`);
  }

  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID || 'common';
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback/microsoft`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?error=SSO+is+not+configured+on+the+server`);
  }

  try {
    // 1. Exchange the code for tokens
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token Exchange Error:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?error=Failed+to+exchange+authorization+code`);
    }

    // 2. Decode the ID token to get the user's email
    // The id_token is a JWT. We can extract the payload by decoding the base64url payload.
    const parts = tokenData.id_token.split('.');
    if (parts.length !== 3) throw new Error('Invalid ID token');
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    const email = payload.preferred_username || payload.email;

    if (!email) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?error=No+email+provided+by+Microsoft+account`);
    }

    // 3. Find the user in our database
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?error=Account+not+found.+Please+contact+an+administrator.`);
    }

    if (!user.isActive) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?error=Your+account+has+been+deactivated.`);
    }

    if (!user.ssoEnabled) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?error=Microsoft+SSO+is+not+enabled+for+your+account.`);
    }

    // 4. Set last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // 5. Build session
    const roleNames = user.role ? user.role.split(',').map(r => r.trim()).filter(Boolean) : [];
    const systemRoles = await prisma.systemRole.findMany({
      where: { name: { in: roleNames } }
    });
    
    let permissions = new Set<string>();
    for (const r of systemRoles) {
      if (r.permissions) {
        r.permissions.split(',').forEach(p => permissions.add(p.trim()));
      }
    }
    
    if (roleNames.includes('System Admin')) {
      const allPerms = ['ROSTER_VIEW', 'ROSTER_EDIT', 'STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE', 'AUDIT_VIEW'];
      allPerms.forEach(p => permissions.add(p));
    }

    const sessionData = {
      id: user.id,
      abbreviation: user.abbreviation,
      fullName: user.fullName,
      permissions: Array.from(permissions),
      role: user.role
    };

    const session = await encrypt(sessionData);

    (await cookies()).set('session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 // 1 day
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN_SSO', details: 'User logged in via Microsoft SSO' }
    });

    // 6. Redirect to dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`);

  } catch (error) {
    console.error('SSO Callback Error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?error=Internal+server+error+during+SSO`);
  }
}
