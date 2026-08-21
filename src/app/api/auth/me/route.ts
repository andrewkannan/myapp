import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Fetch fresh user data from DB to reflect any admin updates
  const user = await prisma.user.findUnique({
    where: { id: session.id }
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Calculate permissions from SystemRole (same logic as login)
  const roleNames = user.role ? user.role.split(',').map(r => r.trim()).filter(Boolean) : [];
  const systemRoles = await prisma.systemRole.findMany({
    where: { name: { in: roleNames } }
  });

  const permissions = new Set<string>();
  for (const r of systemRoles) {
    if (r.permissions) {
      r.permissions.split(',').forEach(p => permissions.add(p.trim()));
    }
  }

  if (roleNames.includes('System Admin')) {
    ['ROSTER_VIEW', 'ROSTER_EDIT', 'STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE', 'AUDIT_VIEW', 'LEAVE_APPROVE', 'TIMEOFF_APPROVE'].forEach(p => permissions.add(p));
  }

  return NextResponse.json({
    user: {
      ...session,
      fullName: user.fullName,
      abbreviation: user.abbreviation,
      role: user.role,
      email: user.email,
      isActive: user.isActive,
      permissions: Array.from(permissions)
    }
  });
}
