import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const logs: string[] = [];
    
    // 1. MERGE STATIONS
    const locations = await prisma.location.findMany();
    const camden = locations.find(l => l.name === 'CAMDEN');
    const novena = locations.find(l => l.name === 'NOVENA');

    if (camden) {
      const camdenStations = await prisma.station.findMany({ where: { locationId: camden.id } });
      const camdenMAM = camdenStations.find(s => s.name === 'MAM' || s.name === 'MAM / US');
      const camdenUS = camdenStations.find(s => s.name === 'US');
      if (camdenMAM && camdenUS && camdenMAM.name !== 'MAM / US') {
        await prisma.shift.updateMany({ where: { stationId: camdenUS.id }, data: { stationId: camdenMAM.id } });
        await prisma.station.update({ where: { id: camdenMAM.id }, data: { name: 'MAM / US' } });
        await prisma.station.delete({ where: { id: camdenUS.id } });
        logs.push('Merged CAMDEN MAM and US');
      } else {
        logs.push('CAMDEN stations already merged or not found');
      }
    }

    if (novena) {
      const novenaStations = await prisma.station.findMany({ where: { locationId: novena.id } });
      const novenaXR = novenaStations.find(s => s.name === 'XR' || s.name === 'XR / MAM');
      const novenaMAM = novenaStations.find(s => s.name === 'MAM');
      if (novenaXR && novenaMAM && novenaXR.name !== 'XR / MAM') {
        await prisma.shift.updateMany({ where: { stationId: novenaMAM.id }, data: { stationId: novenaXR.id } });
        await prisma.station.update({ where: { id: novenaXR.id }, data: { name: 'XR / MAM' } });
        await prisma.station.delete({ where: { id: novenaMAM.id } });
        logs.push('Merged NOVENA XR and MAM');
      } else {
        logs.push('NOVENA stations already merged or not found');
      }
    }

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
