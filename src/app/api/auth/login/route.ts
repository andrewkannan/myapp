import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/auth';
import { verifyPassword, hashPassword } from '@/lib/password';
import { cookies } from 'next/headers';


export async function POST(request: Request) {
  try {
    const { abbreviation, password } = await request.json();

    const user = await prisma.user.findUnique({
      where: { abbreviation: abbreviation.toUpperCase() }
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Progressive migration: if password was still plaintext, hash it now
    if (!user.password.startsWith('$2')) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(password) }
      });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account has been deactivated' }, { status: 403 });
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Calculate permissions based on user.role
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
    
    // Lockout prevention - System Admin implicitly has all permissions
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
      maxAge: 365 * 24 * 60 * 60 // 1 year
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', details: 'User logged in successfully' }
    });

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
