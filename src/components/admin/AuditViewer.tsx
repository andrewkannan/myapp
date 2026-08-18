'use client';

import { useState, useEffect } from 'react';

export function AuditViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/logs?limit=200')
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading audit logs...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>System Audit Logs</h2>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--header-bg)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Timestamp</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>User</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Action</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  {log.user ? `${log.user.fullName || log.user.abbreviation}` : 'System'}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ 
                    backgroundColor: log.action.includes('DELETE') ? '#FEE2E2' : log.action.includes('CREATE') ? '#DCFCE7' : '#E0F2FE',
                    color: log.action.includes('DELETE') ? '#DC2626' : log.action.includes('CREATE') ? '#166534' : '#0369A1',
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{log.details || '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No logs recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
