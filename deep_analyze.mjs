import ExcelJS from 'exceljs';

const FILE = 'ASIAMEDIC ROSTER 2026 - Latest.xlsx';
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(FILE);

const sheet = workbook.getWorksheet('AUG 2026');

console.log('=== AUG 2026 Deep Analysis — Rows 5 to 20 (first ~8 days) ===\n');

// Print each row from 5-20, showing row number, col 1-5 values and the full set of filled cells
for (let rowNum = 5; rowNum <= 22; rowNum++) {
  const row = sheet.getRow(rowNum);
  const cells = [];
  row.eachCell({ includeEmpty: false }, (cell, colNum) => {
    const val = cell.value;
    const display = val && typeof val === 'object' && val.richText
      ? val.richText.map(r => r.text).join('')
      : String(val ?? '');
    if (display.trim()) cells.push(`[C${colNum}:${display.trim()}]`);
  });
  if (cells.length > 0) {
    console.log(`Row ${rowNum}: ${cells.join('  ')}`);
  }
}

console.log('\n=== Column Header Analysis (rows 1-4) ===\n');
for (let rowNum = 1; rowNum <= 4; rowNum++) {
  const row = sheet.getRow(rowNum);
  const cells = [];
  row.eachCell({ includeEmpty: false }, (cell, colNum) => {
    const val = cell.value;
    const display = val && typeof val === 'object' && val.richText
      ? val.richText.map(r => r.text).join('')
      : String(val ?? '');
    if (display.trim()) cells.push(`[C${colNum}:${display.trim()}]`);
  });
  console.log(`Row ${rowNum}: ${cells.join('  ')}`);
}

console.log('\n=== Checking for "AM"/"PM"/"830"/"1030" keywords in first 30 rows ===\n');
for (let rowNum = 5; rowNum <= 35; rowNum++) {
  const row = sheet.getRow(rowNum);
  row.eachCell({ includeEmpty: false }, (cell, colNum) => {
    const val = String(cell.value ?? '');
    if (/am|pm|830|930|1030|1230|till|until/i.test(val)) {
      console.log(`  Row ${rowNum} Col ${colNum}: "${val}"`);
    }
  });
}
