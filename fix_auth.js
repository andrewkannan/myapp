const fs = require('fs');

const authCheck1 = "if (!session || !['ADMIN', 'MANAGER'].includes(session.accessLevel)) {";
const authCheck2 = "if (!session || (session.accessLevel !== 'ADMIN' && session.accessLevel !== 'MANAGER')) {";
const authCheck3 = "if (!session || (session.accessLevel !== 'MANAGER' && session.accessLevel !== 'ADMIN')) {";
const authCheckAdminOnly = "if (!session || session.accessLevel !== 'ADMIN') {";

const permCheckGeneral = "if (!session || !session.permissions?.some(p => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE', 'ROSTER_EDIT'].includes(p))) {";
const permCheckAdmin = "if (!session || !session.permissions?.includes('STAFF_MANAGE')) {";
const permCheckRoster = "if (!session || !session.permissions?.includes('ROSTER_EDIT')) {";

const files = [
  'src/app/api/locations/route.ts',
  'src/app/api/stations/route.ts',
  'src/app/api/logs/route.ts',
  'src/app/api/users/route.ts',
  'src/app/api/import-staff/route.ts',
  'src/app/api/roster/route.ts'
];

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  
  // Custom auth replacements
  content = content.replace(/if \(!session \|\| \!\[\'ADMIN\', \'MANAGER\'\]\.includes\(session\.accessLevel\)\) \{/g, permCheckGeneral);
  content = content.replace(/if \(!session \|\| session\.accessLevel !== \'ADMIN\'\) \{/g, permCheckAdmin);
  content = content.replace(/if \(!session \|\| session\.accessLevel !== \'MANAGER\' \&\& !session\.permissions\?\.includes\(\'STAFF_MANAGE\'\)\) \{/g, permCheckRoster); // From my previous botched replace
  content = content.replace(/if \(!session \|\| \(session\.accessLevel !== \'MANAGER\' \&\& session\.accessLevel !== \'ADMIN\'\)\) \{/g, permCheckGeneral);
  
  fs.writeFileSync(f, content);
}
