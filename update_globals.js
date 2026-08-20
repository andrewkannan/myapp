const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'app', 'globals.css');
let content = fs.readFileSync(cssPath, 'utf8');

const rootStart = content.indexOf(':root {');
const resetStart = content.indexOf('/* ─── BASE RESET');

if (rootStart !== -1 && resetStart !== -1) {
  const newTokens = `:root {
  /* Brand */
  --brand: #68B04D;
  --brand-light: #e8f5e3;
  --brand-dark: #4a8a35;

  /* Core palette - Light */
  --background: #f8fafc;
  --foreground: #0f172a;
  --surface: #ffffff;
  --surface-hover: #f1f5f9;
  --border: #e2e8f0;
  
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: #eff6ff;
  
  --danger: #ef4444;
  --danger-light: #fef2f2;
  --danger-border: #fca5a5;
  --danger-text: #b91c1c;

  --warning: #f59e0b;
  --warning-light: #fefce8;
  --warning-border: #fde047;
  --warning-text: #a16207;

  --success: #10b981;
  --success-light: #ecfdf5;
  --success-border: #6ee7b7;
  --success-text: #047857;

  --text-muted: #64748b;
  --cell-hover: rgba(0,0,0,0.04);
  --glass-bg: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(0, 0, 0, 0.05);
  --shadow-color: rgba(0,0,0,0.1);

  /* Roster-specific */
  --weekend-bg: #f1f5f9;
  --header-bg: #f8fafc;
  --ph-bg: #FEF2F2;
  --ph-text: #DC2626;

  /* Band Colors Light */
  --band-oic: #B2EBE6;
  --band-novena: #C8E6C9;
  --band-icon: #D1C4E9;
  --band-anson: #C8E6C9;
  --band-camden: #D1C4E9;
  --band-jurong: #B2EBF2;
  
  /* Station Colors Light */
  --station-bmd: #F4FDC2;
  --station-mam: #F8D7EA;
  --station-ct: #E8E4FF;
  --station-pet: #FFF3CC;
  --station-luma: #F0F0F0;
  --station-mri: #D6F5F8;
  
  --leave-bg: #DBEAFE;
  --leave-text: #1e40af;
  --am-text: #0369a1;
  --pm-text: #c2410c;

  /* Spacing scale */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04);

  /* Transitions */
  --transition-fast: 0.1s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;

  /* Typography */
  --font-sans: var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

[data-theme='dark'] {
  --background: #0f1115;
  --foreground: #f1f5f9;
  --surface: #1a1d24;
  --surface-hover: #262a33;
  --border: #2a2f3a;
  
  --primary: #3b82f6;
  --primary-hover: #60a5fa;
  --primary-light: #1e3a8a;
  
  --danger: #ef4444;
  --danger-light: #451a1a;
  --danger-border: #7f1d1d;
  --danger-text: #fca5a5;

  --warning: #f59e0b;
  --warning-light: #422006;
  --warning-border: #78350f;
  --warning-text: #fcd34d;

  --success: #10b981;
  --success-light: #064e3b;
  --success-border: #065f46;
  --success-text: #6ee7b7;

  --text-muted: #94a3b8;
  --cell-hover: rgba(255,255,255,0.04);
  --glass-bg: rgba(26, 29, 36, 0.85);
  --glass-border: rgba(255, 255, 255, 0.05);
  --shadow-color: rgba(0,0,0,0.5);

  /* Roster-specific */
  --weekend-bg: #14171c;
  --header-bg: #15181e;
  --ph-bg: #2a1114;
  --ph-text: #fca5a5;

  /* Band Colors Dark - Deeper, saturated variants */
  --band-oic: #0d3b38;
  --band-novena: #103318;
  --band-icon: #261642;
  --band-anson: #103318;
  --band-camden: #261642;
  --band-jurong: #0d3840;

  /* Station Colors Dark */
  --station-bmd: #3b421a;
  --station-mam: #4a1932;
  --station-ct: #242042;
  --station-pet: #423512;
  --station-luma: #2a2a2a;
  --station-mri: #1a4145;

  --leave-bg: #1e3a8a;
  --leave-text: #bfdbfe;
  --am-text: #7dd3fc;
  --pm-text: #fdba74;
}

`;
  
  content = content.substring(0, rootStart) + newTokens + content.substring(resetStart);
  fs.writeFileSync(cssPath, content, 'utf8');
  console.log('Updated globals.css with new tokens');
}
