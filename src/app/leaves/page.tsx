'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Calendar, Activity } from 'lucide-react';
import Link from 'next/link';

import LeaveRequestForm from '@/components/leaves/LeaveRequestForm';
import { TimeOffSubmitter } from '@/components/leaves/TimeOffSubmitter';

export default function LeavesPage() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'leaves' | 'timeoff'>('leaves');
  const [userLeaves, setUserLeaves] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          router.push('/login');
        } else {
          setSession(data.user);
        }
      });
  }, [router]);

  useEffect(() => {
    if (session && activeTab === 'leaves') {
      fetch('/api/leaves')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setUserLeaves(data);
          }
        });
    }
  }, [session, activeTab]);

  if (!session) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', color: '#4b5563', textDecoration: 'none', marginRight: '1rem', fontWeight: 500 }}>
          <ChevronLeft size={20} /> Back to Roster
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>My Requests</h1>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Sidebar Nav */}
        <aside style={{ width: '220px', flexShrink: 0 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('leaves')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px',
                textAlign: 'left', fontWeight: 500, cursor: 'pointer', border: 'none',
                backgroundColor: activeTab === 'leaves' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'leaves' ? 'white' : 'var(--foreground)'
              }}
            >
              <Calendar size={18} />
              Leave Requests
            </button>

            <button
              onClick={() => setActiveTab('timeoff')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px',
                textAlign: 'left', fontWeight: 500, cursor: 'pointer', border: 'none',
                backgroundColor: activeTab === 'timeoff' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'timeoff' ? 'white' : 'var(--foreground)'
              }}
            >
              <Activity size={18} />
              Time-Off & Overtime
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <section style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'leaves' && (
            <div>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', color: '#111827' }}>Request New Leave</h2>
                <LeaveRequestForm />
              </div>

              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Leave History</h2>
              {userLeaves.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No leave records found.</p>
              ) : (
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 600 }}>Period</th>
                        <th style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userLeaves.map((leave: any) => (
                        <tr key={leave.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{new Date(leave.date).toLocaleDateString()}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>{leave.type}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>{leave.period}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '9999px', fontWeight: 500,
                              backgroundColor: leave.status === 'APPROVED' ? '#dcfce7' : leave.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                              color: leave.status === 'APPROVED' ? '#166534' : leave.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                            }}>
                              {leave.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeoff' && (
            <TimeOffSubmitter session={session} />
          )}
        </section>

      </div>
    </div>
  );
}
