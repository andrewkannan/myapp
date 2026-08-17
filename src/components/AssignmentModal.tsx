'use client';

import { useState, useMemo } from 'react';
import { User, Shift, Station } from '@/app/page';
import { X, Trash2, Calendar, Clock, CalendarRange } from 'lucide-react';
import StaffPicker from './StaffPicker';

interface AssignmentModalProps {
  date: Date;
  station: Station | null;
  statusType: 'Scheduled' | 'Leave' | 'MC' | 'Off';
  currentShifts: Shift[];
  allShifts: Shift[]; // all shifts for the month for conflict detection
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
  Full:  { label: 'Full Day', color: '#1d4ed8', bg: '#EFF6FF' },
  AM:    { label: 'AM Only',  color: '#0369a1', bg: '#E0F2FE' },
  PM:    { label: 'PM Only',  color: '#c2410c', bg: '#FFF7ED' },
};

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

  // Detect staff working elsewhere on the selected date (conflict detection)
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

  // Estimate days for bulk range
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
      // Post one request per selected user
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
      const allOk = results.every(r => r.ok);
      if (allOk) {
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
      const res = await fetch(`/api/roster?id=${shiftId}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch {}
    finally { setLoading(false); }
  };

  const periodInfo = PERIOD_LABELS[period];

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
        width: '100%',
        maxWidth: '520px',
        maxHeight: '92vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
          backgroundColor: 'var(--header-bg)',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {station ? `${station.name}` : statusType}
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
                Currently Assigned
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {currentShifts.map(shift => {
                  const hash = shift.user.abbreviation.split('').reduce((acc, c) => c.charCodeAt(0) + ((acc << 5) - acc), 0);
                  const hue = Math.abs(hash) % 360;
                  const periodMeta = PERIOD_LABELS[shift.shiftPeriod as Period] || PERIOD_LABELS.Full;
                  return (
                    <div key={shift.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem', borderRadius: '8px',
                      border: '1px solid var(--border)', backgroundColor: 'var(--background)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          backgroundColor: `hsl(${hue}, 55%, 92%)`,
                          color: `hsl(${hue}, 60%, 28%)`,
                          border: `1px solid hsl(${hue}, 55%, 70%)`,
                          padding: '2px 8px', borderRadius: '9999px',
                          fontSize: '0.75rem', fontWeight: 700,
                        }}>
                          {shift.user.abbreviation}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{shift.user.fullName}</div>
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '2px', alignItems: 'center' }}>
                            <span style={{
                              fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px',
                              borderRadius: '4px', backgroundColor: periodMeta.bg, color: periodMeta.color
                            }}>
                              {periodMeta.label}
                            </span>
                            {shift.remarks && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                {shift.remarks}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(shift.id)} disabled={loading}
                        style={{ color: 'var(--danger)', padding: '0.25rem', borderRadius: '4px' }}>
                        <Trash2 size={15} />
                      </button>
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
                Assignment Type
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
                Shift Period
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
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.4rem' }}>
                Time / Remarks <span style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder="e.g. 830–230, from 1030, until 1pm..."
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

            {/* Confirm button */}
            <button onClick={handleAssign} disabled={selectedUserIds.length === 0 || loading} style={{
              width: '100%', padding: '0.75rem', borderRadius: '8px',
              backgroundColor: selectedUserIds.length > 0 && !loading ? 'var(--primary)' : 'var(--border)',
              color: selectedUserIds.length > 0 && !loading ? 'white' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '0.9rem',
              transition: 'all 0.15s',
            }}>
              {loading ? 'Assigning...' :
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
