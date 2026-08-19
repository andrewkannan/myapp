'use client';

import { useState, useEffect } from 'react';

export function TimeOffManager() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  useEffect(() => {
    fetchRecords();
  }, [filter]);

  const fetchRecords = async () => {
    setLoading(true);
    const res = await fetch(`/api/time-off/admin${filter === 'PENDING' ? '' : '?all=true'}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data);
    }
    setLoading(false);
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this request?`)) return;
    
    const res = await fetch('/api/time-off/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });

    if (res.ok) {
      fetchRecords();
    } else {
      alert('Failed to update record');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>Time-Off & Overtime Approvals</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Review and approve staff time-off claims and logged overtime.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            style={{ 
              padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer',
              backgroundColor: filter === 'PENDING' ? 'var(--primary)' : 'var(--surface)',
              color: filter === 'PENDING' ? 'white' : 'var(--text)'
            }}
            onClick={() => setFilter('PENDING')}>Pending</button>
          <button 
            style={{ 
              padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer',
              backgroundColor: filter === 'ALL' ? 'var(--primary)' : 'var(--surface)',
              color: filter === 'ALL' ? 'white' : 'var(--text)'
            }}
            onClick={() => setFilter('ALL')}>All Records</button>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>STAFF</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>DATE</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>REASON</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>TIME</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>HOURS</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>{r.user?.fullName || r.user?.abbreviation}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{new Date(r.date).toLocaleDateString('en-GB')}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                  {r.reason} {r.studyAccNo && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>#{r.studyAccNo}</span>}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : '-'}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: 'bold', color: r.hours < 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {r.hours > 0 ? '+' : ''}{r.hours} HRS
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '9999px',
                    backgroundColor: r.status === 'APPROVED' ? '#dcfce7' : r.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                    color: r.status === 'APPROVED' ? '#166534' : r.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                  }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  {r.status === 'PENDING' && (
                    <>
                      <button 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0', color: '#166534', backgroundColor: 'transparent', cursor: 'pointer' }}
                        onClick={() => handleAction(r.id, 'APPROVED')}>Approve</button>
                      <button 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #fecaca', color: '#991b1b', backgroundColor: 'transparent', cursor: 'pointer' }}
                        onClick={() => handleAction(r.id, 'REJECTED')}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
