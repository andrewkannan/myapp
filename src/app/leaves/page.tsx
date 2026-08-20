'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Calendar, Activity } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import LeaveRequestForm from '@/components/leaves/LeaveRequestForm';
import { TimeOffSubmitter } from '@/components/leaves/TimeOffSubmitter';

function LeavesContent() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'leaves' | 'timeoff'>('leaves');
  const [userLeaves, setUserLeaves] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('tab') === 'timeoff') {
      setActiveTab('timeoff');
    } else {
      setActiveTab('leaves');
    }
  }, [searchParams]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const fetchLeaves = () => {
    if (session) {
      fetch('/api/leaves')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setUserLeaves(data);
          }
        });
    }
  };

  useEffect(() => {
    if (session && activeTab === 'leaves') {
      fetchLeaves();
    }
  }, [session, activeTab]);

  if (!session) return null;

  return (
    <div className="animate-fade-in" style={{ backgroundColor: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="animate-slide-up" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '1rem 1.5rem', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => router.push('/schedule')} style={{ display: 'flex', alignItems: 'center', color: '#6b7280', border: 'none', background: 'transparent' }}>
              <ChevronLeft size={24} />
              <span className="hidden sm:inline">Back to Schedule</span>
            </button>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>My Requests</h1>
          </div>
        </div>
      </header>

      <main className="animate-slide-up delay-1" style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Sidebar Nav */}
        <aside style={{ width: isMobile ? '100%' : '220px', flexShrink: 0 }}>
          <nav style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '0.5rem', overflowX: isMobile ? 'auto' : 'visible' }}>
            <button
              onClick={() => setActiveTab('leaves')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px',
                textAlign: 'left', fontWeight: 500, cursor: 'pointer', border: 'none',
                backgroundColor: activeTab === 'leaves' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'leaves' ? 'white' : 'var(--foreground)',
                whiteSpace: isMobile ? 'nowrap' : 'normal'
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
                color: activeTab === 'timeoff' ? 'white' : 'var(--foreground)',
                whiteSpace: isMobile ? 'nowrap' : 'normal'
              }}
            >
              <Activity size={18} />
              Time Off
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <section style={{ flex: 1, minWidth: 0, width: '100%' }}>
          {activeTab === 'leaves' && (
            <div>
              {(() => {
                const isScheduler = session?.permissions?.includes('ROSTER_EDIT') || session?.role === 'ADMIN';
                const isRestrictedRole = !isScheduler && ['radiographer', 'sonographer', 'nurse'].some(role => (session?.role || '').toLowerCase().includes(role));
                if (!isRestrictedRole) {
                  return (
                    <div style={{ flex: 1, backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '2.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={20} color="#007aff" /> Apply for Leave
                      </h2>
                      <LeaveRequestForm onSuccess={fetchLeaves} session={session} />
                    </div>
                  );
                }
                return null;
              })()}

              <h2 style={{ fontSize: '1.375rem', fontWeight: '700', marginBottom: '1rem', color: '#1d1d1f' }}>Leave History</h2>
              {userLeaves.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f5f5f7', borderRadius: '24px', color: '#86868b' }}>
                  No leave records found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {userLeaves.map((leave: any) => (
                    <div key={leave.id} style={{ backgroundColor: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1d1d1f', marginBottom: '0.25rem' }}>{new Date(leave.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div style={{ fontSize: '0.9rem', color: '#86868b', fontWeight: 500 }}>{leave.type} • {leave.period}</div>
                      </div>
                      <span style={{
                        padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '999px', fontWeight: 600,
                        backgroundColor: leave.status === 'APPROVED' ? '#dcfce7' : leave.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                        color: leave.status === 'APPROVED' ? '#166534' : leave.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                      }}>
                        {leave.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeoff' && (
            <TimeOffSubmitter session={session} />
          )}
        </section>

      </main>
    </div>
  );
}

export default function LeavesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <LeavesContent />
    </Suspense>
  );
}
