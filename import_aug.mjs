/**
 * AUG 2026 Import — FINAL CORRECTED VERSION
 * 
 * Actual column map from deep analysis of "ASIAMEDIC ROSTER 2026 - Latest.xlsx":
 * Row 4 headers (1-indexed):
 *   C1=DAY DATE  C2=DATE
 *   C3=XR  C4=BMD  C5=MAM  C6=US1  C7=US2  C8=US3  C9=US4
 *   C10=MRI 3T 830  C11=MRI 3T 930
 *   C12=MRI 2 830   C13=MRI 2 930
 *   C14=MRI 3 830   C15=MRI 3 930
 *   C16=TUCKER  C17=OIC CT  C18=LUMA MRI  C19=PET
 *   C20=NOVENA US 1  C21=NOVENA US 2  C22=NOVENA US 3  C23=NOVENA XR  C24=NOVENA MAM  C25=NOVENA MR (1.5)  C26=NOVENA MR (3T)  C27=NOVENA CT
 *   C28=ICON US  C29=ICON US  C30=ICON MAM
 *   C31=ANSON US  C32=ANSON MAM
 *   C33=CAMDEN CT  C34=CAMDEN XR  C35=CAMDEN MAM  C36=CAMDEN US
 *   C37=JURONG XR  C38=JURONG US
 *   C39=OFF  C40=LEAVE  C41=MC
 * 
 * Each day = 2 consecutive rows. Same value in both = 1 person.
 * Different values = 2 different people in that slot.
 * Cell values may include time annotations like "LST am", "ERW 1030", "TCY 830-230"
 * — strip those for the abbreviation, use as remark.
 */

import ExcelJS from 'exceljs';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const FILE = 'ASIAMEDIC ROSTER 2026 - Latest.xlsx';
const db = new Database('dev.db');

// Column index → { location, station, status? } mapping
const COL_MAP = {
  3:  { loc: 'OIC',    stat: 'XR' },
  4:  { loc: 'OIC',    stat: 'BMD' },
  5:  { loc: 'OIC',    stat: 'MAM' },
  6:  { loc: 'OIC',    stat: 'US1' },
  7:  { loc: 'OIC',    stat: 'US2' },
  8:  { loc: 'OIC',    stat: 'US3' },
  9:  { loc: 'OIC',    stat: 'US4' },
  10: { loc: 'OIC',    stat: 'MRI 3T' },
  11: { loc: 'OIC',    stat: 'MRI 3T' },
  12: { loc: 'OIC',    stat: 'MRI 2' },
  13: { loc: 'OIC',    stat: 'MRI 2' },
  14: { loc: 'OIC',    stat: 'MRI 3' },
  15: { loc: 'OIC',    stat: 'MRI 3' },
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

// Load lookups
const stations = db.prepare('SELECT id, name, locationId FROM Station').all();
const locations = db.prepare('SELECT id, name FROM Location').all();
const stationLookup = {};
for (const s of stations) {
  const loc = locations.find(l => l.id === s.locationId);
  if (loc) stationLookup[`${loc.name.toUpperCase()}::${s.name.toUpperCase()}`] = s.id;
}
const users = db.prepare('SELECT id, abbreviation FROM User').all();
const userLookup = Object.fromEntries(users.map(u => [u.abbreviation.trim().toUpperCase(), u.id]));

console.log(`Stations: ${stations.length}, Users: ${users.length}`);

// Parse a cell value that may contain "ABBR remark" like "LST am", "TCY 830-230", "BAB pm"
// Returns { abbrs: string[], remark: string }
function parseCellValue(raw) {
  if (!raw) return { abbrs: [], remark: null };
  
  const str = String(raw).trim();
  if (!str || str.toUpperCase() === 'SUN' || str.toUpperCase().includes('PUBLIC HOLIDAY')) {
    return { abbrs: [], remark: null };
  }
  
  // Known non-staff values to skip
  if (/^\d+[-:]\d+/.test(str) || /^(am|pm|closed|ns|ul|bl|to|hl|ml|bc)$/i.test(str)) {
    return { abbrs: [], remark: null };
  }
  
  // Can contain multiple entries like "ABB EJP-NS LSM" or "CYR LON-BL"
  // Split on spaces
  const parts = str.split(/\s+/);
  const abbrs = [];
  let remarks = [];
  
  for (const part of parts) {
    // Known suffix patterns that are annotations, not staff codes
    if (/^(am|pm|ns|ul|bl|to|hl|ml|bc|off|leave|mc|closed)$/i.test(part)) {
      remarks.push(part);
      continue;
    }
    // Time patterns like "830-230", "1030", "9-1", "930-630"
    if (/^\d{1,4}(-\d+)?$/.test(part) || /^\d{1,2}:\d{2}/.test(part) || /^\d{1,2}(am|pm)$/i.test(part)) {
      remarks.push(part);
      continue;
    }
    // Patterns like "ABBR-NS", "ABBR-BL" — the ABBR is the staff, -NS etc is annotation
    const dashMatch = part.match(/^([A-Z]{2,5})-([A-Z]+)$/i);
    if (dashMatch) {
      abbrs.push(dashMatch[1].toUpperCase());
      remarks.push(`${dashMatch[1]}-${dashMatch[2]}`);
      continue;
    }
    // Otherwise treat as abbreviation
    if (/^[A-Z]{2,5}$/i.test(part)) {
      abbrs.push(part.toUpperCase());
    } else {
      remarks.push(part);
    }
  }
  
  return { abbrs, remark: remarks.length > 0 ? remarks.join(' ') : null };
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(FILE);
const sheet = workbook.getWorksheet('AUG 2026');

// Clear August 2026
db.prepare(`DELETE FROM Shift WHERE date >= '2026-08-01' AND date <= '2026-08-31T23:59:59'`).run();
console.log('Cleared August 2026 shifts.');

const insertShift = db.prepare(
  `INSERT INTO Shift (id, date, userId, stationId, status, shiftPeriod, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)`
);

let inserted = 0;
let skipped = 0;
const seenKeys = new Set();

// Collect all rows
const allRows = [];
sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
  if (rowNum < 5) return;
  allRows.push(row);
});

// Process in pairs
let i = 0;
while (i < allRows.length) {
  const rowA = allRows[i];
  const dayVal = String(rowA.getCell(1).value || '').trim();
  const dateRaw = rowA.getCell(2).value;
  const dateNum = parseInt(String(dateRaw ?? '').trim());
  
  if (!dayVal || isNaN(dateNum) || dateNum < 1 || dateNum > 31) { i++; continue; }
  
  // Look for rowB (same date number, next row)
  let rowB = null;
  if (i + 1 < allRows.length) {
    const nextRow = allRows[i + 1];
    const nextDateNum = parseInt(String(nextRow.getCell(2).value ?? '').trim());
    if (nextDateNum === dateNum) {
      rowB = nextRow;
      i++;
    }
  }
  
  // Check if it's a holiday or Sunday
  const col3A = String(rowA.getCell(3).value || '').trim().toUpperCase();
  if (col3A.includes('PUBLIC HOLIDAY') || col3A === 'SUN') { i++; continue; }
  
  const date = new Date(Date.UTC(2026, 7, dateNum, 12, 0, 0)); // noon UTC
  
  db.transaction(() => {
    for (const [colStr, mapping] of Object.entries(COL_MAP)) {
      const colNum = parseInt(colStr);
      const valA = rowA.getCell(colNum).value;
      const valB = rowB ? rowB.getCell(colNum).value : null;
      
      // Parse both rows
      const parsedA = parseCellValue(valA);
      const parsedB = parseCellValue(valB);
      
      // Combine: if same abbr in both rows → only add once
      const allEntries = [...parsedA.abbrs];
      for (const abbr of parsedB.abbrs) {
        if (!allEntries.includes(abbr)) allEntries.push(abbr);
      }
      
      for (const abbr of allEntries) {
        const userId = userLookup[abbr];
        if (!userId) { skipped++; continue; }
        
        let stationId = null;
        let status = 'Scheduled';
        
        if (mapping.status) {
          status = mapping.status;
        } else {
          const key = `${mapping.loc.toUpperCase()}::${mapping.stat.toUpperCase()}`;
          stationId = stationLookup[key];
          if (!stationId) { skipped++; continue; }
        }
        
        const dupKey = `${date.toISOString()}::${stationId ?? 'null'}::${userId}::${status}`;
        if (seenKeys.has(dupKey)) { skipped++; continue; }
        seenKeys.add(dupKey);
        
        // Determine remark (time annotation from either row)
        const remark = parsedA.remark || parsedB.remark || null;
        
        insertShift.run(uuidv4(), date.toISOString(), userId, stationId, status, 'Full', remark);
        inserted++;
      }
    }
  })();
  
  i++;
}

console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);

// Print a quick sample check
const sample = db.prepare(`
  SELECT s.date, u.abbreviation, st.name as station
  FROM Shift s
  JOIN User u ON u.id = s.userId
  JOIN Station st ON st.id = s.stationId
  WHERE s.date LIKE '2026-08-01%' AND s.status='Scheduled'
  LIMIT 10
`).all();
console.log('\nSample Aug 1 shifts:');
sample.forEach(r => console.log(` ${r.abbreviation} → ${r.station}`));
