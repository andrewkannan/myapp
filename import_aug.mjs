import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('dev.db');

// Singapore 2026 Public Holidays (date in UTC noon to avoid timezone issues)
const SG_PUBLIC_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: 'New Year\'s Day' },
  { date: '2026-02-17', name: 'Chinese New Year' },
  { date: '2026-02-18', name: 'Chinese New Year' },
  { date: '2026-03-21', name: 'Hari Raya Puasa' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-27', name: 'Hari Raya Haji' },
  { date: '2026-06-01', name: 'Vesak Day (in lieu)' },
  { date: '2026-08-09', name: 'National Day (Sunday)' },
  { date: '2026-08-10', name: 'National Day (in lieu)' },
  { date: '2026-11-09', name: 'Deepavali (in lieu)' },
  { date: '2026-12-25', name: 'Christmas Day' },
];

// AUG 2026 column index → { location, station } mapping  (1-indexed, matching ExcelJS col)
const COL_MAP = {
  3:  { loc: 'OIC',    stat: 'XR' },
  4:  { loc: 'OIC',    stat: 'BMD' },
  5:  { loc: 'OIC',    stat: 'MAM' },
  6:  { loc: 'OIC',    stat: 'US1' },
  7:  { loc: 'OIC',    stat: 'US2' },
  8:  { loc: 'OIC',    stat: 'US3' },
  9:  { loc: 'OIC',    stat: 'US4' },
  10: { loc: 'OIC',    stat: 'MRI 3T' },  // MRI 3T 830
  11: { loc: 'OIC',    stat: 'MRI 3T' },  // MRI 3T 930
  12: { loc: 'OIC',    stat: 'MRI 2' },   // MRI 2 830
  13: { loc: 'OIC',    stat: 'MRI 2' },   // MRI 2 930
  14: { loc: 'OIC',    stat: 'MRI 3' },   // MRI 3 830
  15: { loc: 'OIC',    stat: 'MRI 3' },   // MRI 3 930
  16: { loc: 'OIC',    stat: 'TUCKER' },
  17: { loc: 'OIC',    stat: 'CT' },
  18: { loc: 'OIC',    stat: 'LUMA MRI' },
  19: { loc: 'OIC',    stat: 'PET' },
  20: { loc: 'NOVENA', stat: 'US 1' },
  21: { loc: 'NOVENA', stat: 'US 2' },
  22: { loc: 'NOVENA', stat: 'US 3' },
  23: { loc: 'NOVENA', stat: 'XR' },
  24: { loc: 'NOVENA', stat: 'MAM' },
  25: { loc: 'NOVENA', stat: 'MR (1.5)' },
  26: { loc: 'NOVENA', stat: 'MR (3T)' },
  27: { loc: 'NOVENA', stat: 'CT' },
  28: { loc: 'ICON',   stat: 'US 1' },
  29: { loc: 'ICON',   stat: 'US 2' },
  30: { loc: 'ICON',   stat: 'MAM' },
  31: { loc: 'ANSON',  stat: 'US' },
  32: { loc: 'ANSON',  stat: 'MAM' },
  33: { loc: 'CAMDEN', stat: 'CT' },
  34: { loc: 'CAMDEN', stat: 'XR' },
  35: { loc: 'CAMDEN', stat: 'MAM' },
  36: { loc: 'CAMDEN', stat: 'US' },
  37: { loc: 'JURONG', stat: 'XR' },
  38: { loc: 'JURONG', stat: 'US' },
  39: { status: 'Off' },
  40: { status: 'Leave' },
  41: { status: 'MC' },
};

// Known abbreviation overrides / skips (time notes, etc.)
const NON_STAFF_TOKENS = new Set([
  '830', '930', '2-6', '9-1', '9-6', 'AM', 'PM', 'MDC', 'CLOSED', 'CLOSE',
  'LOC', 'BC', 'HP', '4.30PM', 'CLOSED', '1PM', '11AM', 'STAFF',
  'TSB 9-1', 'SWJ 230', 'MYG 230', '830-230', '8:30-230', 'SWJ 1230',
  'SWJ TO-2HRS', 'WYT 5', 'PM NS', 'BAB AM', 'BAB PM', '1PM', '2-6',
  'ERW 1030', 'ERW AUG CWT', 'LON LSM(CANCELLED)', 'TSB 9-1',
  'AM ONE', 'STAFF', 'JTJ AM', 'JTJ PM', 'MYG AM', 'MYG PM', 'LJY 11-1',
  'CYR LSTJULY YS', 'LOC HP', 'LOC BC', '4.30PM', 'CLOSED',
  'LBT TO-3.5HR', 'SWJ-TO', 'ABB JTJ MYG', 'WYT 930-630', 'TCY 830-230',
  'SWJ TO-2HRS', 'TSB 2-6', 'TSB'
]);

function extractAbbreviations(cellValue) {
  if (!cellValue || typeof cellValue !== 'string') return [];
  const text = cellValue.trim();
  if (!text) return [];

  // Skip obviously non-staff values
  const upper = text.toUpperCase();
  if (upper === 'PUBLIC HOLIDAY' || upper.startsWith('PUBLIC') || upper === 'NULL') return [];

  // Split on spaces and parse each token
  const tokens = text.split(/\s+/);
  const abbrs = [];
  
  for (const token of tokens) {
    const clean = token.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (clean.length >= 2 && clean.length <= 4 && /^[A-Z]+$/.test(clean)) {
      abbrs.push(clean);
    }
  }
  return abbrs;
}

async function main() {
  console.log('Starting August 2026 import...');

  // Clear ONLY August 2026 shifts
  const aug2026Start = new Date('2026-08-01T00:00:00Z');
  const aug2026End = new Date('2026-09-01T00:00:00Z');
  db.prepare(`DELETE FROM Shift WHERE date >= ? AND date < ?`)
    .run(aug2026Start.toISOString(), aug2026End.toISOString());
  console.log('Cleared August 2026 shifts.');

  // Load station lookup
  const stationsData = db.prepare(`
    SELECT s.id, s.name as stationName, l.name as locName 
    FROM Station s JOIN Location l ON s.locationId = l.id
  `).all();

  const stationLookup = {};
  for (const row of stationsData) {
    const key = `${row.locName.toUpperCase()}::${row.stationName.toUpperCase()}`;
    stationLookup[key] = row.id;
  }
  console.log('Stations loaded:', Object.keys(stationLookup).length);

  // Load user lookup
  const usersData = db.prepare(`SELECT id, abbreviation FROM User`).all();
  const userLookup = {};
  for (const u of usersData) {
    userLookup[u.abbreviation.toUpperCase()] = u.id;
  }
  console.log('Users loaded:', Object.keys(userLookup).length);

  // Parse Excel
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, 'ASIAMEDIC ROSTER 2026 - Latest.xlsx'));
  const sheet = workbook.worksheets[0]; // AUG 2026
  console.log(`Processing sheet: ${sheet.name}`);

  const insertShift = db.prepare(`
    INSERT INTO Shift (id, date, userId, stationId, status, remarks) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Also insert public holidays as special shift entries
  const insertPH = db.prepare(`
    INSERT OR REPLACE INTO Shift (id, date, userId, stationId, status, remarks)
    VALUES (?, ?, NULL, NULL, 'Public Holiday', ?)
  `);

  let inserted = 0;
  let skipped = 0;
  let currentDate = null;

  const insertMany = db.transaction(() => {
    sheet.eachRow({ includeEmpty: true }, (row, rowNum) => {
      if (rowNum < 5) return; // Skip header rows

      const col1 = row.getCell(1).value;
      const col2 = row.getCell(2).value;

      // Detect new date from col2 (numeric day of month)
      if (col2 && typeof col2 === 'number' && col2 >= 1 && col2 <= 31) {
        currentDate = new Date(Date.UTC(2026, 7, col2, 12, 0, 0)); // August = month 7 (0-indexed)
      }

      if (!currentDate) return;

      // Check if this is a Public Holiday row
      const col3Val = row.getCell(3).value;
      if (col3Val && typeof col3Val === 'string' && col3Val.toUpperCase().includes('PUBLIC HOLIDAY')) {
        // PH days are handled in the UI from the hardcoded SG_PUBLIC_HOLIDAYS_2026 list
        return;
      }

      // Process each data column
      for (const [colStr, mapping] of Object.entries(COL_MAP)) {
        const col = parseInt(colStr);
        const cell = row.getCell(col);
        const cellVal = cell.value;
        if (!cellVal || typeof cellVal !== 'string') continue;

        const abbrs = extractAbbreviations(cellVal);
        const remarks = cellVal.trim();

        for (const abbr of abbrs) {
          const userId = userLookup[abbr];
          if (!userId) {
            skipped++;
            continue;
          }

          let stationId = null;
          let status = 'Scheduled';

          if (mapping.status) {
            status = mapping.status;
          } else {
            const stationKey = `${mapping.loc.toUpperCase()}::${mapping.stat.toUpperCase()}`;
            stationId = stationLookup[stationKey];
            if (!stationId) {
              console.warn(`  Station not found: ${stationKey}`);
              skipped++;
              continue;
            }
          }

          insertShift.run(uuidv4(), currentDate.toISOString(), userId, stationId, status, remarks !== abbr ? remarks : null);
          inserted++;
        }
      }
    });
  });

  insertMany();

  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);

  // Verify Tucker data
  const tuckerStation = db.prepare(`SELECT id FROM Station WHERE name = 'TUCKER'`).get();
  if (tuckerStation) {
    const tuckerShifts = db.prepare(`SELECT count(*) as cnt FROM Shift WHERE stationId = ?`).get(tuckerStation.id);
    console.log(`Tucker shifts: ${tuckerShifts.cnt}`);
  }
}

main().catch(console.error);
