'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { Clock, Plus, X } from 'lucide-react';

export function TimeOffManager() {
  const { toast, confirm } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ userId: '', date: '', reason: '', studyAccNo: '', startTime: '', endTime: '', hours: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [filter]);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/time-off/admin${filter === 'PENDING' ? '' : '?all=true'}`);
      if (!res.ok) throw new Error('Failed to fetch records');
      const data = await res.json();
      setRecords(data);
    } catch (err: any) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
    if (!await confirm(`Are you sure you want to ${status.toLowerCase()} this request?`)) return;
    
    const res = await fetch('/api/time-off/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });

    if (res.ok) {
      toast(`Request ${status.toLowerCase()}`, 'success');
      fetchRecords();
    } else {
      toast('Failed to update record', 'error');
    }
  };

  const handleAdd = async () => {
    if (!addForm.userId || !addForm.date || !addForm.reason || !addForm.hours) {
      toast('Please fill Staff, Date, Reason, and Hours', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: addForm.userId,
          date: addForm.date,
          reason: addForm.reason,
          studyAccNo: addForm.studyAccNo || null,
          startTime: addForm.startTime || null,
          endTime: addForm.endTime || null,
          hours: parseFloat(addForm.hours),
        })
      });
      if (!res.ok) throw new Error('Failed to create');
      toast('Time-off record added', 'success');
      setShowAdd(false);
      setAddForm({ userId: '', date: '', reason: '', studyAccNo: '', startTime: '', endTime: '', hours: '' });
      fetchRecords();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const [editingRecord, setEditingRecord] = useState<any>(null);

  const startEdit = (r: any) => {
    setEditingRecord({
      ...r,
      date: new Date(r.date).toISOString().split('T')[0],
      isClaim: r.hours <= 0,
      hours: Math.abs(r.hours).toString()
    });
  };

  const saveEdit = async () => {
    if (!editingRecord) return;
    setSubmitting(true);
    let finalHours = parseFloat(editingRecord.hours);
    if (editingRecord.isClaim) finalHours = -Math.abs(finalHours);
    else finalHours = Math.abs(finalHours);

    try {
      const res = await fetch('/api/time-off', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRecord.id,
          date: editingRecord.date,
          reason: editingRecord.reason,
          studyAccNo: editingRecord.studyAccNo || null,
          startTime: editingRecord.startTime || null,
          endTime: editingRecord.endTime || null,
          hours: finalHours,
          status: editingRecord.status,
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      toast('Record updated', 'success');
      setEditingRecord(null);
      fetchRecords();
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await fetch(`/api/time-off?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast('Record deleted', 'success');
      fetchRecords();
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  if (loading && records.length === 0) return <div className="skeleton" style={{ height: '400px', width: '100%' }}></div>;

  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const staffMatch = (r.user?.fullName || '').toLowerCase().includes(searchLower) || (r.user?.abbreviation || '').toLowerCase().includes(searchLower);
    const reasonMatch = (r.reason || '').toLowerCase().includes(searchLower);
    return staffMatch || reasonMatch;
  });

  const inputStyle: React.CSSProperties = { padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', width: '100%' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>Time-Off & Overtime Approvals</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Review and approve staff time-off claims and logged overtime.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search staff or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', width: '200px' }}
          />
          <button
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
            onClick={() => setShowAdd(!showAdd)}
          >
            {showAdd ? <X size={16} /> : <Plus size={16} />}
            {showAdd ? 'Cancel' : 'Add Record'}
          </button>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--surface)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button 
              className={`btn ${filter === 'PENDING' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.4rem 1rem' }}
              onClick={() => setFilter('PENDING')}>Pending</button>
            <button 
              className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.4rem 1rem' }}
              onClick={() => setFilter('ALL')}>All Records</button>
          </div>
        </div>
      </div>

      {showAdd && (
        <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '10px', backgroundColor: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Add Time-Off Record</h3>
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
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Reason *</label>
              <input type="text" style={inputStyle} placeholder="e.g. Dental appointment" value={addForm.reason} onChange={e => setAddForm({...addForm, reason: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Study Acc No</label>
              <input type="text" style={inputStyle} placeholder="Optional" value={addForm.studyAccNo} onChange={e => setAddForm({...addForm, studyAccNo: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Start Time</label>
              <input type="text" style={inputStyle} placeholder="e.g. 1400" value={addForm.startTime} onChange={e => setAddForm({...addForm, startTime: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>End Time</label>
              <input type="text" style={inputStyle} placeholder="e.g. 1600" value={addForm.endTime} onChange={e => setAddForm({...addForm, endTime: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hours *</label>
              <input type="number" step="0.5" style={inputStyle} placeholder="e.g. 2" value={addForm.hours} onChange={e => setAddForm({...addForm, hours: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" style={{ padding: '0.4rem 1.25rem' }} onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add & Approve'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: 'var(--danger-text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={fetchRecords} className="btn btn-danger">Retry</button>
        </div>
      )}

      <div className="premium-table-wrapper">
        <table className="premium-table">
          <thead>
            <tr>
              <th>STAFF</th>
              <th>DATE</th>
              <th>REASON</th>
              <th>TIME</th>
              <th style={{ textAlign: 'right' }}>HOURS</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.user?.fullName || r.user?.abbreviation}</td>
                <td>{new Date(r.date).toLocaleDateString('en-GB')}</td>
                <td>
                  {r.reason} {r.studyAccNo && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>#{r.studyAccNo}</span>}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : '-'}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: r.hours <= 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {r.hours > 0 ? '+' : ''}{r.hours}h
                </td>
                <td>
                  <span className={r.status === 'APPROVED' ? 'badge badge-success' : r.status === 'REJECTED' ? 'badge badge-danger' : r.status === 'CANCELLED' ? 'badge badge-ghost' : 'badge badge-warning'}>
                    {r.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                  {r.status === 'PENDING' && (
                    <>
                      <button 
                        className="btn-ghost"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--success-text)', fontWeight: 600 }}
                        onClick={() => handleAction(r.id, 'APPROVED')}>Approve</button>
                      <button 
                        className="btn-ghost"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--danger-text)', fontWeight: 600 }}
                        onClick={() => handleAction(r.id, 'REJECTED')}>Reject</button>
                    </>
                  )}
                  {r.status === 'APPROVED' && (
                    <button 
                      className="btn-ghost"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--warning-text)', fontWeight: 600 }}
                      onClick={() => handleAction(r.id, 'CANCELLED')}>Cancel</button>
                  )}
                  <button 
                    className="btn-ghost"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--primary)' }}
                    onClick={() => startEdit(r)}>Edit</button>
                  <button 
                    className="btn-ghost"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--danger-text)' }}
                    onClick={() => handleDelete(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {filteredRecords.length === 0 && !loading && !error && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <Clock size={48} />
                    <h3>No {filter === 'PENDING' ? 'pending' : ''} records found</h3>
                    <p>There are no time-off claims or overtime logs to display here.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editingRecord && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '16px', width: '90%', maxWidth: '440px' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 700 }}>Edit Record</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date</label>
                <input type="date" style={inputStyle} value={editingRecord.date} onChange={e => setEditingRecord({...editingRecord, date: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Reason</label>
                <input type="text" style={inputStyle} value={editingRecord.reason} onChange={e => setEditingRecord({...editingRecord, reason: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Study Acc</label>
                <input type="text" style={inputStyle} value={editingRecord.studyAccNo || ''} onChange={e => setEditingRecord({...editingRecord, studyAccNo: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Start</label>
                <input type="text" style={inputStyle} value={editingRecord.startTime || ''} onChange={e => setEditingRecord({...editingRecord, startTime: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>End</label>
                <input type="text" style={inputStyle} value={editingRecord.endTime || ''} onChange={e => setEditingRecord({...editingRecord, endTime: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hours</label>
                <input type="number" step="0.25" style={inputStyle} value={editingRecord.hours} onChange={e => setEditingRecord({...editingRecord, hours: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Type</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <input type="radio" checked={!editingRecord.isClaim} onChange={() => setEditingRecord({...editingRecord, isClaim: false})} /> OT(+)
                  </label>
                  <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <input type="radio" checked={editingRecord.isClaim} onChange={() => setEditingRecord({...editingRecord, isClaim: true})} /> Claim(-)
                  </label>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status</label>
                <select style={inputStyle} value={editingRecord.status} onChange={e => setEditingRecord({...editingRecord, status: e.target.value})}>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditingRecord(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
