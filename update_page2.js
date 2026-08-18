const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

// 1. Imports and State
content = content.replace("import { useEffect, useState } from 'react';", "import { useEffect, useState, useRef } from 'react';\nimport Select from 'react-select';");
content = content.replace("const [filterUserId, setFilterUserId] = useState<string>('');", "const [filterUserIds, setFilterUserIds] = useState<string[]>([]);\n  const [settingsOpen, setSettingsOpen] = useState(false);\n  const settingsRef = useRef<HTMLDivElement>(null);");

// 2. Filter replacement
const oldFilter = `{/* Filter Dropdown */}
          {data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Filter:</span>
              <select 
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
              >
                <option value="">All Staff</option>
                {data.users.map(u => (
                  <option key={u.id} value={u.id}>{u.abbreviation} - {u.fullName}</option>
                ))}
              </select>
            </div>
          )}`;

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
            </div>
          )}`;
content = content.replace(oldFilter, newFilter);

// 3. Right Menu Buttons replacement
const oldButtons = `{['ADMIN', 'MANAGER'].includes(currentUser.accessLevel) && (
            <button 
              onClick={() => window.location.href = '/admin'}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
                backgroundColor: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)',
                borderRadius: '6px', fontWeight: 500
              }}>
              <span className="hidden-mobile">⚙️ Admin Dashboard</span>
            </button>
          )}

          <button
            onClick={() => setDirectoryOpen(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
              backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
              borderRadius: '6px', fontWeight: 500, border: '1px solid transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}
          >
            <Users size={18} />
            <span className="hidden-mobile">Directory</span>
          </button>
          <button
            onClick={() => window.print()}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
              backgroundColor: '#f0fdf4', color: '#166534',
              borderRadius: '6px', fontWeight: 500, border: '1px solid transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#166534'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f0fdf4'; e.currentTarget.style.color = '#166534'; }}
          >
            <Printer size={18} />
            <span className="hidden-mobile">Print A3</span>
          </button>
          <button 
            onClick={handleLogout}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
              backgroundColor: '#fee2e2', color: 'var(--danger)',
              borderRadius: '6px', fontWeight: 500
            }}>
            <LogOut size={18} />
            <span className="hidden-mobile">Logout</span>
          </button>`;

const newButtons = `<button
            onClick={() => setDirectoryOpen(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
              backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
              borderRadius: '6px', fontWeight: 500, border: '1px solid transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}
          >
            <Users size={18} />
            <span className="hidden-mobile">Directory</span>
          </button>
          <button
            onClick={() => window.print()}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
              backgroundColor: '#f0fdf4', color: '#166534',
              borderRadius: '6px', fontWeight: 500, border: '1px solid transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#166534'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f0fdf4'; e.currentTarget.style.color = '#166534'; }}
          >
            <Printer size={18} />
            <span className="hidden-mobile">Print A3</span>
          </button>

          <div style={{ position: 'relative' }} ref={settingsRef}>
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
          </div>`;

content = content.replace(oldButtons, newButtons);

// 4. Update filterUserIds prop correctly
content = content.replace("filterUserId={filterUserId}", "filterUserIds={filterUserIds}");

// 5. Add Settings icon import if not present
if (!content.includes('Settings')) {
  content = content.replace("import { ChevronLeft, ChevronRight, Users, Printer, LogOut } from 'lucide-react';", "import { ChevronLeft, ChevronRight, Users, Printer, LogOut, Settings } from 'lucide-react';");
}

fs.writeFileSync('src/app/page.tsx', content);
