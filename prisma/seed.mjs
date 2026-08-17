import Database from 'better-sqlite3';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database('dev.db');

async function main() {
  console.log('Starting seed...');
  const filePath = path.join(__dirname, '..', 'ASIAMEDIC ROSTER 2026.xlsx');
  
  const workbook = xlsx.readFile(filePath);
  
  // Insert location
  const locId = uuidv4();
  db.prepare(`INSERT OR IGNORE INTO Location (id, name) VALUES (?, ?)`).run(locId, 'Main');
  
  // Insert station
  const stationId = uuidv4();
  db.prepare(`INSERT OR IGNORE INTO Station (id, name, locationId) VALUES (?, ?, ?)`).run(stationId, 'XR', locId);

  const usersFound = new Set();
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    for (const row of data) {
      if (Array.isArray(row)) {
        for (const cell of row) {
          if (typeof cell === 'string') {
            const trimmed = cell.trim();
            if (/^[A-Z]{2,4}$/.test(trimmed) && trimmed !== 'DAY' && trimmed !== 'DATE' && trimmed !== 'OFF') {
              usersFound.add(trimmed);
            }
          }
        }
      }
    }
  }

  const insertUser = db.prepare(`INSERT OR IGNORE INTO User (id, abbreviation, fullName, role) VALUES (?, ?, ?, ?)`);
  
  db.transaction(() => {
    for (const abbr of Array.from(usersFound)) {
      insertUser.run(uuidv4(), abbr, abbr, 'Staff');
    }
  })();

  console.log(`Seeded ${usersFound.size} users.`);
}

main().catch(console.error);
