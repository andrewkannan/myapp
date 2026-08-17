import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const workbook = new ExcelJS.Workbook();
  const filePath = path.join(__dirname, 'ASIAMEDIC ROSTER 2026 - Latest.xlsx');
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.worksheets[0];
  console.log(`Analyzing sheet: ${sheet.name}`);

  const textColors = {};

  for (let i = 1; i <= 20; i++) {
    const row = sheet.getRow(i);
    row.eachCell((cell, colNumber) => {
      if (cell.value && typeof cell.value === 'string' && cell.fill && cell.fill.type === 'pattern' && cell.fill.fgColor) {
        let color = cell.fill.fgColor.argb || cell.fill.fgColor.theme;
        const text = cell.value.trim();
        if (text && !textColors[text]) {
            textColors[text] = color;
        }
      }
    });
  }
  
  console.log('Text to Color Mapping:');
  console.log(textColors);
}

main().catch(console.error);
