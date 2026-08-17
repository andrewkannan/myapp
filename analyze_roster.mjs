import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, 'ASIAMEDIC ROSTER 2026 - Latest.xlsx'));

  for (const sheet of workbook.worksheets) {
    console.log(`\n===== SHEET: ${sheet.name} =====`);
    console.log(`Merged cells: ${JSON.stringify(sheet.model.merges)}`);

    // Print rows 1-6 (headers)
    for (let r = 1; r <= 6; r++) {
      const row = sheet.getRow(r);
      const rowData = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const bg = cell.fill?.type === 'pattern' ? (cell.fill.fgColor?.argb || cell.fill.fgColor?.theme) : null;
        rowData.push({ col, val: cell.value, bg });
      });
      console.log(`Row ${r}:`, JSON.stringify(rowData));
    }

    // Print all data rows
    console.log('\n--- DATA ROWS ---');
    const allRows = [];
    sheet.eachRow({ includeEmpty: true }, (row, rowNum) => {
      if (rowNum < 5) return;
      const rowData = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const bg = cell.fill?.type === 'pattern' ? (cell.fill.fgColor?.argb || cell.fill.fgColor?.theme || 'none') : 'none';
        rowData.push({ col, val: cell.value, bg });
      });
      allRows.push({ rowNum, cells: rowData });
    });
    console.log(JSON.stringify(allRows));
  }
}

main().catch(console.error);
