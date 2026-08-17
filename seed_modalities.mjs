import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('dev.db');

const locations = [
  {
    name: 'OIC',
    stations: ['XR', 'BMD', 'MAM', 'US1', 'US2', 'US3', 'US4', 'MRI 3T 830', 'MRI 3T 930', 'MRI 2 830', 'MRI 2 930', 'MRI 3 830', 'MRI 3 930', 'TUCKER', 'CT', 'LUMA MRI', 'PET']
  },
  {
    name: 'NOVENA',
    stations: ['US 1', 'US 2', 'US 3', 'XR', 'MAM', 'MR (1.5)', 'MR (3T)', 'CT']
  },
  {
    name: 'ICON',
    stations: ['US 1', 'US 2', 'MAM']
  },
  {
    name: 'ANSON',
    stations: ['US', 'MAM']
  },
  {
    name: 'CAMDEN',
    stations: ['CT', 'XR', 'MAM', 'US']
  },
  {
    name: 'JURONG',
    stations: ['XR', 'US']
  }
];

function seed() {
  console.log('Seeding modalities...');
  
  // Clear old stations and locations (optional, but good for cleanup)
  // We won't delete shifts to avoid breaking things, but there shouldn't be any shifts yet.
  db.prepare(`DELETE FROM Station`).run();
  db.prepare(`DELETE FROM Location`).run();

  const insertLocation = db.prepare(`INSERT INTO Location (id, name) VALUES (?, ?)`);
  const insertStation = db.prepare(`INSERT INTO Station (id, name, locationId) VALUES (?, ?, ?)`);

  db.transaction(() => {
    for (const loc of locations) {
      const locId = uuidv4();
      insertLocation.run(locId, loc.name);
      
      for (const stat of loc.stations) {
        insertStation.run(uuidv4(), stat, locId);
      }
    }
  })();

  console.log('Modalities seeded successfully!');
}

seed();
