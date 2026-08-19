const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = process.argv[2] || './dev.db';
const db = new Database(dbPath);

const users = db.prepare('SELECT id, password FROM User').all();
let migrated = 0;

for (const user of users) {
  // Skip already-hashed passwords
  if (user.password.startsWith('$2')) {
    console.log(`  Skipping ${user.id} (already hashed)`);
    continue;
  }
  
  const hash = bcrypt.hashSync(user.password, 10);
  db.prepare('UPDATE User SET password = ? WHERE id = ?').run(hash, user.id);
  migrated++;
}

console.log(`Done. Migrated ${migrated} of ${users.length} passwords to bcrypt.`);
db.close();
