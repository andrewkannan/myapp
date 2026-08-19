const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || (require('fs').existsSync('./dev.db') ? 'file:./dev.db' : 'file:./data/dev.db') });
const prisma = new PrismaClient({ adapter });

async function mergeStations() {
  console.log('Fetching locations...');
  const locations = await prisma.location.findMany();
  const camden = locations.find(l => l.name === 'CAMDEN');
  const novena = locations.find(l => l.name === 'NOVENA');
  
  if (!camden || !novena) return console.log('Locations not found');

  const camdenStations = await prisma.station.findMany({ where: { locationId: camden.id } });
  const novenaStations = await prisma.station.findMany({ where: { locationId: novena.id } });

  // 1. CAMDEN: Combine MAM and US
  const camdenMAM = camdenStations.find(s => s.name === 'MAM' || s.name === 'MAM / US');
  const camdenUS = camdenStations.find(s => s.name === 'US');
  
  if (camdenMAM && camdenUS && camdenMAM.name !== 'MAM / US') {
    console.log('Merging CAMDEN US into MAM...');
    await prisma.shift.updateMany({
      where: { stationId: camdenUS.id },
      data: { stationId: camdenMAM.id }
    });
    await prisma.station.update({
      where: { id: camdenMAM.id },
      data: { name: 'MAM / US' }
    });
    await prisma.station.delete({ where: { id: camdenUS.id } });
    console.log('CAMDEN MAM and US combined successfully.');
  } else {
    console.log('CAMDEN MAM or US not found, or already merged.');
  }

  // 2. NOVENA: Combine XR and MAM
  const novenaXR = novenaStations.find(s => s.name === 'XR' || s.name === 'XR / MAM');
  const novenaMAM = novenaStations.find(s => s.name === 'MAM');
  
  if (novenaXR && novenaMAM && novenaXR.name !== 'XR / MAM') {
    console.log('Merging NOVENA MAM into XR...');
    await prisma.shift.updateMany({
      where: { stationId: novenaMAM.id },
      data: { stationId: novenaXR.id }
    });
    await prisma.station.update({
      where: { id: novenaXR.id },
      data: { name: 'XR / MAM' }
    });
    await prisma.station.delete({ where: { id: novenaMAM.id } });
    console.log('NOVENA XR and MAM combined successfully.');
  } else {
    console.log('NOVENA XR or MAM not found, or already merged.');
  }
}

mergeStations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
