'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Save } from 'lucide-react';

type SystemRole = { id: string; name: string; permissions: string | null };
type SystemModality = { id: string; name: string };

const APP_MODULES = [
  { key: 'ROSTER_VIEW', label: 'View Roster' },
  { key: 'ROSTER_EDIT', label: 'Edit Roster' },
  { key: 'STAFF_MANAGE', label: 'Manage Staff' },
  { key: 'FACILITY_MANAGE', label: 'Manage Facilities' },
  { key: 'ROLE_MANAGE', label: 'Access Control' },
  { key: 'AUDIT_VIEW', label: 'Audit Logs' }
];

export function SystemListManager() {
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [modalities, setModalities] = useState<SystemModality[]>([]);
  
  const [newRoleName, setNewRoleName] = useState('');
  const [newModalityName, setNewModalityName] = useState('');
  const [loading, setLoading] = useState(true);

  // Local state for permissions to allow editing before saving
  const [rolePermissions, setRolePermissions] = useState<Record<string, Set<string>>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system-lists');
      const data = await res.json();
      setRoles(data.roles || []);
      setModalities(data.modalities || []);
      
      const permMap: Record<string, Set<string>> = {};
      (data.roles || []).forEach((r: SystemRole) => {
        const perms = r.permissions ? r.permissions.split(',').map(p => p.trim()) : [];
        if (r.name === 'System Admin') {
          APP_MODULES.forEach(m => perms.push(m.key)); // Force all
        }
        permMap[r.id] = new Set(perms);
      });
      setRolePermissions(permMap);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addListEntry = async (type: 'role' | 'modality', name: string) => {
    if (!name.trim()) return;
    
    try {
      const res = await fetch('/api/system-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name: name.trim() })
      });
      if (res.ok) {
        if (type === 'role') setNewRoleName('');
        if (type === 'modality') setNewModalityName('');
        fetchLists();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteListEntry = async (type: 'role' | 'modality', id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await fetch(`/api/system-lists?type=${type}&id=${id}`, { method: 'DELETE' });
      fetchLists();
    } catch (e) {
      console.error(e);
    }
  };

  const togglePermission = (roleId: string, permKey: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.name === 'System Admin') return; // Locked
    
    setRolePermissions(prev => {
      const next = { ...prev };
      const rolePerms = new Set(next[roleId] || new Set());
      if (rolePerms.has(permKey)) {
        rolePerms.delete(permKey);
      } else {
        rolePerms.add(permKey);
      }
      next[roleId] = rolePerms;
      return next;
    });
  };

  const savePermissions = async () => {
    setSavingPermissions(true);
    try {
      // Create an array of updates
      const updates = roles.map(r => ({
        id: r.id,
        permissions: Array.from(rolePermissions[r.id] || new Set()).join(',')
      }));
      
      const res = await fetch('/api/system-lists/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: updates })
      });
      if (res.ok) {
        alert('Permissions saved successfully!');
      } else {
        alert('Failed to save permissions');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  if (loading) return <div>Loading system lists...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Roles Matrix List */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--foreground)' }}>Role-Based Access Control</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Configure permissions for each role. Check the box to grant access to a module.
            </p>
          </div>
          <button 
            onClick={savePermissions}
            disabled={savingPermissions}
            style={{ 
              padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', 
              borderRadius: '4px', cursor: savingPermissions ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
              opacity: savingPermissions ? 0.7 : 1
            }}
          >
            <Save size={16} /> {savingPermissions ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', maxWidth: '400px' }}>
          <input 
            type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
            placeholder="New role name (e.g. Receptionist)" 
            style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
            onKeyDown={e => e.key === 'Enter' && addListEntry('role', newRoleName)}
          />
          <button 
            onClick={() => addListEntry('role', newRoleName)}
            style={{ padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Add Role
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '2px solid var(--border)', width: '200px' }}>Module / Feature</th>
              {roles.map(r => (
                <th key={r.id} style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '2px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {r.name}
                    {!['System Admin', 'Scheduler'].includes(r.name) && (
                      <button onClick={() => deleteListEntry('role', r.id)} style={{ padding: '0', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} title="Delete Role">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {APP_MODULES.map((mod, i) => (
              <tr key={mod.key} style={{ backgroundColor: i % 2 === 0 ? 'var(--background)' : 'transparent' }}>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{mod.label}</td>
                {roles.map(r => {
                  const isLockedAdmin = r.name === 'System Admin';
                  const isChecked = rolePermissions[r.id]?.has(mod.key) || isLockedAdmin;
                  return (
                    <td key={r.id} style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        disabled={isLockedAdmin}
                        onChange={() => togglePermission(r.id, mod.key)}
                        style={{ cursor: isLockedAdmin ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modalities List */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--foreground)' }}>Modalities</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Configure the list of modalities that can be assigned to staff members.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            type="text" value={newModalityName} onChange={e => setNewModalityName(e.target.value)}
            placeholder="New modality (e.g. Ultrasound)" 
            style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
            onKeyDown={e => e.key === 'Enter' && addListEntry('modality', newModalityName)}
          />
          <button 
            onClick={() => addListEntry('modality', newModalityName)}
            style={{ padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Add Modality
          </button>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {modalities.map(m => (
            <li key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{m.name}</span>
              <button 
                onClick={() => deleteListEntry('modality', m.id)}
                style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
          {modalities.length === 0 && <li style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No modalities defined.</li>}
        </ul>
      </div>

    </div>
  );
}
