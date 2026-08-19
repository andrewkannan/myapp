'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export function FacilityManager() {
  const { toast, confirm } = useToast();
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
      toast('Failed to load facilities', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAddLocation = async () => {
    if (!newLocName.trim()) return;
    try {
      await fetch('/api/locations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newLocName })
      });
      setNewLocName('');
      fetchLocations();
      toast('Location added', 'success');
    } catch (e) {
      toast('Failed to add location', 'error');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!await confirm('Delete location? This will delete all its stations and assignments!')) return;
    try {
      await fetch(`/api/locations?id=${id}`, { method: 'DELETE' });
      fetchLocations();
      toast('Location deleted', 'success');
    } catch (e) {
      toast('Failed to delete location', 'error');
    }
  };

  const handleAddStation = async (locationId: string) => {
    const name = newStationNames[locationId];
    if (!name?.trim()) return;
    try {
      await fetch('/api/stations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, locationId })
      });
      setNewStationNames(prev => ({ ...prev, [locationId]: '' }));
      fetchLocations();
      toast('Station added', 'success');
    } catch (e) {
      toast('Failed to add station', 'error');
    }
  };

  const handleDeleteStation = async (id: string) => {
    if (!await confirm('Delete station? This deletes all assignments linked to it!')) return;
    try {
      await fetch(`/api/stations?id=${id}`, { method: 'DELETE' });
      fetchLocations();
      toast('Station deleted', 'success');
    } catch (e) {
      toast('Failed to delete station', 'error');
    }
  };

  if (loading) return <div className="skeleton" style={{ height: '400px', width: '100%' }}></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Facility Management</h2>
      </div>

      <div className="premium-table-wrapper" style={{ padding: '1rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Add New Location</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" placeholder="Location Name (e.g., Novena, Orchard)" 
            value={newLocName} onChange={e => setNewLocName(e.target.value)}
            className="input-field"
          />
          <button onClick={handleAddLocation} className="btn btn-primary">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {locations.map(loc => (
          <div key={loc.id} className="premium-table-wrapper">
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(248, 250, 252, 0.5)' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{loc.name}</h3>
              <button onClick={() => handleDeleteLocation(loc.id)} className="btn-ghost" style={{ padding: '0.25rem', color: 'var(--danger)', borderRadius: '4px' }}><Trash2 size={16} /></button>
            </div>
            
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {loc.stations.map((st: any) => (
                  <div key={st.id} className="badge badge-info" style={{ gap: '0.25rem', padding: '0.25rem 0.5rem' }}>
                    {st.name}
                    <button onClick={() => handleDeleteStation(st.id)} style={{ display: 'flex', background: 'transparent', border: 'none', color: 'currentColor', cursor: 'pointer', padding: 0, opacity: 0.6 }}><X size={12} /></button>
                  </div>
                ))}
                {loc.stations.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No stations added yet.</span>}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '300px' }}>
                <input 
                  type="text" placeholder="New Station Name" 
                  value={newStationNames[loc.id] || ''}
                  onChange={e => setNewStationNames(prev => ({ ...prev, [loc.id]: e.target.value }))}
                  className="input-field"
                />
                <button onClick={() => handleAddStation(loc.id)} className="btn btn-secondary">
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
