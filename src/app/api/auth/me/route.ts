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
    where: { id: session.id },
    include: { permissions: true }
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      ...session,
      fullName: user.fullName,
      abbreviation: user.abbreviation,
      role: user.role,
      email: user.email,
      isActive: user.isActive,
      permissions: user.permissions.map(p => p.permission)
    }
  });
}
