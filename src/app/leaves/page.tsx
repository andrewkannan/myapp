'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Calendar, Activity, Pencil, Trash2, Check, X } from 'lucide-react';
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

  const isScheduler = session?.permissions?.some((p: string) => ['ROSTER_EDIT', 'LEAVE_APPROVE'].includes(p)) || session?.role === 'ADMIN';
  const isRestrictedRole = !isScheduler && ['radiographer', 'sonographer', 'nurse'].some(role => (session?.role || '').toLowerCase().includes(role));

  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [editLeaveForm, setEditLeaveForm] = useState<any>({});

  const startEditLeave = (leave: any) => {
    setEditingLeaveId(leave.id);
    setEditLeaveForm({
      type: leave.type,
      period: leave.period,
      remarks: leave.remarks || '',
      status: leave.status,
    });
  };

  const saveEditLeave = async () => {
    if (!editingLeaveId) return;
    const res = await fetch(`/api/leaves/${editingLeaveId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editLeaveForm),
    });
    if (res.ok) {
      setEditingLeaveId(null);
      fetchLeaves();
    } else {
      alert('Failed to update leave');
    }
  };

  const deleteLeave = async (id: string) => {
    if (!confirm('Delete this leave record?')) return;
    const res = await fetch(`/api/leaves/${id}`, { method: 'DELETE' });
    if (res.ok) fetchLeaves();
    else alert('Failed to delete');
  };

  const editInputStyle: React.CSSProperties = { padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', width: '100%' };

  if (!session) return null;

  return (
    <div className="animate-fade-in" style={{ backgroundColor: 'var(--surface-hover)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="animate-slide-up" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 1.5rem', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => router.push('/schedule')} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', border: 'none', background: 'transparent' }}>
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
                  {!isRestrictedRole && (
                    <div style={{ flex: 1, backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '2.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={20} color="#007aff" /> Apply for Leave
                      </h2>
                      <LeaveRequestForm onSuccess={fetchLeaves} session={session} />
                    </div>
                  )}

                  <h2 style={{ fontSize: '1.375rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--foreground)' }}>Leave History</h2>
                  {userLeaves.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--background)', borderRadius: '24px', color: 'var(--text-muted)' }}>
                      No leave records found.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {userLeaves.map((leave: any) => (
                        <div key={leave.id} style={{ backgroundColor: 'var(--surface)', padding: '1.25rem 1.5rem', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                          {editingLeaveId === leave.id ? (
                            /* --- EDIT MODE --- */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>
                                  Edit — {new Date(leave.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </h4>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button onClick={saveEditLeave} style={{ padding: '0.3rem 0.75rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Check size={14} /> Save
                                  </button>
                                  <button onClick={() => setEditingLeaveId(null)} style={{ padding: '0.3rem 0.75rem', backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <X size={14} /> Cancel
                                  </button>
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                                <div>
                                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Type</label>
                                  <select style={editInputStyle} value={editLeaveForm.type} onChange={e => setEditLeaveForm({...editLeaveForm, type: e.target.value})}>
                                    <option value="AL">AL</option>
                                    <option value="MC">MC</option>
                                    <option value="ML">ML</option>
                                    <option value="CCL">CCL</option>
                                    <option value="UL">UL</option>
                                    <option value="NS">NS</option>
                                    <option value="HL">HL</option>
                                    <option value="TO">TO</option>
                                    <option value="UPL">UPL</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Period</label>
                                  <select style={editInputStyle} value={editLeaveForm.period} onChange={e => setEditLeaveForm({...editLeaveForm, period: e.target.value})}>
                                    <option value="FULL">FULL</option>
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status</label>
                                  <select style={editInputStyle} value={editLeaveForm.status} onChange={e => setEditLeaveForm({...editLeaveForm, status: e.target.value})}>
                                    <option value="APPROVED">APPROVED</option>
                                    <option value="PENDING">PENDING</option>
                                    <option value="REJECTED">REJECTED</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Remarks</label>
                                  <input type="text" style={editInputStyle} value={editLeaveForm.remarks} onChange={e => setEditLeaveForm({...editLeaveForm, remarks: e.target.value})} placeholder="Optional" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* --- VIEW MODE --- */
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>{new Date(leave.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>{leave.type} • {leave.period}{leave.remarks ? ` • ${leave.remarks}` : ''}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                  padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '999px', fontWeight: 600,
                                  backgroundColor: leave.status === 'APPROVED' ? '#dcfce7' : leave.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                                  color: leave.status === 'APPROVED' ? '#166534' : leave.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                                }}>
                                  {leave.status}
                                </span>
                                {isScheduler && (
                                  <>
                                    <button onClick={() => startEditLeave(leave)} title="Edit" style={{ padding: '0.3rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                                      <Pencil size={16} />
                                    </button>
                                    <button onClick={() => deleteLeave(leave.id)} title="Delete" style={{ padding: '0.3rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger, #ef4444)' }}>
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
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
