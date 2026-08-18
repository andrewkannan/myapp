'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';

type SystemRole = { id: string; name: string };
type SystemModality = { id: string; name: string };

export function SystemListManager() {
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [modalities, setModalities] = useState<SystemModality[]>([]);
  
  const [newRoleName, setNewRoleName] = useState('');
  const [newModalityName, setNewModalityName] = useState('');
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div>Loading system lists...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      
      {/* Roles List */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--foreground)' }}>Staff Roles</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Configure the list of roles that can be assigned to staff members.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
            placeholder="New role name (e.g. Receptionist)" 
            style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
            onKeyDown={e => e.key === 'Enter' && addListEntry('role', newRoleName)}
          />
          <button 
            onClick={() => addListEntry('role', newRoleName)}
            style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Add
          </button>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {roles.map(r => (
            <li key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '4px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{r.name}</span>
              <button 
                onClick={() => deleteListEntry('role', r.id)}
                style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
          {roles.length === 0 && <li style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No roles defined.</li>}
        </ul>
      </div>

      {/* Modalities List */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
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
            style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Add
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
