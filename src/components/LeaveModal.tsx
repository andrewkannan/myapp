import { useState, useEffect } from 'react';

export default function LeaveModal({ date, leave, users, onClose, onRefresh }: { date: Date, leave?: any, users: any[], onClose: () => void, onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('AL');
  const [period, setPeriod] = useState('FULL');
  const [remarks, setRemarks] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (leave) {
      setType(leave.type);
      setPeriod(leave.period);
      setRemarks(leave.remarks || '');
      setTargetUserId(leave.userId);
    }
  }, [leave]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId && !leave) {
      setError('Please select a staff member.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      let res;
      const dateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      if (leave) {
        res = await fetch(`/api/leaves/${leave.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, period, remarks, status: leave.status })
        });
      } else {
        res = await fetch('/api/leaves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dates: [dateStr],
            type,
            period,
            remarks,
            targetUserId
          })
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save leave');
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!leave) return;
    if (!confirm('Are you sure you want to delete this leave?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leaves/${leave.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', width: '90%', maxWidth: '400px' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>{leave ? 'Edit Leave' : 'Apply Leave'}</h2>
        <p style={{ margin: '0 0 1rem 0', color: '#666' }}>{date.toLocaleDateString()}</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ color: 'red', fontSize: '0.875rem' }}>{error}</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Staff Member</label>
            <select required disabled={!!leave} value={targetUserId} onChange={e => setTargetUserId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: leave ? '#f3f4f6' : 'white' }}>
              <option value="">Select staff...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName || u.abbreviation}</option>)}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Leave Type</label>
            <input required type="text" value={type} onChange={e => setType(e.target.value.toUpperCase())} placeholder="e.g. AL, ADMIN-AL" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Period</label>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="FULL">Full Day</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Remarks (Optional)</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            {leave && (
              <button type="button" disabled={loading} onClick={handleDelete} style={{ flex: 1, backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>{loading ? 'Saving...' : (leave ? 'Save' : 'Apply')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
