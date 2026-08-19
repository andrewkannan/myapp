'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LeaveRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [dateStr, setDateStr] = useState('');
  const [type, setType] = useState('AL');
  const [period, setPeriod] = useState('FULL');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateStr) {
      setError('Please select a date.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Just submitting single dates for now based on the date picker
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: [dateStr],
          type,
          period,
          remarks
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      setSuccess(true);
      setDateStr('');
      setRemarks('');
      router.refresh(); // Refresh the Server Component to show new history
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <div style={{ color: '#b91c1c', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>{error}</div>}
      {success && <div style={{ color: '#15803d', backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>Leave request submitted successfully! (Pending Approval)</div>}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Date</label>
          <input 
            type="date" 
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Leave Type</label>
          <select 
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
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
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Period</label>
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
          >
            <option value="FULL">Full Day</option>
            <option value="AM">Morning (AM)</option>
            <option value="PM">Afternoon (PM)</option>
          </select>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Remarks (Optional)</label>
        <input 
          type="text" 
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Reason or notes for your manager"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            backgroundColor: '#2563eb', color: 'white', fontWeight: 600, 
            padding: '0.5rem 1.5rem', borderRadius: '4px', border: 'none', 
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
}
