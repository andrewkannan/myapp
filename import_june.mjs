import Database from 'better-sqlite3';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database('dev.db');

const COLUMN_MAP = {
  2: { loc: 'OIC', stat: 'XR' },
  3: { loc: 'OIC', stat: 'BMD' },
  4: { loc: 'OIC', stat: 'MAM' },
  5: { loc: 'OIC', stat: 'US1' },
  6: { loc: 'OIC', stat: 'US2' },
  7: { loc: 'OIC', stat: 'US3' },
  8: { loc: 'OIC', stat: 'US4' },
  9: { loc: 'OIC', stat: 'MRI 3T' },
  10: { loc: 'OIC', stat: 'MRI 3T' },
  11: { loc: 'OIC', stat: 'MRI 2' },
  12: { loc: 'OIC', stat: 'MRI 2' },
  13: { loc: 'OIC', stat: 'MRI 3' },
  14: { loc: 'OIC', stat: 'MRI 3' },
  15: { loc: 'OIC', stat: 'CT' },
  16: { loc: 'OIC', stat: 'LUMA MRI' },
  17: { loc: 'OIC', stat: 'PET' },
  18: { loc: 'NOVENA', stat: 'US 1' },
  19: { loc: 'NOVENA', stat: 'US 2' },
  20: { loc: 'NOVENA', stat: 'US 3' },
  21: { loc: 'NOVENA', stat: 'XR' },
  22: { loc: 'NOVENA', stat: 'MAM' },
  23: { loc: 'NOVENA', stat: 'MR (1.5)' },
  24: { loc: 'NOVENA', stat: 'MR (3T)' },
  25: { loc: 'NOVENA', stat: 'CT' },
  26: { loc: 'ICON', stat: 'US 1' },
  27: { loc: 'ICON', stat: 'US 2' },
  28: { loc: 'ICON', stat: 'MAM' },
  29: { loc: 'ANSON', stat: 'US' },
  30: { loc: 'ANSON', stat: 'MAM' },
  31: { loc: 'CAMDEN', stat: 'CT' },
  32: { loc: 'CAMDEN', stat: 'XR' },
  33: { loc: 'CAMDEN', stat: 'MAM' },
  34: { loc: 'CAMDEN', stat: 'US' },
  35: { loc: 'JURONG', stat: 'XR' },
  36: { loc: 'JURONG', stat: 'US' },
  37: { status: 'Off' },
  38: { status: 'Leave' },
  39: { status: 'MC' }
};

async function main() {
  console.log('Starting June import...');
  const filePath = path.join(__dirname, 'ASIAMEDIC ROSTER 2026.xlsx');
  
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets['JUNE 2026'];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Fetch all stations and their IDs
  const stationsData = db.prepare(`
    SELECT s.id, s.name as stationName, l.name as locName 
    FROM Station s 
    JOIN Location l ON s.locationId = l.id
  `).all();
  
  const stationLookup = {};
  for (const row of stationsData) {
    if (!stationLookup[row.locName]) stationLookup[row.locName] = {};
    stationLookup[row.locName][row.stationName] = row.id;
  }

  // Fetch all users
  const usersData = db.prepare(`SELECT id, abbreviation FROM User`).all();
  const userLookup = {};
  for (const u of usersData) {
    userLookup[u.abbreviation] = u.id;
  }

  // Clear existing shifts to prevent duplicates during test
  db.prepare('DELETE FROM Shift').run();

  const insertShift = db.prepare(`
    INSERT INTO Shift (id, date, userId, stationId, status, remarks) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let currentDate = null;

  db.transaction(() => {
    // Start from row 4 (index 3 is headers, index 4 is first day)
    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // Check if it's a new date row or a continuation row
      // The date is in column 1 (index 1)
      if (row[1]) {
        // e.g. 1, 2, 3...
        // Construct the Date object for June 2026
        const dayNum = parseInt(row[1], 10);
        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
          // Assuming UTC or local time is fine for matching
          // Using 12:00 PM to avoid timezone shifting issues
          currentDate = new Date(Date.UTC(2026, 5, dayNum, 12, 0, 0));
        }
      }

      if (!currentDate) continue; // Skip until we find the first date

      // Iterate through the columns to find shifts
      for (let col = 2; col <= 39; col++) {
        const cellValue = row[col];
        if (typeof cellValue === 'string') {
          const mapping = COLUMN_MAP[col];
          if (!mapping) continue;

          // Split cell values because sometimes they type multiple people separated by space
          // Or they type "ABB 530", "GDY 9-6", "YHS LON TCY LNG(CL)"
          const tokens = cellValue.split(/\s+/);
          
          let currentUser = null;
          let remarksArr = [];

          for (const token of tokens) {
            const tokenClean = token.trim();
            if (!tokenClean) continue;

            // Check if token is a user abbreviation
            // Usually 2-4 uppercase letters, maybe with punctuation attached
            const alphaMatch = tokenClean.match(/^[A-Za-z]{2,4}/); 
            if (alphaMatch && userLookup[alphaMatch[0].toUpperCase()]) {
              // We found a user token! 
              // If we already had a user in this cell without pushing it, save them.
              if (currentUser) {
                saveShift(currentUser, remarksArr.join(' '), mapping);
              }
              currentUser = userLookup[alphaMatch[0].toUpperCase()];
              remarksArr = [];
              // If there was extra text attached to the name like LNG(CL), put (CL) in remarks
              const extra = tokenClean.substring(alphaMatch[0].length);
              if (extra) remarksArr.push(extra);
            } else {
              // It's a remark for the current user
              remarksArr.push(tokenClean);
            }
          }

          if (currentUser) {
            saveShift(currentUser, remarksArr.join(' '), mapping);
          }

          function saveShift(uid, rem, map) {
            let sId = null;
            let status = 'Scheduled';

            if (map.status) {
              status = map.status;
            } else {
              sId = stationLookup[map.loc]?.[map.stat];
              if (!sId) {
                console.warn(`Station not found: ${map.loc} ${map.stat}`);
                return;
              }
            }

            insertShift.run(
              uuidv4(),
              currentDate.toISOString(),
              uid,
              sId,
              status,
              rem || null
            );
          }
        }
      }
    }
  })();

  console.log('June 2026 shifts imported successfully!');
}

main().catch(console.error);
