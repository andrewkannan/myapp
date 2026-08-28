import re

filepath = 'C:\\Projects\\myapp\\src\\app\\page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update lucide imports
if 'Calendar' not in content:
    content = content.replace(
        "import { ChevronLeft, ChevronRight, LogOut, Printer, Settings, Activity, MoreVertical, Filter } from 'lucide-react';",
        "import { ChevronLeft, ChevronRight, LogOut, Printer, Settings, Activity, MoreVertical, Filter, Calendar, Clock } from 'lucide-react';"
    )

# 2. Replace the dropdown button and popover
old_button_start = """              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem',
                  backgroundColor: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)',
                  borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s'
                }}"""
                
new_button_start = """              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px',
                  backgroundColor: '#f1f5f9', color: '#334155', border: 'none',
                  borderRadius: '50%', cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
              >
                <MoreVertical size={18} />
              </button>
              {settingsOpen && (
                <div className="glass-popover" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', minWidth: '220px', padding: 0, overflow: 'hidden' }}>
                  
                  <div style={{ padding: '0.5rem 0' }}>
                    <button 
                      onClick={() => { setSettingsOpen(false); router.push('/'); }} 
                      className="dropdown-item"
                    >
                      <Calendar size={18} color="#2563eb" /> <span style={{ fontWeight: 500, marginLeft: '4px' }}>Roster</span>
                    </button>
                    <button 
                      onClick={() => { setSettingsOpen(false); router.push('/leaves'); }} 
                      className="dropdown-item"
                    >
                      <Activity size={18} color="#16a34a" /> <span style={{ fontWeight: 500, marginLeft: '4px' }}>Leaves</span>
                    </button>
                    <button 
                      onClick={() => { setSettingsOpen(false); router.push('/leaves?tab=timeoff'); }} 
                      className="dropdown-item"
                    >
                      <Clock size={18} color="#f59e0b" /> <span style={{ fontWeight: 500, marginLeft: '4px' }}>Time Off</span>
                    </button>
                  </div>

                  {currentUser.permissions?.some(p => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE', 'AUDIT_VIEW'].includes(p)) && (
                    <div style={{
                      backgroundColor: 'var(--brand-light)',
                      borderTop: '1px solid var(--brand)',
                      padding: '0.5rem 0'
                    }}>
                      <button 
                        onClick={() => { setSettingsOpen(false); window.location.href = '/admin'; }} 
                        className="dropdown-item"
                        style={{ color: 'var(--foreground)', backgroundColor: 'transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(104, 176, 77, 0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <Settings size={18} color="#6366f1" /> <span style={{ fontWeight: 500, marginLeft: '4px' }}>Admin Dashboard</span>
                      </button>
                    </div>
                  )}

                  <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0' }}></div>
                  <div style={{ padding: '0.25rem 0' }}>
                    <button 
                      onClick={handleLogout} 
                      className="dropdown-item danger"
                    >
                      <LogOut size={18} /> <span style={{ fontWeight: 500, marginLeft: '4px' }}>Logout</span>
                    </button>
                  </div>
                </div>
              )}"""

# Find start of button and end of settingsOpen block
start_idx = content.find(old_button_start)
end_idx = content.find('              )}', start_idx) + len('              )}')

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_button_start + content[end_idx:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done")
else:
    print("Could not find the block")
