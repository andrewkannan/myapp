'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { Clock } from 'lucide-react';

export function TimeOffManager() {
  const { toast, confirm } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [filter]);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/time-off/admin${filter === 'PENDING' ? '' : '?all=true'}`);
      if (!res.ok) throw new Error('Failed to fetch records');
      const data = await res.json();
      setRecords(data);
    } catch (err: any) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!await confirm(`Are you sure you want to ${status.toLowerCase()} this request?`)) return;
    
    const res = await fetch('/api/time-off/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });

    if (res.ok) {
      toast(`Request ${status.toLowerCase()}`, 'success');
      fetchRecords();
    } else {
      toast('Failed to update record', 'error');
    }
  };

  if (loading && records.length === 0) return <div className="skeleton" style={{ height: '400px', width: '100%' }}></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>Time-Off & Overtime Approvals</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Review and approve staff time-off claims and logged overtime.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--surface)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button 
            className={`btn ${filter === 'PENDING' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 1rem' }}
            onClick={() => setFilter('PENDING')}>Pending</button>
          <button 
            className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 1rem' }}
            onClick={() => setFilter('ALL')}>All Records</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: 'var(--danger-text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={fetchRecords} className="btn btn-danger">Retry</button>
        </div>
      )}

      <div className="premium-table-wrapper">
        <table className="premium-table">
          <thead>
            <tr>
              <th>STAFF</th>
              <th>DATE</th>
              <th>REASON</th>
              <th>TIME</th>
              <th style={{ textAlign: 'right' }}>HOURS</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.user?.fullName || r.user?.abbreviation}</td>
                <td>{new Date(r.date).toLocaleDateString('en-GB')}</td>
                <td>
                  {r.reason} {r.studyAccNo && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>#{r.studyAccNo}</span>}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : '-'}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: r.hours < 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {r.hours > 0 ? '+' : ''}{r.hours} HRS
                </td>
                <td>
                  <span className={r.status === 'APPROVED' ? 'badge badge-success' : r.status === 'REJECTED' ? 'badge badge-danger' : 'badge badge-warning'}>
                    {r.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  {r.status === 'PENDING' && (
                    <>
                      <button 
                        className="btn-ghost"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--success-text)' }}
                        onClick={() => handleAction(r.id, 'APPROVED')}>Approve</button>
                      <button 
                        className="btn-ghost"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--danger-text)' }}
                        onClick={() => handleAction(r.id, 'REJECTED')}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && !loading && !error && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <Clock size={48} />
                    <h3>No {filter === 'PENDING' ? 'pending' : ''} records found</h3>
                    <p>There are no time-off claims or overtime logs to display here.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
