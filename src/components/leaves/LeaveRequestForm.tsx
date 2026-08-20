'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LeaveRequestForm({ onSuccess, session }: { onSuccess?: () => void, session?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('AL');
  const [period, setPeriod] = useState('FULL');
  const [remarks, setRemarks] = useState('');
  
  const isScheduler = session?.permissions?.includes('ROSTER_EDIT') || session?.role === 'ADMIN';
  const [users, setUsers] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState('');

  useEffect(() => {
    if (isScheduler) {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => setUsers(data));
    }
  }, [isScheduler]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      setError('Please select a start date.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const dates = [];
      let current = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date(startDate);

      if (end < current) {
        throw new Error('End date cannot be before start date.');
      }

      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates,
          type,
          period,
          remarks,
          ...(isScheduler && targetUserId ? { targetUserId } : {})
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      setSuccess(true);
      setStartDate('');
      setEndDate('');
      setRemarks('');
      router.refresh(); // Refresh the Server Component to show new history
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <div style={{ color: '#b91c1c', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>{error}</div>}
      {success && <div style={{ color: '#15803d', backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>
        {isScheduler ? 'Leave assigned and auto-approved successfully!' : 'Leave request submitted successfully! (Pending Approval)'}
      </div>}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isScheduler && (
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>Apply on behalf of (Optional)</label>
            <select 
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: '1rem' }}
            >
              <option value="">-- Apply for myself --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.fullName || u.abbreviation} ({u.abbreviation})</option>
              ))}
            </select>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: '1rem' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>End Date (Optional)</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: '1rem' }}
            />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>Leave Type</label>
          <select 
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: '1rem' }}
          >
            <option value="AL">Annual Leave (AL)</option>
            <option value="MC">Medical Certificate (MC)</option>
            <option value="ML">Maternity Leave (ML)</option>
            <option value="CCL">Child Care Leave (CCL)</option>
            <option value="UL">Urgent Leave (UL)</option>
            <option value="NS">Reservist Leave (NS)</option>
            <option value="HL">Hospitalisation Leave (HL)</option>
            <option value="TO">Time Off (TO)</option>
            <option value="UPL">Unpaid Leave (UPL)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>Period</label>
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: '1rem' }}
          >
            <option value="FULL">Full Day</option>
            <option value="AM">Morning (AM)</option>
            <option value="PM">Afternoon (PM)</option>
          </select>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: '#1d1d1f' }}>Remarks (Optional)</label>
        <input 
          type="text" 
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Reason or notes for your manager"
          style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontSize: '1rem' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '0.875rem', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
}
