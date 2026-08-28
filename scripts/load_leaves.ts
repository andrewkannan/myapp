import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const count = await prisma.leave.count();
  console.log('Currently there are ' + count + ' leaves in the database.');
  
  // Wipe all existing leave data
  console.log('Wiping previous master leave data...');
  const deleteResult = await prisma.leave.deleteMany();
  console.log('Deleted ' + deleteResult.count + ' leave records.');

  // Load the CSV
  const csvPath = path.join(process.cwd(), 'scripts', 'leaves.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const lines = csvContent.split('\n').filter(l => l.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim());
  
  let successCount = 0;
  let notFoundCount = 0;

  console.log('Loading new leave records...');
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 5) continue;

    const dateStr = cols[0]; // e.g. 2026-09-01
    const staffAbbr = cols[1];
    const type = cols[2];
    const period = cols[3];
    const rawStatus = cols[4];
    const remarks = cols[5];
    const alLeaveOption = cols[6]; // Ballot, Pending in queue, Confirmed

    let statusToUse = 'PENDING';
    if (alLeaveOption === 'Ballet' || alLeaveOption === 'Ballot') {
      statusToUse = 'BALLOT';
    } else if (alLeaveOption === 'Confirmed') {
      statusToUse = 'APPROVED';
    } else if (alLeaveOption === 'Pending in queue') {
      statusToUse = 'PENDING';
    } else if (rawStatus === 'APPROVED') {
      statusToUse = 'APPROVED';
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { abbreviation: staffAbbr }
    });

    if (!user) {
      console.log('User not found: ' + staffAbbr + ' (Row ' + (i + 1) + ')');
      notFoundCount++;
      continue;
    }

    // Insert
    await prisma.leave.create({
      data: {
        userId: user.id,
        date: new Date(dateStr),
        type: type,
        period: period || 'FULL',
        status: statusToUse,
        remarks: remarks || null
      }
    });
    
    successCount++;
  }

  console.log('Import complete! Successfully created ' + successCount + ' records. Users not found: ' + notFoundCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
