const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Replace Filter 
const filterStart = content.indexOf('{/* Filter Dropdown */}');
const filterEnd = content.indexOf('</div>\n          )}\n        </div>');
if (filterStart !== -1 && filterEnd !== -1) {
  const newFilter = `{/* Filter Dropdown */}
          {data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '350px' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Filter:</span>
              <div style={{ flex: 1, zIndex: 50 }}>
                <Select
                  isMulti
                  options={data.users.map(u => ({ value: u.id, label: \`\${u.abbreviation || '?'} - \${u.fullName || ''}\` }))}
                  value={data.users
                    .filter(u => filterUserIds.includes(u.id))
                    .map(u => ({ value: u.id, label: \`\${u.abbreviation || '?'} - \${u.fullName || ''}\` }))}
                  onChange={(selected) => setFilterUserIds(selected.map(s => s.value))}
                  placeholder="Select staff..."
                  styles={{
                    control: (base) => ({
                      ...base,
                      fontSize: '0.875rem',
                      borderColor: 'var(--border)',
                      minHeight: '38px',
                      borderRadius: '6px'
                    }),
                    menu: (base) => ({ ...base, fontSize: '0.875rem', zIndex: 100 })
                  }}
                />
              </div>
            `;
  content = content.substring(0, filterStart) + newFilter + content.substring(filterEnd);
}

// Replace buttons
const buttonsStart = content.indexOf('{[\'ADMIN\', \'MANAGER\'].includes(currentUser.accessLevel) && (');
const buttonsEnd = content.indexOf('<span className="hidden-mobile">Logout</span>\n          </button>');
if (buttonsStart !== -1 && buttonsEnd !== -1) {
  const newButtons = `<div style={{ position: 'relative' }} ref={settingsRef}>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem',
                backgroundColor: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)',
                borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--surface)'; }}
            >
              <Settings size={18} />
            </button>
            {settingsOpen && (
              <div style={{ 
                position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', 
                backgroundColor: 'var(--surface)', border: '1px solid var(--border)', 
                borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
                zIndex: 100, minWidth: '200px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'
              }}>
                {['ADMIN', 'MANAGER'].includes(currentUser.accessLevel) && (
                  <button 
                    onClick={() => window.location.href = '/admin'} 
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 500 }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    ⚙️ Admin Dashboard
                  </button>
                )}
                {['ADMIN', 'MANAGER'].includes(currentUser.accessLevel) && <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.25rem 0' }}></div>}
                <button 
                  onClick={handleLogout} 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--danger)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 500 }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
          `;
  const skipLen = '<span className="hidden-mobile">Logout</span>\n          </button>'.length;
  content = content.substring(0, buttonsStart) + newButtons + content.substring(buttonsEnd + skipLen);
}

if (!content.includes('Settings')) {
  content = content.replace("import { ChevronLeft, ChevronRight, Users, Printer, LogOut } from 'lucide-react';", "import { ChevronLeft, ChevronRight, Users, Printer, LogOut, Settings } from 'lucide-react';");
}

fs.writeFileSync('src/app/page.tsx', content);
