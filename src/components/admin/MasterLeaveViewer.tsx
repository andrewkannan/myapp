'use client';

import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ToastProvider';
import { Calendar, Plus, X } from 'lucide-react';

export function MasterLeaveViewer() {
  const { toast } = useToast();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ userId: '', date: '', type: 'AL', period: 'FULL', remarks: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLeaves();
  }, [year]);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaves/master?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setLeaves(data.leaves || []);
      } else {
        toast('Failed to load master leave data', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Failed to load master leave data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.userId || !addForm.date) {
      toast('Please select a staff member and date', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: addForm.userId,
          dates: [addForm.date],
          type: addForm.type,
          period: addForm.period,
          remarks: addForm.remarks || null,
        })
      });
      if (!res.ok) throw new Error('Failed to create');
      toast('Leave record added', 'success');
      setShowAdd(false);
      setAddForm({ userId: '', date: '', type: 'AL', period: 'FULL', remarks: '' });
      fetchLeaves();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const leavesByKey = useMemo(() => {
    const map = new Map<string, typeof leaves>();
    for (const leave of leaves) {
      const d = new Date(leave.date);
      const key = `${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(leave);
    }
    return map;
  }, [leaves]);

  const inputStyle: React.CSSProperties = { padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '100%' };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Master Leave Overview</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Yearly view of all staff leave.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
            onClick={() => setShowAdd(!showAdd)}
          >
            {showAdd ? <X size={16} /> : <Plus size={16} />}
            {showAdd ? 'Cancel' : 'Add Leave'}
          </button>
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Year:</label>
          <input 
            type="number" 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            className="input-field"
            style={{ width: '100px', textAlign: 'center' }}
          />
        </div>
      </div>

      {showAdd && (
        <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '10px', backgroundColor: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Add Leave Record</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Staff *</label>
              <select style={inputStyle} value={addForm.userId} onChange={e => setAddForm({...addForm, userId: e.target.value})}>
                <option value="">Select staff</option>
                {users.filter(u => u.isActive !== false).map(u => <option key={u.id} value={u.id}>{u.abbreviation} - {u.fullName}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date *</label>
              <input type="date" style={inputStyle} value={addForm.date} onChange={e => setAddForm({...addForm, date: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Leave Type</label>
              <select style={inputStyle} value={addForm.type} onChange={e => setAddForm({...addForm, type: e.target.value})}>
                <option value="AL">AL (Annual Leave)</option>
                <option value="MC">MC (Medical)</option>
                <option value="UPL">UPL (Unpaid Leave)</option>
                <option value="OFF">OFF (Day Off)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Period</label>
              <select style={inputStyle} value={addForm.period} onChange={e => setAddForm({...addForm, period: e.target.value})}>
                <option value="FULL">Full Day</option>
                <option value="AM">AM (Morning)</option>
                <option value="PM">PM (Afternoon)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Remarks</label>
              <input type="text" style={inputStyle} placeholder="Optional" value={addForm.remarks} onChange={e => setAddForm({...addForm, remarks: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" style={{ padding: '0.4rem 1.25rem' }} onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add & Approve'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ flex: 1, width: '100%', borderRadius: '8px' }}></div>
      ) : (
        <div className="premium-table-wrapper" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '1800px', width: '100%', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <tr>
                <th style={{ border: '1px solid var(--border)', padding: '0.5rem', width: '60px', backgroundColor: 'var(--header-bg)', position: 'sticky', left: 0, zIndex: 20 }}>Month</th>
                {days.map(d => (
                  <th key={d} style={{ border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', minWidth: '55px' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((monthName, mIndex) => {
                const daysInMonth = new Date(year, mIndex + 1, 0).getDate();
                
                return (
                  <tr key={monthName}>
                    <td style={{ 
                      border: '1px solid var(--border)', padding: '0.5rem', fontWeight: 'bold', 
                      position: 'sticky', left: 0, backgroundColor: 'var(--surface)', zIndex: 5, textAlign: 'center'
                    }}>
                      {monthName}
                    </td>
                    {days.map(d => {
                      if (d > daysInMonth) {
                        return <td key={d} style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}></td>;
                      }

                      const cellLeaves = leavesByKey.get(`${mIndex}-${d}`) || [];
                      const isWeekend = new Date(year, mIndex, d).getDay() === 0 || new Date(year, mIndex, d).getDay() === 6;

                      return (
                        <td key={d} style={{ 
                          border: '1px solid var(--border)', 
                          padding: '2px', 
                          verticalAlign: 'top',
                          backgroundColor: isWeekend ? 'var(--weekend-bg)' : 'transparent',
                          minHeight: '40px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {cellLeaves.map(leave => (
                              <div key={leave.id} style={{
                                backgroundColor: leave.status === 'APPROVED' ? '#DBEAFE' : '#FEF3C7',
                                color: leave.status === 'APPROVED' ? '#1E40AF' : '#92400E',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textAlign: 'center'
                              }} title={leave.user?.fullName || leave.user?.abbreviation}>
                                {leave.period === 'AM' && <span style={{ color: 'var(--primary)', marginRight: '2px' }}>am</span>}
                                {leave.period === 'PM' && <span style={{ color: '#c2410c', marginRight: '2px' }}>pm</span>}
                                {leave.user?.abbreviation || 'Unk'}
                                {!['AL', 'OFF', 'MC'].includes(leave.type) && <span style={{ color: 'var(--text-muted)', marginLeft: '2px', fontSize: '0.5rem' }}>{leave.type}</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
