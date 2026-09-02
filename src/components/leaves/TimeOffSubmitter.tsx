'use client';
import { useState, useEffect } from 'react';
import { Pencil, Trash2, X, Check } from 'lucide-react';

export function TimeOffSubmitter({ session }: { session: any }) {
  const [records, setRecords] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);

  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [studyAccNo, setStudyAccNo] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hours, setHours] = useState('');
  const [isClaim, setIsClaim] = useState(false);

  const isScheduler = session?.permissions?.some((p: string) => ['ROSTER_EDIT', 'TIMEOFF_APPROVE'].includes(p)) || session?.role === 'ADMIN';
  const [users, setUsers] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Cancel state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelRemark, setCancelRemark] = useState('');

  useEffect(() => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    setDate(new Date(today.getTime() - tzOffset).toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    fetchRecords();
    if (isScheduler) {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => setUsers(data));
    }
  }, [isScheduler]);

  useEffect(() => {
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const diff = (eh + em/60) - (sh + sm/60);
      if (diff > 0) setHours(diff.toFixed(2));
    }
  }, [startTime, endTime]);

  const fetchRecords = async () => {
    const res = await fetch('/api/time-off');
    if (res.ok) {
      const data = await res.json();
      setRecords(data.records);
      setBalance(data.currentBalance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason || !hours) return alert('Date, Reason, and Hours are required.');

    let submittedHours = parseFloat(hours);
    if (isClaim) {
      submittedHours = -Math.abs(submittedHours);
    } else {
      submittedHours = Math.abs(submittedHours);
    }

    const res = await fetch('/api/time-off', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, reason, studyAccNo, startTime, endTime, hours: submittedHours,
        ...(isScheduler && targetUserId ? { targetUserId } : {})
      })
    });

    if (res.ok) {
      setDate('');
      setReason('');
      setStudyAccNo('');
      setStartTime('');
      setEndTime('');
      setHours('');
      setIsClaim(false);
      if (!targetUserId) fetchRecords();
      else alert('Time Off applied and auto-approved for staff!');
    } else {
      alert('Failed to submit');
    }
  };

  const startEdit = (r: any) => {
    const d = new Date(r.date);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
    setEditingId(r.id);
    setEditForm({
      date: localDate,
      reason: r.reason || '',
      studyAccNo: r.studyAccNo || '',
      startTime: r.startTime || '',
      endTime: r.endTime || '',
      hours: Math.abs(r.hours),
      isClaim: r.hours <= 0,
      status: r.status,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    let finalHours = parseFloat(editForm.hours);
    if (editForm.isClaim) finalHours = -Math.abs(finalHours);
    else finalHours = Math.abs(finalHours);

    const res = await fetch('/api/time-off', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingId,
        date: editForm.date,
        reason: editForm.reason,
        studyAccNo: editForm.studyAccNo || null,
        startTime: editForm.startTime || null,
        endTime: editForm.endTime || null,
        hours: finalHours,
        status: editForm.status,
      })
    });

    if (res.ok) {
      setEditingId(null);
      fetchRecords();
    } else {
      alert('Failed to update record');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this time-off record?')) return;
    const res = await fetch(`/api/time-off?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchRecords();
    else alert('Failed to delete');
  };

  const handleCancel = async (id: string) => {
    if (!cancelRemark.trim()) return alert('Please provide a cancellation reason.');
    const res = await fetch('/api/time-off', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'CANCELLED', reason: cancelRemark.trim() })
    });
    if (res.ok) {
      setCancellingId(null);
      setCancelRemark('');
      fetchRecords();
    } else {
      alert('Failed to cancel record');
    }
  };

  const isRestrictedRole = !isScheduler && ['radiographer', 'sonographer', 'nurse'].some(role => (session?.role || '').toLowerCase().includes(role));

  const editInputStyle: React.CSSProperties = { padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '100%' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--foreground)' }}>Time Off</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500 }}>Staff Name: <strong style={{ color: 'var(--foreground)' }}>{session?.fullName || session?.abbreviation}</strong></p>
        </div>
        <div style={{ backgroundColor: 'var(--primary-light)', padding: '0.75rem 1.25rem', borderRadius: '999px', border: '1px solid var(--primary)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', margin: '0 0 0.1rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Balance</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--primary)' }}>{balance.toFixed(2)} HRS</p>
        </div>
      </div>

      {/* Submission Form */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 4px 14px var(--shadow-color)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--foreground)' }}>Submit New Entry</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--foreground)' }}>Entry Type:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--success-text)', fontWeight: 600 }}>
              <input type="radio" checked={!isClaim} onChange={() => setIsClaim(false)} /> Apply Overtime (OT) (+)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--danger-text)', fontWeight: 600 }}>
              <input type="radio" checked={isClaim} onChange={() => setIsClaim(true)} /> Claim (-)
            </label>
          </div>

          {isScheduler && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>Apply on behalf of (Optional)</label>
              <select 
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)', fontSize: '0.9rem' }}
              >
                <option value="">-- Apply for myself --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName || u.abbreviation} ({u.abbreviation})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Date</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }} />
          </div>
          
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Procedure / Reason</label>
            <input type="text" required placeholder="e.g. US THYROID or Claim time off" value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Study Acc No. (Optional)</label>
            <input type="text" value={studyAccNo} onChange={e => setStudyAccNo(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Start Time (Optional)</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--foreground)' }}>End Time (Optional)</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--foreground)' }}>Hours</label>
            <input type="number" step="0.25" min="0.25" required placeholder="e.g. 1.5" value={hours} onChange={e => setHours(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }} />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
            <button type="submit" style={{ width: '100%', padding: '0.875rem', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
              Submit
            </button>
          </div>
        </form>
      </div>

      {/* Ledger List (Mobile Friendly) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {records.map((r) => (
          <div key={r.id} style={{ backgroundColor: 'var(--surface)', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            {editingId === r.id ? (
              /* --- EDIT MODE --- */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Edit Record</h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={saveEdit} style={{ padding: '0.3rem 0.75rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Check size={14} /> Save
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '0.3rem 0.75rem', backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Date</label>
                    <input type="date" style={editInputStyle} value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Reason</label>
                    <input type="text" style={editInputStyle} value={editForm.reason} onChange={e => setEditForm({...editForm, reason: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Study Acc</label>
                    <input type="text" style={editInputStyle} value={editForm.studyAccNo} onChange={e => setEditForm({...editForm, studyAccNo: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Start</label>
                    <input type="text" style={editInputStyle} placeholder="e.g. 09:30" value={editForm.startTime} onChange={e => setEditForm({...editForm, startTime: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>End</label>
                    <input type="text" style={editInputStyle} placeholder="e.g. 10:30" value={editForm.endTime} onChange={e => setEditForm({...editForm, endTime: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Hours</label>
                    <input type="number" step="0.25" style={editInputStyle} value={editForm.hours} onChange={e => setEditForm({...editForm, hours: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Type</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                        <input type="radio" checked={!editForm.isClaim} onChange={() => setEditForm({...editForm, isClaim: false})} /> Apply Overtime(OT)
                      </label>
                      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                        <input type="radio" checked={editForm.isClaim} onChange={() => setEditForm({...editForm, isClaim: true})} /> Claim(-)
                      </label>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status</label>
                    <select style={editInputStyle} value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                      <option value="APPROVED">APPROVED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* --- VIEW MODE --- */
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)' }}>{new Date(r.date).toLocaleDateString('en-GB')}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>{r.reason} {r.studyAccNo ? `(${r.studyAccNo})` : ''}</div>
                    {r.startTime && r.endTime && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>{r.startTime} - {r.endTime}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{ 
                      padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '999px', fontWeight: 600,
                      backgroundColor: r.status === 'APPROVED' ? '#dcfce7' : r.status === 'REJECTED' ? '#fee2e2' : r.status === 'CANCELLED' ? '#f3f4f6' : '#fef9c3',
                      color: r.status === 'APPROVED' ? '#166534' : r.status === 'REJECTED' ? '#991b1b' : r.status === 'CANCELLED' ? '#6b7280' : '#854d0e'
                    }}>
                      {r.status}
                    </span>
                    {isScheduler && r.status !== 'CANCELLED' && (
                      <>
                        <button onClick={() => startEdit(r)} title="Edit" style={{ padding: '0.3rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                          <Pencil size={16} />
                        </button>
                        {r.status === 'APPROVED' && (
                          <button onClick={() => { setCancellingId(r.id); setCancelRemark(''); }} title="Cancel" style={{ padding: '0.3rem 0.5rem', border: '1px solid #fca5a5', background: '#fef2f2', borderRadius: '6px', cursor: 'pointer', color: '#dc2626', fontSize: '0.7rem', fontWeight: 600 }}>
                            Cancel
                          </button>
                        )}
                        <button onClick={() => handleDelete(r.id)} title="Delete" style={{ padding: '0.3rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger, #ef4444)' }}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Cancel confirmation with remark */}
                {cancellingId === r.id && (
                  <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b' }}>Cancellation Reason *</label>
                    <input type="text" placeholder="e.g. Staff no longer needs time off" value={cancelRemark} onChange={e => setCancelRemark(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.85rem', width: '100%' }} />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setCancellingId(null)} style={{ padding: '0.3rem 0.75rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'white', fontSize: '0.8rem', cursor: 'pointer' }}>Back</button>
                      <button onClick={() => handleCancel(r.id)} style={{ padding: '0.3rem 0.75rem', border: 'none', borderRadius: '6px', background: '#dc2626', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Confirm Cancel</button>
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background)', padding: '0.875rem 1rem', borderRadius: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontWeight: 700, letterSpacing: '0.05em' }}>HOURS</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: r.status === 'CANCELLED' ? '#9ca3af' : (r.hours <= 0 ? '#b91c1c' : '#15803d'), textDecoration: r.status === 'CANCELLED' ? 'line-through' : 'none' }}>
                      {r.hours > 0 ? '+' : ''}{r.hours} HRS
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontWeight: 700, letterSpacing: '0.05em' }}>BALANCE</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: r.status === 'CANCELLED' ? '#9ca3af' : 'var(--primary)' }}>
                      {r.status === 'APPROVED' ? `${r.runningBalance.toFixed(2)} HRS` : '-'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        {records.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--background)', borderRadius: '24px', color: 'var(--text-muted)' }}>
            No records found
          </div>
        )}
      </div>
    </div>
  );
}
