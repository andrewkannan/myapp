'use client';

import { useState, useMemo } from 'react';
import { User, Shift, Station } from '@/app/page';
import { X, Trash2, Calendar, Clock, CalendarRange, Ban, RotateCcw } from 'lucide-react';
import StaffPicker from './StaffPicker';

interface AssignmentModalProps {
  date: Date;
  station: Station | null;
  statusType: 'Scheduled' | 'Leave' | 'MC' | 'Off' | 'TimeOff';
  currentShifts: Shift[];
  allShifts: Shift[];
  users: User[];
  onClose: () => void;
  onRefresh: () => void;
}

type Mode = 'single' | 'range';
type Period = 'Full' | 'AM' | 'PM';

function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PERIOD_LABELS: Record<Period, { label: string; color: string; bg: string }> = {
  Full: { label: 'Full Day', color: '#1d4ed8', bg: '#EFF6FF' },
  AM:   { label: 'AM Only',  color: '#0369a1', bg: '#E0F2FE' },
  PM:   { label: 'PM Only',  color: '#c2410c', bg: '#FFF7ED' },
};

function getUserColor(abbreviation: string) {
  const hash = abbreviation.split('').reduce((acc, c) => c.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 55%, 92%)`,
    text: `hsl(${hue}, 60%, 28%)`,
    border: `hsl(${hue}, 55%, 70%)`,
  };
}

function InlineRemarkEditor({ shift, onUpdate }: { shift: Shift, onUpdate: (id: string, val: string) => void }) {
  const [val, setVal] = useState(shift.remarks || '');
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setTimeout(() => {
            setIsFocused(false);
            if (val !== (shift.remarks || '')) {
              onUpdate(shift.id, val);
            }
          }, 150);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        placeholder="+ remark"
        style={{
          fontSize: '0.65rem', padding: '2px 6px', width: '130px',
          border: isFocused ? '1px solid var(--primary)' : '1px solid transparent',
          borderRadius: '4px',
          backgroundColor: isFocused ? 'var(--surface)' : 'rgba(0,0,0,0.04)', 
          color: 'var(--text-muted)',
          outline: 'none', fontStyle: val ? 'italic' : 'normal',
          transition: 'all 0.15s'
        }}
        onMouseEnter={e => { if (!isFocused) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.08)'; }}
        onMouseLeave={e => { if (!isFocused) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'; }}
      />
      {isFocused && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '2px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px', display: 'flex', gap: '4px', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          {['ML', 'UL', 'AL'].map(quick => (
            <button
              key={quick}
              onMouseDown={e => {
                e.preventDefault(); // Prevents input from losing focus
                setVal(v => v ? `${v} ${quick}` : quick);
              }}
              onTouchStart={e => {
                e.preventDefault();
                setVal(v => v ? `${v} ${quick}` : quick);
              }}
              style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '2px', border: 'none', backgroundColor: '#EFF6FF', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600 }}
            >
              {quick}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssignmentModal({
  date, station, statusType, currentShifts, allShifts, users, onClose, onRefresh
}: AssignmentModalProps) {
  const [mode, setMode] = useState<Mode>('single');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>('Full');
  const [remarks, setRemarks] = useState('');
  const [dateFrom, setDateFrom] = useState(toInputDate(date));
  const [dateTo, setDateTo]   = useState(toInputDate(date));
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [skipPH, setSkipPH]   = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const conflictUserIds = useMemo(() => {
    return allShifts
      .filter(s => {
        const sd = new Date(s.date);
        return sd.getDate() === date.getDate() &&
               sd.getMonth() === date.getMonth() &&
               sd.getFullYear() === date.getFullYear() &&
               s.status === 'Scheduled' &&
               s.stationId !== station?.id;
      })
      .map(s => s.userId);
  }, [allShifts, date, station]);

  const estimatedDays = useMemo(() => {
    if (mode === 'single') return 1;
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    if (end < start) return 0;
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay();
      if (skipWeekends && (dow === 0 || dow === 6)) { cur.setDate(cur.getDate() + 1); continue; }
      count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [mode, dateFrom, dateTo, skipWeekends]);

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedUserIds.length === 0) { setError('Please select at least one staff member.'); return; }
    setError('');
    setLoading(true);
    try {
      const promises = selectedUserIds.map(userId =>
        fetch('/api/roster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            ...(mode === 'range'
              ? { dateFrom: new Date(dateFrom).toISOString(), dateTo: new Date(dateTo).toISOString() }
              : { date: date.toISOString() }
            ),
            stationId: station?.id || null,
            status: statusType,
            shiftPeriod: period,
            remarks: remarks || null,
            skipWeekends,
            skipPublicHolidays: skipPH,
          })
        })
      );
      const results = await Promise.all(promises);
      if (results.every(r => r.ok)) {
        onRefresh();
        setSelectedUserIds([]);
        setRemarks('');
      } else {
        setError('Some assignments failed. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (shiftId: string) => {
    setLoading(true);
    try {
      await fetch(`/api/roster?id=${shiftId}`, { method: 'DELETE' });
      onRefresh();
    } finally { setLoading(false); }
  };

  // Cancel = keep record, mark as Cancelled (shows strikethrough in grid)
  const handleCancel = async (shift: Shift) => {
    const isCancelled = shift.status === 'Cancelled';
    setLoading(true);
    try {
      await fetch(`/api/roster?id=${shift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: isCancelled ? 'Scheduled' : 'Cancelled',
        })
      });
      onRefresh();
    } finally { setLoading(false); }
  };

  const handleUpdateShift = async (shiftId: string, payload: Record<string, any>) => {
    try {
      await fetch(`/api/roster?id=${shiftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const periodInfo = PERIOD_LABELS[period];

  const headerLabel =
    statusType === 'TimeOff' ? 'Time Off' :
    statusType === 'Leave'   ? 'Leave' :
    statusType === 'MC'      ? 'Medical Leave' :
    statusType === 'Off'     ? 'Day Off' :
    station?.name || 'Scheduled';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '14px',
        width: '100%', maxWidth: '520px', maxHeight: '92vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, backgroundColor: 'var(--header-bg)',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {headerLabel}
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
              {date.toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '0.25rem', borderRadius: '6px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Currently Assigned */}
          {currentShifts.length > 0 && (
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
                {statusType === 'Scheduled' ? 'Currently Assigned' : `Currently on ${statusType}`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {currentShifts.map(shift => {
                  const hash = shift.user.abbreviation.split('').reduce((acc, c) => c.charCodeAt(0) + ((acc << 5) - acc), 0);
                  const hue = Math.abs(hash) % 360;
                  const isCancelled = shift.status === 'Cancelled';
                  const periodMeta = PERIOD_LABELS[shift.shiftPeriod as Period] || PERIOD_LABELS.Full;
                  return (
                    <div key={shift.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem', borderRadius: '8px',
                      border: `1px solid ${isCancelled ? '#FCA5A5' : 'var(--border)'}`,
                      backgroundColor: isCancelled ? '#FEF2F2' : 'var(--background)',
                      opacity: isCancelled ? 0.85 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          backgroundColor: `hsl(${hue}, 55%, ${isCancelled ? '85%' : '92%'})`,
                          color: `hsl(${hue}, 60%, ${isCancelled ? '40%' : '28%'})`,
                          border: `1px solid hsl(${hue}, 55%, 70%)`,
                          padding: '2px 8px', borderRadius: '9999px',
                          fontSize: '0.75rem', fontWeight: 700,
                          textDecoration: isCancelled ? 'line-through' : 'none',
                        }}>
                          {shift.user.abbreviation}
                        </div>
                        <div>
                          <select
                            value={shift.userId}
                            onChange={e => handleUpdateShift(shift.id, { userId: e.target.value })}
                            disabled={isCancelled || loading}
                            style={{
                              fontSize: '0.8rem', fontWeight: 600,
                              textDecoration: isCancelled ? 'line-through' : 'none',
                              color: isCancelled ? 'var(--text-muted)' : 'var(--foreground)',
                              backgroundColor: 'transparent', border: '1px solid transparent', outline: 'none', cursor: 'pointer', padding: '0 2px'
                            }}
                          >
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.fullName || u.abbreviation}</option>
                            ))}
                          </select>
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '2px', alignItems: 'center' }}>
                            {!isCancelled ? (
                              <select
                                value={shift.shiftPeriod || 'Full'}
                                onChange={e => handleUpdateShift(shift.id, { shiftPeriod: e.target.value })}
                                disabled={loading}
                                style={{
                                  fontSize: '0.65rem', fontWeight: 700, padding: '1px 2px',
                                  borderRadius: '4px', backgroundColor: periodMeta.bg, color: periodMeta.color,
                                  border: '1px solid transparent', outline: 'none', cursor: 'pointer'
                                }}
                              >
                                {Object.entries(PERIOD_LABELS).map(([k, m]) => (
                                  <option key={k} value={k}>{m.label}</option>
                                ))}
                              </select>
                            ) : (
                              <span style={{
                                fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px',
                                borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#DC2626'
                              }}>
                                Cancelled
                              </span>
                            )}
                            <InlineRemarkEditor shift={shift} onUpdate={(id, val) => handleUpdateShift(id, { remarks: val })} />
                          </div>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {/* Cancel / Restore toggle */}
                        <button
                          onClick={() => handleCancel(shift)}
                          disabled={loading}
                          title={isCancelled ? 'Restore assignment' : 'Cancel assignment (keeps record)'}
                          style={{
                            color: isCancelled ? '#16a34a' : '#d97706',
                            padding: '0.25rem', borderRadius: '4px',
                            opacity: loading ? 0.5 : 1,
                          }}
                        >
                          {isCancelled ? <RotateCcw size={15} /> : <Ban size={15} />}
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(shift.id)}
                          disabled={loading}
                          title="Remove from record entirely"
                          style={{ color: 'var(--danger)', padding: '0.25rem', borderRadius: '4px', opacity: loading ? 0.5 : 1 }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assignment Form */}
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Mode toggle */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                {statusType === 'Scheduled' ? 'Assignment Type' : 'Select Dates'}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['single', 'range'] as Mode[]).map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    flex: 1, padding: '0.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem',
                    border: `2px solid ${mode === m ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: mode === m ? 'var(--primary-light)' : 'transparent',
                    color: mode === m ? 'var(--primary)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                    transition: 'all 0.15s',
                  }}>
                    {m === 'single' ? <Calendar size={14} /> : <CalendarRange size={14} />}
                    {m === 'single' ? 'Single Day' : 'Date Range'}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range inputs */}
            {mode === 'range' && (
              <div style={{ backgroundColor: 'var(--background)', borderRadius: '8px', padding: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>From</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', backgroundColor: 'var(--surface)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>To</label>
                    <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem', backgroundColor: 'var(--surface)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={skipWeekends} onChange={e => setSkipWeekends(e.target.checked)} /> Skip weekends
                  </label>
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={skipPH} onChange={e => setSkipPH(e.target.checked)} /> Skip public holidays
                  </label>
                </div>
                {estimatedDays > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                    📅 {estimatedDays} working day{estimatedDays !== 1 ? 's' : ''} will be assigned
                  </div>
                )}
              </div>
            )}

            {/* Shift Period */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                {statusType === 'Scheduled' ? 'Shift Period' : 'Duration'}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(Object.entries(PERIOD_LABELS) as [Period, typeof PERIOD_LABELS[Period]][]).map(([key, meta]) => (
                  <button key={key} onClick={() => setPeriod(key)} style={{
                    flex: 1, padding: '0.45rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem',
                    border: `2px solid ${period === key ? meta.color : 'var(--border)'}`,
                    backgroundColor: period === key ? meta.bg : 'transparent',
                    color: period === key ? meta.color : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                    transition: 'all 0.15s',
                  }}>
                    <Clock size={12} />
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Staff Picker */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                Select Staff {selectedUserIds.length > 0 && <span style={{ color: 'var(--primary)' }}>({selectedUserIds.length} selected)</span>}
              </div>
              <StaffPicker
                users={users}
                selectedIds={selectedUserIds}
                conflictUserIds={conflictUserIds}
                onToggle={toggleUser}
              />
            </div>

            {/* Remarks */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                  {statusType === 'Scheduled' ? 'Time / Remarks' : 'Leave Type / Remarks'} <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['ML', 'UL', 'AL'].map(quick => (
                    <button 
                      key={quick}
                      onMouseDown={e => e.preventDefault()}
                      onTouchStart={e => e.preventDefault()}
                      onClick={() => setRemarks(r => r ? `${r} ${quick}` : quick)}
                      style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>
              <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder="e.g. ML, UL, 830-230..."
                style={{
                  width: '100%', padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)', borderRadius: '6px',
                  fontSize: '0.875rem', backgroundColor: 'var(--background)'
                }} />
            </div>

            {error && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#DC2626', fontSize: '0.8rem', fontWeight: 500 }}>
                {error}
              </div>
            )}

            {/* Confirm */}
            <button onClick={handleAssign} disabled={selectedUserIds.length === 0 || loading} style={{
              width: '100%', padding: '0.75rem', borderRadius: '8px',
              backgroundColor: selectedUserIds.length > 0 && !loading ? 'var(--primary)' : 'var(--border)',
              color: selectedUserIds.length > 0 && !loading ? 'white' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '0.9rem',
              transition: 'all 0.15s',
            }}>
              {loading ? 'Working...' :
                selectedUserIds.length === 0 ? 'Select staff to assign' :
                mode === 'range' && estimatedDays > 1
                  ? `Assign ${selectedUserIds.length} staff × ${estimatedDays} days`
                  : `Assign ${selectedUserIds.length} staff`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
