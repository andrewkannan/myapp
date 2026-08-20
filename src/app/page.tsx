'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Select from 'react-select';
import { useRouter } from 'next/navigation';
import RosterGrid from '@/components/RosterGrid';
import { ChevronLeft, ChevronRight, LogOut, Printer, Settings, Activity, MoreVertical, Filter } from 'lucide-react';

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
  publicHolidays?: { id: string; date: string; name: string }[];
};

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [filterUserIds, setFilterUserIds] = useState<string[]>([]);
  const [modalityFilter, setModalityFilter] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
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
  const month = currentDate.getMonth() + 1; // 1-12

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const { user } = await res.json();
          const roles = (user.role || '').toLowerCase();
          const isTargetRole = roles.includes('radiographer') || roles.includes('sonographer');
          const urlParams = new URLSearchParams(window.location.search);
          const forceGrid = urlParams.get('view') === 'grid';
          
          if (isTargetRole && window.innerWidth <= 768 && !forceGrid) {
            router.push('/schedule');
            return;
          }
          setCurrentUser(user);
        } else {
          router.push('/login');
        }
      } catch (err) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
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
      const res = await fetch(`/api/roster?year=${y}&month=${m}`);
      if (!res.ok) throw new Error('Failed to load roster');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchRoster(year, month, true);
      const interval = setInterval(() => {
        fetchRoster(year, month, false);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [year, month, currentUser]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  if (!currentUser) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        padding: '0.5rem 0.75rem', 
        borderBottom: '1px solid var(--border)', 
        backgroundColor: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: '0.25rem'
      }}>
        {/* Logo */}
        <img src="/asiamedic-logo.png" alt="AsiaMedic" style={{ height: '32px', width: 'auto', flexShrink: 0 }} />

        {/* Month nav - compact */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          <button 
            onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
            className="btn btn-secondary"
            style={{ padding: '0.3rem', border: 'none', background: 'none' }}
          >
            <ChevronLeft size={18} />
          </button>
          
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, minWidth: '60px', textAlign: 'center', color: 'var(--foreground)', whiteSpace: 'nowrap', margin: 0 }}>
            {currentDate.toLocaleString('default', { month: 'short' })} {String(year).slice(2)}
          </h2>

          <button 
            onClick={() => setCurrentDate(new Date(year, month, 1))}
            className="btn btn-secondary"
            style={{ padding: '0.3rem', border: 'none', background: 'none' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Right section: filter + user + menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {loading && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>...</span>}

          {data && (
            <div style={{ position: 'relative' }} ref={filterRef}>
              <button 
                onClick={() => setFilterOpen(!filterOpen)}
                className={`btn ${filterUserIds.length > 0 || modalityFilter.length > 0 ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
              >
                <Filter size={18} />
                {(filterUserIds.length > 0 || modalityFilter.length > 0) && (
                  <span style={{ 
                    position: 'absolute', top: '-4px', right: '-4px',
                    backgroundColor: 'var(--danger, #ef4444)', color: 'white',
                    width: '16px', height: '16px', borderRadius: '50%',
                    fontSize: '0.6rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {(filterUserIds.length > 0 ? 1 : 0) + (modalityFilter.length > 0 ? 1 : 0)}
                  </span>
                )}
              </button>

              {filterOpen && (
                <div className="glass-popover" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', width: '300px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 100 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Modality</label>
                    <Select
                      isMulti
                      options={Array.from(new Set(data.users.flatMap(u => (u.modality || '').split(',').map(m => m.trim())).filter(Boolean))).sort().map(mod => ({ value: mod, label: mod }))}
                      value={modalityFilter.map(m => ({ value: m, label: m }))}
                      onChange={(selected) => setModalityFilter(selected ? selected.map((s: any) => s.value) : [])}
                      placeholder="Select modalities..."
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Staff Select</label>
                    <Select
                      isMulti
                      options={data.users.map(u => ({ value: u.id, label: `${u.abbreviation || '?'} - ${u.fullName}` }))}
                      value={data.users
                        .filter(u => filterUserIds.includes(u.id))
                        .map(u => ({ value: u.id, label: `${u.abbreviation || '?'} - ${u.fullName}` }))}
                      onChange={(selected) => setFilterUserIds(selected ? selected.map((s: any) => s.value) : [])}
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

                  {(filterUserIds.length > 0 || modalityFilter.length > 0) && (
                    <button 
                      onClick={() => {
                        setFilterUserIds([]);
                        setModalityFilter([]);
                      }}
                      className="btn btn-ghost" 
                      style={{ width: '100%', color: 'var(--danger)', marginTop: '0.5rem' }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
            {currentUser.fullName?.split(' ')[0] || currentUser.fullName}
          </div>

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
              <MoreVertical size={18} />
            </button>
            {settingsOpen && (
              <div className="glass-popover" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', minWidth: '200px' }}>
                <button 
                  onClick={() => { setSettingsOpen(false); router.push('/leaves'); }} 
                  className="dropdown-item"
                >
                  <Activity size={16} /> My Requests
                </button>
                <button 
                  onClick={() => { setSettingsOpen(false); window.print(); }} 
                  className="dropdown-item"
                >
                  <Printer size={16} /> Print A3
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.25rem 0' }}></div>
                {currentUser.permissions?.some(p => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE', 'AUDIT_VIEW'].includes(p)) && (
                  <button 
                    onClick={() => { setSettingsOpen(false); window.location.href = '/admin'; }} 
                    className="dropdown-item"
                  >
                    <Settings size={16} /> Admin Dashboard
                  </button>
                )}
                {currentUser.permissions?.some(p => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE', 'AUDIT_VIEW'].includes(p)) && <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.25rem 0' }}></div>}
                <button 
                  onClick={handleLogout} 
                  className="dropdown-item danger"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading roster data...</p>
          </div>
        ) : data ? (
          <RosterGrid 
            data={data} 
            year={year} 
            month={month} 
            currentUser={currentUser}
            filterUserIds={effectiveFilterIds}
            activeModalities={modalityFilter}
            onRefresh={() => fetchRoster(year, month, false)}
          />
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--danger)' }}>Failed to load roster data.</p>
          </div>
        )}
      </section>

    </main>
  );
}
