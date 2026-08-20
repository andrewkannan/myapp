'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Save } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

type SystemRole = { id: string; name: string; permissions: string | null };
type SystemModality = { id: string; name: string };

const APP_MODULES = [
  { key: 'ROSTER_VIEW', label: 'View Roster' },
  { key: 'ROSTER_EDIT', label: 'Edit Roster' },
  { key: 'SCHEDULE_VIEW', label: 'View My Schedule' },
  { key: 'LEAVE_SUBMIT', label: 'Submit Leave' },
  { key: 'LEAVE_APPROVE', label: 'Approve/Reject Leave' },
  { key: 'LEAVE_VIEW_ALL', label: 'View All Leaves' },
  { key: 'TIMEOFF_SUBMIT', label: 'Submit Time-Off' },
  { key: 'TIMEOFF_APPROVE', label: 'Approve/Reject Time-Off' },
  { key: 'BULK_UPLOAD', label: 'Bulk Data Upload' },
  { key: 'STAFF_MANAGE', label: 'Manage Staff' },
  { key: 'FACILITY_MANAGE', label: 'Manage Facilities' },
  { key: 'ROLE_MANAGE', label: 'Access Control' },
  { key: 'AUDIT_VIEW', label: 'Audit Logs' },
];

export function SystemListManager() {
  const { toast, confirm } = useToast();
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
      toast('Failed to load system lists', 'error');
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
        toast(`${type === 'role' ? 'Role' : 'Modality'} added`, 'success');
      } else {
        toast(`Failed to add ${type}`, 'error');
      }
    } catch (e) {
      console.error(e);
      toast(`Failed to add ${type}`, 'error');
    }
  };

  const deleteListEntry = async (type: 'role' | 'modality', id: string) => {
    if (!await confirm('Are you sure you want to delete this item?')) return;
    try {
      await fetch(`/api/system-lists?type=${type}&id=${id}`, { method: 'DELETE' });
      fetchLists();
      toast('Item deleted', 'success');
    } catch (e) {
      console.error(e);
      toast('Failed to delete item', 'error');
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
      const updates = roles.map(r => ({
        id: r.id,
        permissions: Array.from(rolePermissions[r.id] || []).join(',')
      }));
      
      const res = await fetch('/api/system-lists/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: updates })
      });
      
      if (res.ok) {
        toast('Permissions saved successfully', 'success');
        fetchLists();
      } else {
        toast('Failed to save permissions', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Failed to save permissions', 'error');
    } finally {
      setSavingPermissions(false);
    }
  };

  if (loading) return <div className="skeleton" style={{ height: '400px', width: '100%' }}></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>System Lists & Access Roles</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Roles List */}
        <div className="premium-table-wrapper" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Roles</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input 
              type="text" placeholder="New Role Name" 
              value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
              className="input-field"
            />
            <button onClick={() => addListEntry('role', newRoleName)} className="btn btn-primary">
              <Plus size={16} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {roles.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{r.name}</span>
                {r.name !== 'System Admin' && (
                  <button onClick={() => deleteListEntry('role', r.id)} className="btn-ghost" style={{ padding: '0.25rem', color: 'var(--danger)', borderRadius: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modalities List */}
        <div className="premium-table-wrapper" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Modalities</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input 
              type="text" placeholder="New Modality Name" 
              value={newModalityName} onChange={e => setNewModalityName(e.target.value)}
              className="input-field"
            />
            <button onClick={() => addListEntry('modality', newModalityName)} className="btn btn-primary">
              <Plus size={16} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {modalities.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.name}</span>
                <button onClick={() => deleteListEntry('modality', m.id)} className="btn-ghost" style={{ padding: '0.25rem', color: 'var(--danger)', borderRadius: '4px' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Access Permissions Matrix</h3>
          <button 
            onClick={savePermissions} 
            disabled={savingPermissions}
            className="btn btn-primary"
          >
            <Save size={16} /> {savingPermissions ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
        
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Module / Permission</th>
                {roles.map(r => (
                  <th key={r.id} style={{ textAlign: 'center' }}>{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {APP_MODULES.map(mod => (
                <tr key={mod.key}>
                  <td style={{ fontWeight: 500 }}>{mod.label}</td>
                  {roles.map(r => {
                    const hasPerm = rolePermissions[r.id]?.has(mod.key) || false;
                    const isLocked = r.name === 'System Admin';
                    return (
                      <td key={r.id} style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={hasPerm}
                          onChange={() => togglePermission(r.id, mod.key)}
                          disabled={isLocked}
                          style={{ cursor: isLocked ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
