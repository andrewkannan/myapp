'use client';
import { useState, useEffect } from 'react';

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

  const isScheduler = session?.permissions?.includes('ROSTER_EDIT') || session?.role === 'ADMIN';
  const [users, setUsers] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState('');

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
      if (!targetUserId) fetchRecords(); // Only refresh if it's our own record
      else alert('Time Off applied and auto-approved for staff!');
    } else {
      alert('Failed to submit');
    }
  };

  const isRestrictedRole = ['radiographer', 'sonographer', 'nurse'].some(role => (session?.role || '').toLowerCase().includes(role));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#1d1d1f' }}>Time Off</h1>
          <p style={{ margin: 0, color: '#86868b', fontWeight: 500 }}>Staff Name: <strong style={{ color: '#1d1d1f' }}>{session?.fullName || session?.abbreviation}</strong></p>
        </div>
        <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem 1.25rem', borderRadius: '999px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', margin: '0 0 0.1rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Balance</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1d4ed8' }}>{balance.toFixed(2)} HRS</p>
        </div>
      </div>

      {/* Submission Form */}
      {!isRestrictedRole && (
        <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1d1d1f' }}>Submit New Entry</h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1d1d1f' }}>Entry Type:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#15803d', fontWeight: 600 }}>
              <input type="radio" checked={!isClaim} onChange={() => setIsClaim(false)} /> Apply (+)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#b91c1c', fontWeight: 600 }}>
              <input type="radio" checked={isClaim} onChange={() => setIsClaim(true)} /> Claim (-)
            </label>
          </div>

          {isScheduler && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1d1d1f' }}>Apply on behalf of (Optional)</label>
              <select 
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: '0.9rem' }}
              >
                <option value="">-- Apply for myself --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName || u.abbreviation} ({u.abbreviation})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>Date</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }} />
          </div>
          
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>Procedure / Reason</label>
            <input type="text" required placeholder="e.g. US THYROID or Claim time off" value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>Study Acc No. (Optional)</label>
            <input type="text" value={studyAccNo} onChange={e => setStudyAccNo(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>Start Time (Optional)</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>End Time (Optional)</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>Hours</label>
            <input type="number" step="0.25" min="0.25" required placeholder="e.g. 1.5" value={hours} onChange={e => setHours(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }} />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
            <button type="submit" style={{ width: '100%', padding: '0.875rem', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
              Submit
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Ledger List (Mobile Friendly) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {records.map((r, i) => (
          <div key={r.id} style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1d1d1f' }}>{new Date(r.date).toLocaleDateString('en-GB')}</div>
                <div style={{ fontSize: '0.9rem', color: '#86868b', fontWeight: 500 }}>{r.reason} {r.studyAccNo ? `(${r.studyAccNo})` : ''}</div>
                {r.startTime && r.endTime && (
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>{r.startTime} - {r.endTime}</div>
                )}
              </div>
              <span style={{ 
                padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '999px', fontWeight: 600,
                backgroundColor: r.status === 'APPROVED' ? '#dcfce7' : r.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                color: r.status === 'APPROVED' ? '#166534' : r.status === 'REJECTED' ? '#991b1b' : '#854d0e'
              }}>
                {r.status}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '12px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', marginBottom: '2px', fontWeight: 700, letterSpacing: '0.05em' }}>HOURS</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: r.hours < 0 ? '#b91c1c' : '#15803d' }}>
                  {r.hours > 0 ? '+' : ''}{r.hours} HRS
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', marginBottom: '2px', fontWeight: 700, letterSpacing: '0.05em' }}>BALANCE</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#2563eb' }}>
                  {r.status === 'APPROVED' ? `${r.runningBalance.toFixed(2)} HRS` : '-'}
                </span>
              </div>
            </div>
          </div>
        ))}
        {records.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f5f5f7', borderRadius: '24px', color: '#86868b' }}>
            No records found
          </div>
        )}
      </div>
    </div>
  );
}
