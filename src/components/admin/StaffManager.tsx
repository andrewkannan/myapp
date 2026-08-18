'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Pencil, Trash2, Plus, X, Download, Upload, Search, Filter, CheckSquare, Power, Lock } from 'lucide-react';

export function StaffManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [systemRoles, setSystemRoles] = useState<string[]>([]);
  const [systemModalities, setSystemModalities] = useState<string[]>([]);
  
  // Feature states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalityFilter, setModalityFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'fullName', direction: 'asc' });
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
      
      const listsRes = await fetch('/api/system-lists');
      const listsData = await listsRes.json();
      
      const roles = (listsData.roles || []).map((r: any) => r.name);
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
    if (!confirm('Are you sure you want to permanently delete this user? (Consider Deactivating instead to preserve history)')) return;
    try {
      await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/users?id=${id}`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Abbreviation', 'FullName', 'Email', 'SSO_Enabled', 'Role', 'Modality', 'Status', 'LastLoginAt'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedUsers.map(u => [
        u.id, 
        u.abbreviation || '', 
        `"${u.fullName || ''}"`, 
        u.email || '', 
        u.ssoEnabled ? 'Yes' : 'No',
        `"${u.role || ''}"`, 
        `"${u.modality || ''}"`, 
        u.isActive ? 'Active' : 'Inactive',
        u.lastLoginAt || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `staff_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return alert('File is empty or invalid');
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const usersToImport = [];

      for (let i = 1; i < lines.length; i++) {
        // Very basic CSV parsing (fails on commas inside quotes, but good enough for simple admin usage)
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '')) || lines[i].split(',');
        const userObj: any = {};
        headers.forEach((header, idx) => {
          if (row[idx]) {
            if (header === 'status') userObj.isActive = row[idx].toLowerCase() === 'active';
            else if (header === 'sso_enabled') userObj.ssoEnabled = row[idx].toLowerCase() === 'yes';
            else userObj[header] = row[idx];
          }
        });
        if (userObj.fullname || userObj.abbreviation) {
          userObj.fullName = userObj.fullname; // fix casing
          usersToImport.push(userObj);
        }
      }

      try {
        const res = await fetch('/api/users/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: usersToImport })
        });
        const data = await res.json();
        if (res.ok) {
          alert(`Import successful: ${data.createdCount} created, ${data.updatedCount} updated.`);
          fetchUsers();
        } else {
          alert('Import failed: ' + data.error);
        }
      } catch (err) {
        alert('Import request failed');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBulkAssignRole = async (roleName: string) => {
    if (selectedUserIds.size === 0) return;
    if (!confirm(`Append role "${roleName}" to ${selectedUserIds.size} users?`)) return;

    const usersToUpdate = users.filter(u => selectedUserIds.has(u.id)).map(u => {
      const currentRoles = u.role ? u.role.split(',').map((r: string) => r.trim()).filter(Boolean) : [];
      if (!currentRoles.includes(roleName)) currentRoles.push(roleName);
      return { id: u.id, role: currentRoles.join(', ') };
    });

    try {
      await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: usersToUpdate })
      });
      setSelectedUserIds(new Set());
      fetchUsers();
    } catch (e) {
      console.error(e);
      alert('Bulk update failed');
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredAndSortedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredAndSortedUsers.map(u => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUserIds(newSet);
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = users;

    // Filter by search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(u => 
        (u.fullName && u.fullName.toLowerCase().includes(lower)) ||
        (u.abbreviation && u.abbreviation.toLowerCase().includes(lower)) ||
        (u.email && u.email.toLowerCase().includes(lower))
      );
    }

    // Filter by Role
    if (roleFilter) {
      result = result.filter(u => u.role && u.role.includes(roleFilter));
    }

    // Filter by Modality
    if (modalityFilter) {
      result = result.filter(u => u.modality && u.modality.includes(modalityFilter));
    }

    // Sorting
    result = [...result].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchTerm, roleFilter, modalityFilter, sortConfig]);

  if (loading) return <div>Loading staff...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Staff Management</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Manage user accounts, roles, and access.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: '0.875rem' }}>
            <Download size={14} /> Export CSV
          </button>
          
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: '0.875rem' }}>
            <Upload size={14} /> Import Users
          </button>

          <button 
            onClick={() => {
              setEditingUser({ abbreviation: '', fullName: '', role: '', isActive: true });
              setIsCreating(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            <Plus size={16} /> Add Staff
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.6rem', color: 'var(--text-muted)' }} />
            <input 
              type="text" placeholder="Search by name, abbr, or email..." 
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select 
              value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.875rem', backgroundColor: 'var(--background)' }}
            >
              <option value="">All Roles</option>
              {systemRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select 
              value={modalityFilter} onChange={e => setModalityFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.875rem', backgroundColor: 'var(--background)' }}
            >
              <option value="">All Modalities</option>
              {systemModalities.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {selectedUserIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{selectedUserIds.size} selected</span>
            <select 
              onChange={e => {
                if (e.target.value) {
                  handleBulkAssignRole(e.target.value);
                  e.target.value = '';
                }
              }}
              style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: '0.875rem', backgroundColor: 'var(--primary-light)', cursor: 'pointer' }}
            >
              <option value="">Bulk Assign Role...</option>
              {systemRoles.map(r => <option key={r} value={r}>+ {r}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'auto', backgroundColor: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--header-bg)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', width: '40px' }}>
                <input type="checkbox" checked={selectedUserIds.size === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
              </th>
              <th onClick={() => requestSort('abbreviation')} style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Abbr {sortConfig.key === 'abbreviation' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th onClick={() => requestSort('fullName')} style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Full Name {sortConfig.key === 'fullName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Contact & Auth</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Role & Modalities</th>
              <th onClick={() => requestSort('lastLoginAt')} style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Last Active {sortConfig.key === 'lastLoginAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', opacity: u.isActive ? 1 : 0.6 }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={() => toggleSelect(u.id)} style={{ cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ backgroundColor: 'var(--background)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '0.875rem' }}>{u.abbreviation || '-'}</span>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: u.isActive ? 'var(--success)' : 'var(--text-muted)' }} title={u.isActive ? 'Active' : 'Inactive'} />
                    {u.fullName || '-'}
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                  <div style={{ color: 'var(--foreground)', marginBottom: '0.25rem' }}>{u.email || '-'}</div>
                  {u.ssoEnabled ? (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px' }}>✓ MS SSO</span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, backgroundColor: 'var(--background)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>Local Auth</span>
                  )}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {u.role ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {u.role.split(',').map((r: string) => r.trim()).filter(Boolean).map((r: string, i: number) => (
                          <span key={i} style={{ backgroundColor: r === 'System Admin' ? '#FEE2E2' : r === 'Scheduler' ? '#FEF08A' : '#E0F2FE', color: r === 'System Admin' ? '#DC2626' : r === 'Scheduler' ? '#A16207' : '#0369A1', padding: '2px 8px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600 }}>{r}</span>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Role</span>}
                    {u.modality && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mods: {u.modality}</span>}
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <button onClick={() => { setEditingUser(u); setIsCreating(false); }} style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }} title="Edit User"><Pencil size={16} /></button>
                  <button onClick={() => handleToggleActive(u.id, u.isActive)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', color: u.isActive ? 'var(--warning)' : 'var(--success)' }} title={u.isActive ? "Deactivate User" : "Activate User"}><Power size={16} /></button>
                  <button onClick={() => handleDelete(u.id)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger)' }} title="Permanently Delete"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {filteredAndSortedUsers.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No staff members match your search criteria.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', width: '500px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{isCreating ? 'Add Staff' : 'Edit Staff'}</h3>
              <button onClick={() => { setEditingUser(null); setIsCreating(false); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500 }}>Account Status</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inactive users cannot log in or be assigned shifts.</span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                  <input type="checkbox" checked={editingUser.isActive !== false} onChange={e => setEditingUser({...editingUser, isActive: e.target.checked})} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: editingUser.isActive !== false ? 'var(--success)' : 'var(--danger)' }}>
                    {editingUser.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>

              {(() => {
                const currentRoles = editingUser.role ? editingUser.role.split(',').map((r: string) => r.trim()).filter(Boolean) : [];
                return (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Roles Assigned</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', backgroundColor: 'var(--background)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      {systemRoles.map(roleOption => (
                        <label key={roleOption} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={currentRoles.includes(roleOption)}
                            onChange={(e) => {
                              let newRolesList = [...currentRoles];
                              if (e.target.checked && !newRolesList.includes(roleOption)) newRolesList.push(roleOption);
                              else if (!e.target.checked) newRolesList = newRolesList.filter(r => r !== roleOption);
                              setEditingUser({ ...editingUser, role: newRolesList.join(', ') });
                            }}
                          />
                          {roleOption}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Abbreviation</label>
                  <input type="text" value={editingUser.abbreviation || ''} onChange={e => setEditingUser({ ...editingUser, abbreviation: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Full Name</label>
                  <input type="text" value={editingUser.fullName || ''} onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email Address</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editingUser.ssoEnabled || false} onChange={e => setEditingUser({ ...editingUser, ssoEnabled: e.target.checked })} style={{ cursor: 'pointer' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: editingUser.ssoEnabled ? '#1E40AF' : 'var(--text-muted)' }}>Microsoft SSO Activated</span>
                  </label>
                </div>
                <input type="email" value={editingUser.email || ''} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }} />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  <Lock size={14} /> Set Local Password
                </label>
                <input type="text" placeholder={isCreating ? "password123" : "Leave blank to keep unchanged"} value={editingUser.password || ''} onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Use this to set a manual password for users not using SSO.</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Modalities</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', backgroundColor: 'var(--background)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  {systemModalities.map(modOption => {
                    const currentMods = editingUser.modality ? editingUser.modality.split(',').map((m: string) => m.trim()).filter(Boolean) : [];
                    return (
                      <label key={modOption} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={currentMods.includes(modOption)} onChange={(e) => {
                          let newMods = [...currentMods];
                          if (e.target.checked && !newMods.includes(modOption)) newMods.push(modOption);
                          else if (!e.target.checked) newMods = newMods.filter(m => m !== modOption);
                          setEditingUser({ ...editingUser, modality: newMods.join(', ') });
                        }} />
                        {modOption}
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
