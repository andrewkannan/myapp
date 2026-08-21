'use client';
import { useState, useEffect } from 'react';
import { BarChart3, Users, Calendar, Download } from 'lucide-react';

export default function AnalyticsViewer() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading analytics...</div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Dashboard Analytics</h2>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Overview of system usage and available reports.</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', color: 'var(--primary)' }}>
            <Users size={24} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Accessed Today</h3>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats?.activeToday || 0}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Users logged in today</div>
        </div>
        
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', color: '#16a34a' }}>
            <Users size={24} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Total Users</h3>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats?.totalUsers || 0}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered staff accounts</div>
        </div>
      </div>

      {/* Suggested Reports */}
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Suggested Reports (Coming Soon)</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>Monthly Roster Summary</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Detailed breakdown of shifts worked per staff member per location.</p>
          </div>
          <button disabled style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>Leave & Time-Off Balance Report</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Current balances, taken leaves, and pending approvals for all staff.</p>
          </div>
          <button disabled style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
        
        <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>System Usage Audit</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Report of logins, profile updates, and settings changes over the last 30 days.</p>
          </div>
          <button disabled style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
