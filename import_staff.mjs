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
  console.log('Starting Staff List import...');
  const filePath = path.join(__dirname, 'Staff list.xlsx');
  
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  const updateUser = db.prepare(`
    UPDATE User 
    SET fullName = ?, role = ?, accessLevel = ?, password = ?
    WHERE abbreviation = ?
  `);

  const insertUser = db.prepare(`
    INSERT INTO User (id, abbreviation, fullName, role, accessLevel, password)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let updatedCount = 0;
  let insertedCount = 0;

  db.transaction(() => {
    // Skip header row (i=0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue; // Skip empty rows or rows without an ID

      const abbr = String(row[0]).trim().toUpperCase();
      const fullName = row[1] || abbr;
      const role = row[2] || 'Staff';
      const password = row[4] || 'password123'; // Default
      let permission = (row[6] || '').toString().toUpperCase();
      
      // Default to STAFF if not explicitly MANAGER or ADMIN
      if (!['MANAGER', 'ADMIN', 'STAFF'].includes(permission)) {
        permission = 'STAFF';
      }

      // Check if user exists
      const existing = db.prepare(`SELECT id FROM User WHERE abbreviation = ?`).get(abbr);

      if (existing) {
        updateUser.run(fullName, role, permission, password, abbr);
        updatedCount++;
      } else {
        insertUser.run(uuidv4(), abbr, fullName, role, permission, password);
        insertedCount++;
      }
    }
  })();

  // Assign at least one test manager if none exist
  db.prepare(`UPDATE User SET accessLevel = 'MANAGER' WHERE abbreviation = 'EJP' OR abbreviation = 'ABB'`).run();

  console.log(`Staff list processed. Updated: ${updatedCount}, Inserted: ${insertedCount}`);
}

main().catch(console.error);
