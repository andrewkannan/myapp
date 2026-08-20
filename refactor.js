const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /backgroundColor:\s*['"]#(?:ffffff|fff)['"]/gi, replace: "backgroundColor: 'var(--surface)'" },
  { regex: /backgroundColor:\s*['"]#(?:f8fafc|f5f5f7)['"]/gi, replace: "backgroundColor: 'var(--background)'" },
  { regex: /backgroundColor:\s*['"]#(?:f9fafb|f1f5f9|f3f4f6)['"]/gi, replace: "backgroundColor: 'var(--surface-hover)'" },
  { regex: /backgroundColor:\s*['"]#(?:eff6ff|e0f2fe)['"]/gi, replace: "backgroundColor: 'var(--primary-light)'" },
  
  { regex: /color:\s*['"]#(?:333|333333|111|111111|1d1d1f|1a1a1a|0f172a|000000|000)['"]/gi, replace: "color: 'var(--foreground)'" },
  { regex: /color:\s*['"]#(?:86868b|6b7280|888|888888|64748b|9ca3af)['"]/gi, replace: "color: 'var(--text-muted)'" },
  { regex: /color:\s*['"]#(?:2563eb|1d4ed8|007aff|0369a1)['"]/gi, replace: "color: 'var(--primary)'" },
  { regex: /color:\s*['"]#(?:15803d|166534)['"]/gi, replace: "color: 'var(--success-text)'" },
  { regex: /color:\s*['"]#(?:b91c1c|991b1b|ef4444|dc2626)['"]/gi, replace: "color: 'var(--danger-text)'" },
  { regex: /color:\s*['"]#(?:854d0e|f59e0b)['"]/gi, replace: "color: 'var(--warning-text)'" },
  
  { regex: /border:\s*['"]1px solid #(?:e5e7eb|e2e8f0|d1d5db)['"]/gi, replace: "border: '1px solid var(--border)'" },
  { regex: /borderBottom:\s*['"]1px solid #(?:e5e7eb|e2e8f0|d1d5db)['"]/gi, replace: "borderBottom: '1px solid var(--border)'" },
  { regex: /borderTop:\s*['"]1px solid #(?:e5e7eb|e2e8f0|d1d5db)['"]/gi, replace: "borderTop: '1px solid var(--border)'" },
  
  { regex: /border:\s*['"]1px solid #(?:bfdbfe)['"]/gi, replace: "border: '1px solid var(--primary)'" },
  
  { regex: /backgroundColor:\s*['"]rgba\(255,255,255,0\.85\)['"]/gi, replace: "backgroundColor: 'var(--glass-bg)'" },
  { regex: /border:\s*['"]1px solid rgba\(0,0,0,0\.05\)['"]/gi, replace: "border: '1px solid var(--glass-border)'" },
  { regex: /boxShadow:\s*['"]0 10px 40px rgba\(0,0,0,0\.1\)['"]/gi, replace: "boxShadow: '0 10px 40px var(--shadow-color)'" },
  { regex: /boxShadow:\s*['"]0 4px 14px rgba\(0,0,0,0\.03\)['"]/gi, replace: "boxShadow: '0 4px 14px var(--shadow-color)'" },
  
  // Specific pill background colors
  { regex: /backgroundColor:\s*['"]#(?:dcfce7)['"]/gi, replace: "backgroundColor: 'var(--success-light)'" },
  { regex: /backgroundColor:\s*['"]#(?:fee2e2)['"]/gi, replace: "backgroundColor: 'var(--danger-light)'" },
  { regex: /backgroundColor:\s*['"]#(?:fef9c3|fefce8)['"]/gi, replace: "backgroundColor: 'var(--warning-light)'" },
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
  
  replacements.forEach(r => {
    content = content.replace(r.regex, r.replace);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    totalReplacements++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Done! Replaced colors in ${totalReplacements} files.`);
