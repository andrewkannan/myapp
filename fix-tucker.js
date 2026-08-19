const db = require('better-sqlite3')('./dev.db');

let tuckerLoc = db.prepare('SELECT * FROM Location WHERE name = ?').get('TUCKER');

if (!tuckerLoc) {
  const newId = require('crypto').randomUUID();
  db.prepare('INSERT INTO Location (id, name) VALUES (?, ?)')
    .run(newId, 'TUCKER');
  tuckerLoc = db.prepare('SELECT * FROM Location WHERE name = ?').get('TUCKER');
  console.log('Created location TUCKER:', tuckerLoc.id);
} else {
  console.log('Location TUCKER already exists:', tuckerLoc.id);
}

const tuckerStation = db.prepare('SELECT * FROM Station WHERE name = ?').get('TUCKER');
if (tuckerStation) {
  db.prepare('UPDATE Station SET name = ?, locationId = ? WHERE id = ?')
    .run('MRI', tuckerLoc.id, tuckerStation.id);
  console.log('Updated station TUCKER to MRI under location TUCKER');
} else {
  console.log('No station named TUCKER found.');
}
