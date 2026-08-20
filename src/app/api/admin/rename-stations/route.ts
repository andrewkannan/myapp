import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const stations = await prisma.station.findMany({ include: { location: true } });
  
  for (const s of stations) {
    if (s.location.name === 'TUCKER' && s.name === 'MRI') {
      await prisma.station.update({
        where: { id: s.id },
        data: { name: 'Tucker MRI' }
      });
    }
  }

  return NextResponse.json({ success: true });
}
