'use client';

import { useState } from 'react';
import { User, Shift, Station } from '@/app/page';
import { X, Trash2 } from 'lucide-react';

interface AssignmentModalProps {
  date: Date;
  station: Station | null;
  statusType: 'Scheduled' | 'Leave' | 'MC' | 'Off';
  currentShifts: Shift[];
  users: User[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function AssignmentModal({
  date,
  station,
  statusType,
  currentShifts,
  users,
  onClose,
  onRefresh
}: AssignmentModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          date: date.toISOString(),
          stationId: station?.id || null,
          status: statusType,
          remarks
        })
      });
      if (res.ok) {
        onRefresh();
        setSelectedUserId('');
        setRemarks('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (shiftId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/roster?id=${shiftId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          padding: '1.25rem', 
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            {station ? station.name : statusType} - {date.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
          {currentShifts.length > 0 ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                Assigned Staff
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {currentShifts.map(shift => (
                  <div key={shift.id} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--primary)' }}>{shift.user.abbreviation}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{shift.user.fullName}</div>
                      {shift.remarks && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontStyle: 'italic' }}>Note: {shift.remarks}</div>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDelete(shift.id)}
                      disabled={loading}
                      style={{ color: 'var(--danger)', padding: '0.25rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic', fontSize: '0.875rem' }}>
              No staff assigned for this slot.
            </p>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
              Assign New
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 500 }}>Select Staff</label>
                <select 
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={{ 
                    width: '100%', padding: '0.625rem', borderRadius: '6px', 
                    border: '1px solid var(--border)', backgroundColor: 'var(--background)' 
                  }}
                >
                  <option value="">-- Choose staff --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.abbreviation} - {u.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 500 }}>Remarks (Optional)</label>
                <input 
                  type="text" 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. AM only"
                  style={{ 
                    width: '100%', padding: '0.625rem', borderRadius: '6px', 
                    border: '1px solid var(--border)', backgroundColor: 'var(--background)' 
                  }}
                />
              </div>

              <button 
                onClick={handleAssign}
                disabled={!selectedUserId || loading}
                style={{ 
                  width: '100%', padding: '0.75rem', borderRadius: '6px', 
                  backgroundColor: selectedUserId ? 'var(--primary)' : 'var(--border)', 
                  color: selectedUserId ? 'white' : 'var(--text-muted)',
                  fontWeight: 600,
                  marginTop: '0.5rem'
                }}
              >
                {loading ? 'Assigning...' : 'Assign Staff'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
