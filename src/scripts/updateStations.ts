import prisma from '../lib/prisma';

async function main() {
  const stations = await prisma.station.findMany({ include: { location: true } });
  
  for (const s of stations) {
    let newName = s.name;
    
    // Novena
    if (newName.includes('MR (1.5)')) newName = newName.replace('MR (1.5)', 'MRI 1.5T');
    if (newName.includes('MR (3T)')) newName = newName.replace('MR (3T)', 'MRI 3T');
    
    // Luma
    if (newName === 'Luma') newName = 'Luma MRI';
    if (newName === 'Luma 830' || newName === 'Luma 8.30') newName = 'Luma MRI 830';
    if (newName === 'Luma 930' || newName === 'Luma 9.30') newName = 'Luma MRI 930';
    
    // Tucker
    if (newName === 'Tucker') newName = 'Tucker MRI';
    if (newName === 'Tucker 830' || newName === 'Tucker 8.30') newName = 'Tucker MRI 830';
    if (newName === 'Tucker 930' || newName === 'Tucker 9.30') newName = 'Tucker MRI 930';

    if (newName !== s.name) {
      console.log(`Renaming ${s.location.name} > ${s.name} -> ${newName}`);
      await prisma.station.update({
        where: { id: s.id },
        data: { name: newName }
      });
    } else {
      console.log(`Keeping ${s.location.name} > ${s.name}`);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
