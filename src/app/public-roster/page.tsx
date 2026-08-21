'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Select from 'react-select';
import { useRouter } from 'next/navigation';
import RosterGrid from '@/components/RosterGrid';
import { ChevronLeft, ChevronRight, Printer, Filter } from 'lucide-react';

export type User = {
  id: string;
  abbreviation: string;
  fullName: string;
  role: string;
  permissions?: string[];
  email?: string;
  modality?: string;
  isActive?: boolean;
  ssoEnabled?: boolean;
  lastLoginAt?: string | null;
};

export type Location = {
  id: string;
  name: string;
};

export type Station = {
  id: string;
  name: string;
  locationId: string;
};

export type Shift = {
  id: string;
  date: string;
  userId: string;
  stationId: string | null;
  status: string;
  shiftPeriod: string;
  remarks: string | null;
  user: User;
  station: Station | null;
};

export type Leave = {
  id: string;
  userId: string;
  date: string;
  period: string;
  type: string;
  status: string;
  remarks: string | null;
  user: User;
};

export type RosterData = {
  locations: Location[];
  stations: Station[];
  users: User[];
  shifts: Shift[];
  leaves: Leave[];
  modalities?: string[];
  publicHolidays?: { id: string; date: string; name: string }[];
};

export default function PublicRoster() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [filterUserIds, setFilterUserIds] = useState<string[]>([]);
  const [modalityFilter, setModalityFilter] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const effectiveFilterIds = useMemo(() => {
    let ids = new Set<string>();
    if (filterUserIds.length > 0) {
      filterUserIds.forEach(id => ids.add(id));
    }
    if (modalityFilter.length > 0 && data) {
      data.users.forEach(u => {
        if (u.modality && modalityFilter.some(m => u.modality!.includes(m))) {
          ids.add(u.id);
        }
      });
    }
    return Array.from(ids);
  }, [filterUserIds, modalityFilter, data]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRoster = async (y: number, m: number, showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const res = await fetch(`/api/roster/public?year=${y}&month=${m}`);
      if (!res.ok) throw new Error('Failed to load roster');
      const json = await res.json();
      setData(prev => {
        if (!prev) return json;
        if (JSON.stringify(prev) === JSON.stringify(json)) return prev;
        return json;
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster(year, month, true);
    const interval = setInterval(() => {
      fetchRoster(year, month, false);
    }, 15000);
    return () => clearInterval(interval);
  }, [year, month]);

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        padding: '1rem 1.5rem', 
        borderBottom: '1px solid var(--border)', 
        backgroundColor: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>
            AsiaMedic Roster (View Only)
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
              className="btn btn-secondary"
              style={{ padding: '0.4rem', border: '1px solid transparent' }}
            >
              <ChevronLeft size={20} />
            </button>
            
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, minWidth: '140px', textAlign: 'center', color: 'var(--foreground)' }}>
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>

            <button 
              onClick={() => setCurrentDate(new Date(year, month, 1))}
              className="btn btn-secondary"
              style={{ padding: '0.4rem', border: '1px solid transparent' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {loading && <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading...</span>}

          <div style={{ position: 'relative' }} ref={filterRef}>
            <button 
              onClick={() => setFilterOpen(!filterOpen)} 
              className="btn btn-secondary"
              title="Filter by Modality or Staff"
              style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: (filterUserIds.length > 0 || modalityFilter.length > 0) ? '#eff6ff' : 'transparent', border: (filterUserIds.length > 0 || modalityFilter.length > 0) ? '1px solid #bfdbfe' : '1px solid transparent', color: (filterUserIds.length > 0 || modalityFilter.length > 0) ? '#2563eb' : 'inherit' }}
            >
              <Filter size={18} />
              {(filterUserIds.length > 0 || modalityFilter.length > 0) && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Active</span>
              )}
            </button>
            {filterOpen && data && (
              <div className="animate-menu" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
                padding: '1rem', width: '320px', zIndex: 100,
                boxShadow: '0 10px 40px var(--shadow-color)'
              }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#111827' }}>Filter Staff</h3>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>By Modality</label>
                  <Select
                    isMulti
                    options={(data.modalities || []).map(mod => ({ value: mod, label: mod }))}
                    value={modalityFilter.map(m => ({ value: m, label: m }))}
                    onChange={(selected) => setModalityFilter(selected ? selected.map((s: any) => s.value) : [])}
                    placeholder="Select modalities..."
                    styles={{
                      control: (base) => ({ ...base, fontSize: '0.875rem', borderRadius: '8px', borderColor: '#d1d5db' }),
                      menu: (base) => ({ ...base, fontSize: '0.875rem' })
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>By Name</label>
                  <Select
                    isMulti
                    options={data.users.map(u => ({ value: u.id, label: u.fullName || u.abbreviation }))}
                    value={data.users.filter(u => filterUserIds.includes(u.id)).map(u => ({ value: u.id, label: u.fullName || u.abbreviation }))}
                    onChange={(selected) => setFilterUserIds(selected ? selected.map((s: any) => s.value) : [])}
                    placeholder="Select specific staff..."
                    styles={{
                      control: (base) => ({ ...base, fontSize: '0.875rem', borderRadius: '8px', borderColor: '#d1d5db' }),
                      menu: (base) => ({ ...base, fontSize: '0.875rem' })
                    }}
                  />
                </div>

                {(filterUserIds.length > 0 || modalityFilter.length > 0) && (
                  <button 
                    onClick={() => { setFilterUserIds([]); setModalityFilter([]); }}
                    style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--surface-hover)', color: '#4b5563', border: 'none', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>

          <button onClick={() => window.print()} className="btn btn-secondary print-hide" style={{ padding: '0.5rem' }}>
            <Printer size={18} />
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflow: 'hidden', backgroundColor: 'var(--surface-hover)' }}>
        {!data ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? 'Loading roster data...' : 'Failed to load data'}
          </div>
        ) : (
          <RosterGrid 
            data={data} 
            year={year} 
            month={month} 
            onRefresh={() => fetchRoster(year, month, true)}
            currentUser={{ id: 'public', abbreviation: 'PUB', fullName: 'Public Viewer', role: 'VIEWER' } as any}
            filterUserIds={effectiveFilterIds}
            activeModalities={modalityFilter}
          />
        )}
      </div>
    </main>
  );
}
