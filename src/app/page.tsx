'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RosterGrid from '@/components/RosterGrid';
import StaffDirectory from '@/components/StaffDirectory';
import { ChevronLeft, ChevronRight, LogOut, Users, Printer } from 'lucide-react';

export type User = {
  id: string;
  abbreviation: string;
  fullName: string;
  role: string;
  accessLevel?: string;
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
  
  const [filterUserId, setFilterUserId] = useState<string>('');
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Filter:</span>
              <select 
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.875rem' }}
              >
                <option value="">All Staff</option>
                {data.users.map(u => (
                  <option key={u.id} value={u.id}>{u.abbreviation} - {u.fullName}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right', marginRight: '0.5rem' }}>
            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{currentUser.fullName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {currentUser.accessLevel}
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
          <button 
            onClick={handleLogout}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
              backgroundColor: '#fee2e2', color: 'var(--danger)',
              borderRadius: '6px', fontWeight: 500
            }}>
            <LogOut size={18} />
            <span className="hidden-mobile">Logout</span>
          </button>
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
            filterUserId={filterUserId}
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
