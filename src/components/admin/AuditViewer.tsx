'use client';

import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

export function AuditViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    setError('');
    fetch('/api/logs?limit=200')
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setError('Failed to load audit logs.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading && logs.length === 0) return <div className="skeleton" style={{ height: '400px', width: '100%' }}></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>System Audit Logs</h2>
      </div>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={fetchLogs} className="btn btn-danger">Retry</button>
        </div>
      )}

      <div className="premium-table-wrapper">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td style={{ color: 'var(--text-muted)' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ fontWeight: 500 }}>
                  {log.user ? `${log.user.fullName || log.user.abbreviation}` : 'System'}
                </td>
                <td>
                  <span className={
                    log.action.includes('DELETE') ? 'badge badge-danger' : 
                    log.action.includes('CREATE') ? 'badge badge-success' : 
                    log.action.includes('AUTH') ? 'badge badge-warning' : 'badge badge-info'
                  }>
                    {log.action}
                  </span>
                </td>
                <td>{log.details || '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && !loading && !error && (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <Activity size={48} />
                    <h3>No logs found</h3>
                    <p>Audit trail will appear here once actions are recorded in the system.</p>
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
