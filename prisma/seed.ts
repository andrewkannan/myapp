import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  const filePath = path.join(__dirname, '..', 'ASIAMEDIC ROSTER 2026.xlsx');
  
  const workbook = xlsx.readFile(filePath);
  
  // Create a default location and station just as a test
  const defaultLoc = await prisma.location.upsert({
    where: { name: 'Main' },
    update: {},
    create: { name: 'Main' }
  });

  const defaultStation = await prisma.station.upsert({
    where: { name_locationId: { name: 'XR', locationId: defaultLoc.id } },
    update: {},
    create: { name: 'XR', locationId: defaultLoc.id }
  });

  // Extract users (simplification: parse all cells that look like uppercase abbreviations)
  const usersFound = new Set<string>();
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Simplistic extraction: Any string 2-4 chars uppercase could be an abbreviation
    for (const row of data) {
      if (Array.isArray(row)) {
        for (const cell of row) {
          if (typeof cell === 'string') {
            const trimmed = cell.trim();
            // Just some basic user abbreviation extraction for demonstration
            if (/^[A-Z]{2,4}$/.test(trimmed) && trimmed !== 'DAY' && trimmed !== 'DATE' && trimmed !== 'OFF') {
              usersFound.add(trimmed);
            }
          }
        }
      }
    }
  }

  for (const abbr of Array.from(usersFound)) {
    await prisma.user.upsert({
      where: { abbreviation: abbr },
      update: {},
      create: { abbreviation: abbr, fullName: abbr, role: 'Staff' }
    });
  }

  console.log(`Seeded ${usersFound.size} users.`);
  
  // NOTE: Full historical schedule parsing requires a very complex mapping script
  // due to the unstructured multi-header nature of the Excel file.
  // This seed creates the foundational users to get the system running.
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
