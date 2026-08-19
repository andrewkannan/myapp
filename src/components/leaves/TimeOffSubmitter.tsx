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

  useEffect(() => {
    fetchRecords();
  }, []);

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
        date, reason, studyAccNo, startTime, endTime, hours: submittedHours
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
      fetchRecords();
    } else {
      alert('Failed to submit');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Overtime & Time-Off Claims</h1>
          <p style={{ margin: 0, color: '#6b7280' }}>Staff Name: <strong style={{ color: '#111827' }}>{session?.fullName || session?.abbreviation}</strong></p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', margin: '0 0 0.25rem 0', textTransform: 'uppercase' }}>Total Balance</p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#2563eb' }}>{balance.toFixed(2)} HRS</p>
        </div>
      </div>

      {/* Submission Form */}
      <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Submit New Entry</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Entry Type:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#15803d', fontWeight: 600 }}>
              <input type="radio" checked={!isClaim} onChange={() => setIsClaim(false)} /> Earn Overtime (+)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#b91c1c', fontWeight: 600 }}>
              <input type="radio" checked={isClaim} onChange={() => setIsClaim(true)} /> Claim Time-Off (-)
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Date</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          </div>
          
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Procedure / Reason</label>
            <input type="text" required placeholder="e.g. US THYROID or Claim time off" value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Study Acc No. (Optional)</label>
            <input type="text" value={studyAccNo} onChange={e => setStudyAccNo(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Start Time (Optional)</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>End Time (Optional)</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Hours</label>
            <input type="number" step="0.25" min="0.25" required placeholder="e.g. 1.5" value={hours} onChange={e => setHours(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
              Submit
            </button>
          </div>
        </form>
      </div>

      {/* Ledger Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>NO.</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>DATE & DAY</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>REASON</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>ACC. NO.</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>TIME</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>OVERTIME</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>BALANCE</th>
              <th style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{i + 1}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{new Date(r.date).toLocaleDateString('en-GB')}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{r.reason}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{r.studyAccNo || '-'}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>{r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : '-'}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: 600, color: r.hours < 0 ? '#b91c1c' : '#15803d' }}>
                  {r.hours > 0 ? '+' : ''}{r.hours} HRS
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#eff6ff' }}>
                  {r.status === 'APPROVED' ? `${r.runningBalance.toFixed(2)} HRS` : '-'}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '9999px', fontWeight: 500,
                    backgroundColor: r.status === 'APPROVED' ? '#dcfce7' : r.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                    color: r.status === 'APPROVED' ? '#166534' : r.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                  }}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
