'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export function FacilityManager() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLocName, setNewLocName] = useState('');
  const [newStationNames, setNewStationNames] = useState<Record<string, string>>({});

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      setLocations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAddLocation = async () => {
    if (!newLocName.trim()) return;
    await fetch('/api/locations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newLocName })
    });
    setNewLocName('');
    fetchLocations();
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Delete location? This will delete all its stations and assignments!')) return;
    await fetch(`/api/locations?id=${id}`, { method: 'DELETE' });
    fetchLocations();
  };

  const handleAddStation = async (locationId: string) => {
    const name = newStationNames[locationId];
    if (!name?.trim()) return;
    await fetch('/api/stations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, locationId })
    });
    setNewStationNames(prev => ({ ...prev, [locationId]: '' }));
    fetchLocations();
  };

  const handleDeleteStation = async (id: string) => {
    if (!confirm('Delete station? This deletes all assignments linked to it!')) return;
    await fetch(`/api/stations?id=${id}`, { method: 'DELETE' });
    fetchLocations();
  };

  if (loading) return <div>Loading facilities...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Facility Management</h2>
      </div>

      <div style={{ backgroundColor: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Add New Location</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" placeholder="Location Name (e.g., Novena, Orchard)" 
            value={newLocName} onChange={e => setNewLocName(e.target.value)}
            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
          />
          <button onClick={handleAddLocation} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {locations.map(loc => (
          <div key={loc.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--surface)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--header-bg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{loc.name}</h3>
              <button onClick={() => handleDeleteLocation(loc.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={16} /></button>
            </div>
            
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {loc.stations.map((st: any) => (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '99px', fontSize: '0.875rem', fontWeight: 600 }}>
                    {st.name}
                    <button onClick={() => handleDeleteStation(st.id)} style={{ display: 'flex', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
                  </div>
                ))}
                {loc.stations.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No stations added yet.</span>}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '300px' }}>
                <input 
                  type="text" placeholder="New Station Name" 
                  value={newStationNames[loc.id] || ''}
                  onChange={e => setNewStationNames(prev => ({ ...prev, [loc.id]: e.target.value }))}
                  style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
                />
                <button onClick={() => handleAddStation(loc.id)} style={{ padding: '0.4rem 0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>
                  Add Station
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}
