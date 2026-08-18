'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, X } from 'lucide-react';

export function StaffManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [systemRoles, setSystemRoles] = useState<string[]>([]);
  const [systemModalities, setSystemModalities] = useState<string[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
      
      const listsRes = await fetch('/api/system-lists');
      const listsData = await listsRes.json();
      
      const roles = (listsData.roles || []).map((r: any) => r.name);
      if (!roles.includes('Scheduler')) roles.push('Scheduler');
      if (!roles.includes('System Admin')) roles.push('System Admin');
      setSystemRoles(roles);
      
      setSystemModalities((listsData.modalities || []).map((m: any) => m.name));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (user: any) => {
    const url = isCreating ? '/api/users' : `/api/users?id=${user.id}`;
    const method = isCreating ? 'POST' : 'PATCH';
    
    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      setEditingUser(null);
      setIsCreating(false);
      fetchUsers();
    } catch (e) {
      console.error(e);
      alert('Failed to save user.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div>Loading staff...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Staff Management</h2>
        <button 
          onClick={() => {
            setEditingUser({ abbreviation: '', fullName: '', role: '', accessLevel: 'STAFF' });
            setIsCreating(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--header-bg)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Abbr</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Full Name</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Email</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Modality</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Role</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ backgroundColor: 'var(--background)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '0.875rem' }}>{u.abbreviation || '-'}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{u.fullName || '-'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{u.email || '-'}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{u.modality || '-'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {(() => {
                    const displayRoles = u.role ? u.role.split(',').map(r => r.trim()).filter(Boolean) : [];
                    if (u.accessLevel === 'ADMIN') displayRoles.push('System Admin');
                    if (u.accessLevel === 'MANAGER') displayRoles.push('Scheduler');
                    
                    if (displayRoles.length === 0) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
                    
                    return (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {displayRoles.map((r, i) => (
                          <span key={i} style={{
                            backgroundColor: r === 'System Admin' ? '#FEE2E2' : r === 'Scheduler' ? '#FEF08A' : '#E0F2FE',
                            color: r === 'System Admin' ? '#DC2626' : r === 'Scheduler' ? '#A16207' : '#0369A1',
                            padding: '2px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600
                          }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <button onClick={() => { setEditingUser(u); setIsCreating(false); }} style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(u.id)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', width: '400px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{isCreating ? 'Add Staff' : 'Edit Staff'}</h3>
              <button onClick={() => { setEditingUser(null); setIsCreating(false); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(() => {
                const dbRoles = editingUser.role ? editingUser.role.split(',').map((r: string) => r.trim()).filter(Boolean) : [];
                const currentRoles = [...dbRoles];
                if (editingUser.accessLevel === 'ADMIN') currentRoles.push('System Admin');
                if (editingUser.accessLevel === 'MANAGER') currentRoles.push('Scheduler');

                const needsAbbreviation = currentRoles.includes('Radiographer') || currentRoles.includes('Sonographer');
                return (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Role & System Access</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', backgroundColor: 'var(--background)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        {systemRoles.map(roleOption => {
                          const isChecked = currentRoles.includes(roleOption);
                          return (
                            <label key={roleOption} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let newRolesList = [...currentRoles];
                                  if (e.target.checked) {
                                    if (!newRolesList.includes(roleOption)) newRolesList.push(roleOption);
                                  } else {
                                    newRolesList = newRolesList.filter(r => r !== roleOption);
                                  }
                                  
                                  let newAccess = 'STAFF';
                                  if (newRolesList.includes('System Admin')) newAccess = 'ADMIN';
                                  else if (newRolesList.includes('Scheduler')) newAccess = 'MANAGER';

                                  const dbRolesList = newRolesList.filter(r => r !== 'System Admin' && r !== 'Scheduler');
                                  const newRolesString = dbRolesList.join(', ');
                                  
                                  let newAbbr = editingUser.abbreviation;
                                  if (!newRolesList.includes('Radiographer') && !newRolesList.includes('Sonographer')) {
                                    newAbbr = '';
                                  }
                                  
                                  setEditingUser({ ...editingUser, role: newRolesString, accessLevel: newAccess, abbreviation: newAbbr });
                                }}
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              />
                              <span style={{ 
                                color: roleOption === 'System Admin' ? 'var(--danger)' : roleOption === 'Scheduler' ? '#A16207' : 'inherit',
                                fontWeight: (roleOption === 'System Admin' || roleOption === 'Scheduler') ? 600 : 400
                              }}>
                                {roleOption}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    
                    {needsAbbreviation && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Abbreviation (Required)</label>
                        <input 
                          type="text" value={editingUser.abbreviation || ''} 
                          onChange={e => setEditingUser({ ...editingUser, abbreviation: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                        />
                      </div>
                    )}
                  </>
                );
              })()}
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Full Name</label>
                <input 
                  type="text" value={editingUser.fullName || ''} 
                  onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Email Address</label>
                <input 
                  type="email" value={editingUser.email || ''} 
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Modality</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', backgroundColor: 'var(--background)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  {systemModalities.map(modalityOption => {
                    const currentMods = editingUser.modality ? editingUser.modality.split(',').map((m: string) => m.trim()).filter(Boolean) : [];
                    const isChecked = currentMods.includes(modalityOption);
                    return (
                      <label key={modalityOption} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (!currentMods.includes(modalityOption)) currentMods.push(modalityOption);
                            } else {
                              const idx = currentMods.indexOf(modalityOption);
                              if (idx > -1) currentMods.splice(idx, 1);
                            }
                            setEditingUser({ ...editingUser, modality: currentMods.join(', ') });
                          }}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        {mod}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={() => { setEditingUser(null); setIsCreating(false); }} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => handleSave(editingUser)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 500 }}>Save User</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
