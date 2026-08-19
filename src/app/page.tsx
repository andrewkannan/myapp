'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Select from 'react-select';
import { useRouter } from 'next/navigation';
import RosterGrid from '@/components/RosterGrid';
import { ChevronLeft, ChevronRight, LogOut, Printer, Settings, Activity, MoreVertical } from 'lucide-react';

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
  const [modalityFilter, setModalityFilter] = useState<string>('All');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const effectiveFilterIds = useMemo(() => {
    let ids = new Set<string>();
    if (filterUserIds.length > 0) {
      filterUserIds.forEach(id => ids.add(id));
    }
    if (modalityFilter !== 'All' && data) {
      data.users.forEach(u => {
        if (u.modality && u.modality.includes(modalityFilter)) {
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
          if (isTargetRole && window.innerWidth <= 768) {
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

  const fetchRoster = async (y: number, m: number, force = false) => {
    try {
      if (force) setLoading(true);
      const res = await fetch(`/api/roster?year=${y}&month=${m}`);
      if (!res.ok) throw new Error('Failed to load roster');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchRoster(year, month);
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
            AsiaMedic Roster
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setCurrentDate(new Date(year, month - 2, 1))}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={18} />
            </button>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, minWidth: '140px', textAlign: 'center' }}>
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button 
              onClick={() => setCurrentDate(new Date(year, month, 1))}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          
          {/* Filters */}
          {data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Modality:</span>
                <select 
                  value={modalityFilter}
                  onChange={e => setModalityFilter(e.target.value)}
                  style={{ 
                    padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', 
                    fontSize: '0.875rem', outline: 'none', backgroundColor: 'var(--surface)' 
                  }}
                >
                  <option value="All">All Modalities</option>
                  {['MRI', 'CT', 'US', 'X-Ray', 'PET/CT', 'Mammo', 'BMD'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Modality:</span>
                <select 
                  className="input-field" 
                  value={modalityFilter} 
                  onChange={e => setModalityFilter(e.target.value)}
                  style={{ minWidth: '120px' }}
                >
                  <option value="All">All Modalities</option>
                  {Array.from(new Set(data.users.flatMap(u => (u.modality || '').split(',').map(m => m.trim())).filter(Boolean))).sort().map(mod => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '350px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Staff Filter:</span>
                <div style={{ flex: 1, zIndex: 50 }}>
                  <Select
                    isMulti
                    options={data.users.map(u => ({ value: u.id, label: `${u.abbreviation || '?'} - ${u.fullName}` }))}
                    value={data.users
                      .filter(u => filterUserIds.includes(u.id))
                      .map(u => ({ value: u.id, label: `${u.abbreviation || '?'} - ${u.fullName}` }))}
                    onChange={(selected) => setFilterUserIds(selected.map(s => s.value))}
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
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{currentUser.fullName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {currentUser.role || 'Staff'}
            </div>
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
            onRefresh={() => fetchRoster(year, month, true)}
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
