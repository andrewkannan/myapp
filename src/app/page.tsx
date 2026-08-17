'use client';

import { useEffect, useState } from 'react';
import RosterGrid from '@/components/RosterGrid';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

export type User = {
  id: string;
  abbreviation: string;
  fullName: string;
  role: string;
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const fetchRoster = async (y: number, m: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/roster?year=${y}&month=${m}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster(year, month);
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

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
        </div>

        <button style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.5rem 1rem', 
          backgroundColor: 'var(--primary-light)', 
          color: 'var(--primary)',
          borderRadius: '6px',
          fontWeight: 500
        }}>
          <Users size={18} />
          <span>Staff Directory</span>
        </button>
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
            onRefresh={() => fetchRoster(year, month)}
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
