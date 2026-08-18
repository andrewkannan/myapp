'use client';

import { useEffect, useState, useRef } from 'react';
import Select from 'react-select';
import { useRouter } from 'next/navigation';
import RosterGrid from '@/components/RosterGrid';
import StaffDirectory from '@/components/StaffDirectory';
import { ChevronLeft, ChevronRight, LogOut, Users, Printer, Settings } from 'lucide-react';

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

export type RosterData = {
  locations: Location[];
  stations: Station[];
  users: User[];
  shifts: Shift[];
};

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [filterUserIds, setFilterUserIds] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const { user } = await res.json();
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

  const fetchRoster = async (y: number, m: number, isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch(`/api/roster?year=${y}&month=${m}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchRoster(year, month);
    }
  }, [year, month, currentUser]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month, 1));

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
              onClick={handlePrevMonth}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={18} />
            </button>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, minWidth: '140px', textAlign: 'center' }}>
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button 
              onClick={handleNextMonth}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          
          {/* Filter Dropdown */}
          {data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '350px' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Filter:</span>
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
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{currentUser.fullName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {currentUser.role || 'Staff'}
            </div>
          </div>


          <button
            onClick={() => setDirectoryOpen(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
              backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
              borderRadius: '6px', fontWeight: 500, border: '1px solid transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}
          >
            <Users size={18} />
            <span className="hidden-mobile">Directory</span>
          </button>
          <button
            onClick={() => window.print()}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
              backgroundColor: '#f0fdf4', color: '#166534',
              borderRadius: '6px', fontWeight: 500, border: '1px solid transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#166534'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f0fdf4'; e.currentTarget.style.color = '#166534'; }}
          >
            <Printer size={18} />
            <span className="hidden-mobile">Print A3</span>
          </button>
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
              <Settings size={18} />
            </button>
            {settingsOpen && (
              <div style={{ 
                position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', 
                backgroundColor: 'var(--surface)', border: '1px solid var(--border)', 
                borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
                zIndex: 100, minWidth: '200px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'
              }}>
                {currentUser.permissions?.some(p => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE', 'AUDIT_VIEW'].includes(p)) && (
                  <button 
                    onClick={() => window.location.href = '/admin'} 
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 500 }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Admin Dashboard
                  </button>
                )}
                {currentUser.permissions?.some(p => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE', 'AUDIT_VIEW'].includes(p)) && <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.25rem 0' }}></div>}
                <button 
                  onClick={handleLogout} 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--danger)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: 500 }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
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
            filterUserIds={filterUserIds}
            onRefresh={() => fetchRoster(year, month, true)}
          />
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--danger)' }}>Failed to load roster data.</p>
          </div>
        )}
      </section>

      {directoryOpen && data && (
        <StaffDirectory
          users={data.users}
          onClose={() => setDirectoryOpen(false)}
        />
      )}
    </main>
  );
}
