const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /backgroundColor:\s*['"]white['"]/gi, replace: "backgroundColor: 'var(--surface)'" },
  { regex: /backgroundColor:\s*['"]#fff['"]/gi, replace: "backgroundColor: 'var(--surface)'" },
  { regex: /color:\s*['"]white['"]/gi, replace: "color: 'var(--surface)'" }, // Wait, color: 'white' might be on buttons where it's supposed to be white!
  { regex: /color:\s*['"]#000['"]/gi, replace: "color: 'var(--foreground)'" }
];

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walkDir(path.join(__dirname, 'src'));
let totalReplacements = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Safe replacement: only replace background-color white, because color white is often on colored buttons
  content = content.replace(/backgroundColor:\s*['"](?:white|#fff|#ffffff)['"]/gi, "backgroundColor: 'var(--surface)'");
  content = content.replace(/color:\s*['"](?:#000|black)['"]/gi, "color: 'var(--foreground)'");
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    totalReplacements++;
    console.log(`Updated ${file}`);
  }
});
console.log(`Done! Replaced in ${totalReplacements} files.`);
