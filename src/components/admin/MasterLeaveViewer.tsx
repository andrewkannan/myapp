'use client';

import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ToastProvider';
import { Calendar } from 'lucide-react';

export function MasterLeaveViewer() {
  const { toast } = useToast();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, [year]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaves/master?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setLeaves(data.leaves || []);
      } else {
        toast('Failed to load master leave data', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Failed to load master leave data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const leavesByKey = useMemo(() => {
    const map = new Map<string, typeof leaves>();
    for (const leave of leaves) {
      const d = new Date(leave.date);
      const key = `${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(leave);
    }
    return map;
  }, [leaves]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Master Leave Overview</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Yearly view of all staff leave.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Year:</label>
          <input 
            type="number" 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            className="input-field"
            style={{ width: '100px', textAlign: 'center' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ flex: 1, width: '100%', borderRadius: '8px' }}></div>
      ) : (
        <div className="premium-table-wrapper" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '1800px', width: '100%', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <tr>
                <th style={{ border: '1px solid var(--border)', padding: '0.5rem', width: '60px', backgroundColor: 'var(--header-bg)', position: 'sticky', left: 0, zIndex: 20 }}>Month</th>
                {days.map(d => (
                  <th key={d} style={{ border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', minWidth: '55px' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((monthName, mIndex) => {
                // Get number of days in this month
                const daysInMonth = new Date(year, mIndex + 1, 0).getDate();
                
                return (
                  <tr key={monthName}>
                    <td style={{ 
                      border: '1px solid var(--border)', padding: '0.5rem', fontWeight: 'bold', 
                      position: 'sticky', left: 0, backgroundColor: 'var(--surface)', zIndex: 5, textAlign: 'center'
                    }}>
                      {monthName}
                    </td>
                    {days.map(d => {
                      if (d > daysInMonth) {
                        return <td key={d} style={{ border: '1px solid var(--border)', backgroundColor: '#f3f4f6' }}></td>;
                      }

                      const cellLeaves = leavesByKey.get(`${mIndex}-${d}`) || [];

                      const isWeekend = new Date(year, mIndex, d).getDay() === 0 || new Date(year, mIndex, d).getDay() === 6;

                      return (
                        <td key={d} style={{ 
                          border: '1px solid var(--border)', 
                          padding: '2px', 
                          verticalAlign: 'top',
                          backgroundColor: isWeekend ? 'var(--weekend-bg)' : 'transparent',
                          minHeight: '40px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {cellLeaves.map(leave => (
                              <div key={leave.id} style={{
                                backgroundColor: leave.status === 'APPROVED' ? '#DBEAFE' : '#FEF3C7',
                                color: leave.status === 'APPROVED' ? '#1E40AF' : '#92400E',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textAlign: 'center'
                              }} title={leave.user?.fullName || leave.user?.abbreviation}>
                                {leave.period === 'AM' && <span style={{ color: '#0369a1', marginRight: '2px' }}>am</span>}
                                {leave.period === 'PM' && <span style={{ color: '#c2410c', marginRight: '2px' }}>pm</span>}
                                {leave.user?.abbreviation || 'Unk'}
                                {!['AL', 'OFF', 'MC'].includes(leave.type) && <span style={{ color: '#6b7280', marginLeft: '2px', fontSize: '0.5rem' }}>{leave.type}</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
