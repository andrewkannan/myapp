const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      
      // If it contains PrismaBetterSqlite3, we replace the block
      if (content.includes('PrismaBetterSqlite3')) {
        let lines = content.split('\n');
        let newLines = [];
        let injected = false;
        let skipping = false;
        
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i];
          
          if (line.includes('import { PrismaClient }')) {
             if (!injected) {
               newLines.push("import prisma from '@/lib/prisma';");
               injected = true;
             }
             continue;
          }
          if (line.includes('import { PrismaBetterSqlite3 }')) continue;
          
          if (line.includes('const adapter = new PrismaBetterSqlite3')) {
            skipping = true;
            continue;
          }
          if (skipping && line.includes('});')) {
            skipping = false;
            continue;
          }
          if (skipping) continue;
          
          if (line.includes('const prisma = new PrismaClient')) continue;
          
          newLines.push(line);
        }
        
        fs.writeFileSync(fullPath, newLines.join('\n'));
        console.log('Fixed ' + fullPath);
      }
    }
  }
}

processDir('src/app/api');
