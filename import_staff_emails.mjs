import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import xlsx from 'xlsx';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Reading Staff list.xlsx...');
  const workbook = xlsx.readFile('Staff list.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  let updated = 0;
  let created = 0;

  for (const row of data) {
    const abbr = (row['ID'] || '').toString().trim().toUpperCase();
    if (!abbr) continue;

    const email = row['Email'] ? row['Email'].toString().trim() : null;
    const modality = row['Modality'] ? row['Modality'].toString().trim() : null;
    const fullName = row['Staff'] ? row['Staff'].toString().trim() : null;
    const role = row['Role (Radio/Sono)'] ? row['Role (Radio/Sono)'].toString().trim() : null;

    const existingUser = await prisma.user.findUnique({
      where: { abbreviation: abbr }
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email,
          modality,
          fullName: existingUser.fullName || fullName,
          role: existingUser.role || role
        }
      });
      updated++;
      console.log(`Updated user ${abbr} with Email: ${email}, Modality: ${modality}`);
    } else {
      await prisma.user.create({
        data: {
          abbreviation: abbr,
          fullName,
          role,
          email,
          modality,
          accessLevel: 'STAFF',
          password: 'password123'
        }
      });
      created++;
      console.log(`Created new user ${abbr}`);
    }
  }

  console.log(`\nImport complete! Updated ${updated} users, Created ${created} users.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
