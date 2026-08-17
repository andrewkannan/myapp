import Database from 'better-sqlite3';

const db = new Database('dev.db');

// Check duplicates
const dups = db.prepare(`
  SELECT date, stationId, userId, count(*) as cnt 
  FROM Shift 
  WHERE status='Scheduled' 
  GROUP BY date, stationId, userId 
  HAVING cnt > 1 
  LIMIT 20
`).all();

console.log(`\nDuplicate (date, station, user) combos: ${dups.length}`);
dups.forEach(d => console.log(d));

// Count total
const total = db.prepare(`SELECT count(*) as cnt FROM Shift`).get();
const scheduled = db.prepare(`SELECT count(*) as cnt FROM Shift WHERE status='Scheduled'`).get();
console.log(`\nTotal shifts: ${total.cnt}, Scheduled: ${scheduled.cnt}`);

// Fix: delete duplicates, keep only the first occurrence per (date, stationId, userId, shiftPeriod)
console.log('\nRemoving duplicates...');
const deleted = db.prepare(`
  DELETE FROM Shift 
  WHERE id NOT IN (
    SELECT MIN(id) FROM Shift 
    GROUP BY date, stationId, userId, shiftPeriod, status
  )
`).run();
console.log(`Deleted ${deleted.changes} duplicate shifts.`);

const after = db.prepare(`SELECT count(*) as cnt FROM Shift`).get();
console.log(`Shifts remaining: ${after.cnt}`);
