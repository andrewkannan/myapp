import React, { useState, useEffect } from 'react';
import Select from 'react-select';

export default function LeaveModal({ date, leave, users, onClose, onRefresh }: { date: Date, leave?: any, users: any[], onClose: () => void, onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'leave' | 'timeoff'>(leave?.type === 'TO' ? 'timeoff' : 'leave');

  const initDateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(initDateStr);
  const [endDate, setEndDate] = useState(initDateStr);

  // Leave fields
  const [type, setType] = useState('AL');
  const [period, setPeriod] = useState('FULL');
  const [remarks, setRemarks] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [status, setStatus] = useState('APPROVED');

  // Time-off fields
  const [reason, setReason] = useState('');
  const [isOtherReason, setIsOtherReason] = useState(false);
  const [studyAccNo, setStudyAccNo] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hours, setHours] = useState('');
  const [isClaim, setIsClaim] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    if (leave) {
      const leaveDate = new Date(leave.date);
      const ldStr = new Date(leaveDate.getTime() - leaveDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      setStartDate(ldStr);
      setEndDate(ldStr);

      if (leave.type === 'TO') {
        setMode('timeoff');
        const r = leave.remarks || '';
        setReason(r);
        setIsOtherReason(!['TO', 'Sat Off', 'PM Off', 'PH Off in Lieu'].includes(r));
        setTargetUserId(leave.userId);
        setStatus(leave.status || 'PENDING');
        if (leave.startTime) setStartTime(leave.startTime);
        if (leave.endTime) setEndTime(leave.endTime);
        if (leave.hours !== undefined) {
          setHours(Math.abs(leave.hours).toString());
          setIsClaim(leave.hours <= 0);
        }
        if (leave.studyAccNo) setStudyAccNo(leave.studyAccNo);
      } else {
        setMode('leave');
        setType(leave.type);
        setPeriod(leave.period);
        setRemarks(leave.remarks || '');
        setTargetUserId(leave.userId);
        setStatus(leave.status || 'APPROVED');
      }
    }
  }, [leave]);

  // Auto-calc hours from time range
  useEffect(() => {
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const diff = (eh + em / 60) - (sh + sm / 60);
      if (diff > 0) setHours(diff.toFixed(2));
    }
  }, [startTime, endTime]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId && !leave) {
      setError('Please select a staff member.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start date and End date are required.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('End date cannot be earlier than start date.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      let res;
      if (leave && leave.type !== 'TO') {
        const updateDate = new Date(startDate);
        const updateDateStr = new Date(updateDate.getTime() - updateDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        res = await fetch(`/api/leaves/${leave.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, period, remarks, status, date: updateDateStr })
        });
      } else {
        const datesArray = [];
        let current = new Date(startDate);
        const end = new Date(endDate);
        while (current <= end) {
          datesArray.push(new Date(current.getTime() - current.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }

        res = await fetch('/api/leaves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dates: datesArray, type, period, remarks, targetUserId, status })
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

  const handleSubmitTimeOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId && !leave) {
      setError('Please select a staff member.');
      return;
    }
    
    const needsHours = reason === 'TO' || isOtherReason;
    if (!reason || (needsHours && !hours)) {
      setError('Reason and Hours are required for this type of time off.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const dateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      let submittedHours = needsHours ? parseFloat(hours) : 0;
      if (isClaim) submittedHours = -Math.abs(submittedHours);
      else submittedHours = Math.abs(submittedHours);

      const payload: any = {
        date: dateStr,
        reason,
        studyAccNo: needsHours ? studyAccNo : null,
        startTime: needsHours ? startTime : null,
        endTime: needsHours ? endTime : null,
        hours: submittedHours,
        ...(targetUserId ? { targetUserId } : {})
      };
      
      let method = 'POST';
      if (leave && leave.type === 'TO') {
        method = 'PUT';
        payload.id = leave.id;
      }

      const res = await fetch('/api/time-off', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save time off');
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
    if (!confirm('Are you sure you want to delete this?')) return;
    setLoading(true);
    try {
      let res;
      if (leave.type === 'TO') {
        res = await fetch(`/api/time-off?id=${leave.id}`, { method: 'DELETE' });
      } else {
        res = await fetch(`/api/leaves/${leave.id}`, { method: 'DELETE' });
      }
      if (!res.ok) throw new Error('Failed to delete');
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.9rem' };
  const labelStyle = { display: 'block' as const, fontSize: '0.875rem', fontWeight: 600 as const, marginBottom: '0.25rem' };

  const sortedUsers = [...users].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  const userOptions = sortedUsers.map(u => ({
    value: u.id,
    label: `${u.fullName || ''} (${u.abbreviation || ''})`
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '16px', width: '90%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: 700 }}>
          {leave ? (mode === 'timeoff' ? 'Edit Time Off' : 'Edit Leave') : 'Add Entry'}
        </h2>
        <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{date.toLocaleDateString()}</p>

        {/* Mode toggle for new entries */}
        {!leave && (
          <div style={{ display: 'flex', gap: '0', marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setMode('leave')} style={{ flex: 1, padding: '0.5rem', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', backgroundColor: mode === 'leave' ? 'var(--primary)' : 'transparent', color: mode === 'leave' ? 'white' : 'var(--foreground)' }}>
              Leave
            </button>
            <button type="button" onClick={() => setMode('timeoff')} style={{ flex: 1, padding: '0.5rem', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', backgroundColor: mode === 'timeoff' ? '#d97706' : 'transparent', color: mode === 'timeoff' ? 'white' : 'var(--foreground)' }}>
              Time Off
            </button>
          </div>
        )}

        {error && <div style={{ color: 'var(--danger, red)', fontSize: '0.85rem', marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '6px' }}>{error}</div>}

        {mode === 'leave' ? (
          /* ===== LEAVE FORM ===== */
          <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Staff Member</label>
              <Select 
                options={userOptions}
                value={userOptions.find(opt => opt.value === targetUserId) || null}
                onChange={(option: any) => setTargetUserId(option?.value || '')}
                isDisabled={!!leave}
                placeholder="Select staff..."
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: leave ? '#f3f4f6' : 'white',
                    borderRadius: '6px',
                    borderColor: 'var(--border)',
                  })
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Start Date</label>
                <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} disabled={!!leave && leave.type !== 'TO'} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>End Date</label>
                <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} disabled={!!leave && leave.type !== 'TO'} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Leave Type</label>
              <select required value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                <option value="AL">Annual Leave (AL)</option>
                <option value="MC">Medical Certificate (MC)</option>
                <option value="ML">Maternity Leave (ML)</option>
                <option value="CCL">Child Care Leave (CCL)</option>
                <option value="UL">Urgent Leave (UL)</option>
                <option value="NS">Reservist Leave (NS)</option>
                <option value="HL">Hospitalisation Leave (HL)</option>
                <option value="UPL">Unpaid Leave (UPL)</option>
                <option value="BL">Birthday Leave (BL)</option>
                <option value="MGL">Marriage Leave (MGL)</option>
                <option value="CL">Compassionate Leave (CL)</option>
                <option value="TL">Training Leave (TL)</option>
                <option value="NPL">No Pay Leave (NPL)</option>
                <option value="OFF">Off</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)} style={inputStyle}>
                <option value="FULL">Full Day</option>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Remarks (Optional)</label>
              <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                <option value="APPROVED">{type === 'AL' ? 'Confirmed (Approved)' : 'Approved'}</option>
                {type === 'AL' && <option value="BALLOT">Ballot</option>}
                <option value="PENDING">{type === 'AL' ? 'Pending in queue' : 'Pending'}</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              {leave && <button type="button" disabled={loading} onClick={handleDelete} style={{ flex: 1, backgroundColor: 'var(--danger, #ef4444)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>}
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        ) : (
          /* ===== TIME OFF FORM ===== */
          <form onSubmit={handleSubmitTimeOff} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Staff Member</label>
              <Select 
                options={userOptions}
                value={userOptions.find(opt => opt.value === targetUserId) || null}
                onChange={(option: any) => setTargetUserId(option?.value || '')}
                isDisabled={!!leave}
                placeholder="Select staff..."
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: leave ? '#f3f4f6' : 'white',
                    borderRadius: '6px',
                    borderColor: 'var(--border)',
                  })
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '999px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, border: '1px solid', borderColor: !isClaim ? '#16a34a' : 'var(--border)', backgroundColor: !isClaim ? '#dcfce7' : 'transparent', color: !isClaim ? '#166534' : 'var(--text-muted)' }}>
                <input type="radio" name="toType" checked={!isClaim} onChange={() => setIsClaim(false)} style={{ display: 'none' }} />
                + Add
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '999px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, border: '1px solid', borderColor: isClaim ? '#dc2626' : 'var(--border)', backgroundColor: isClaim ? '#fef2f2' : 'transparent', color: isClaim ? '#991b1b' : 'var(--text-muted)' }}>
                <input type="radio" name="toType" checked={isClaim} onChange={() => setIsClaim(true)} style={{ display: 'none' }} />
                - Claim
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={labelStyle}>Reason *</label>
              <select 
                value={isOtherReason ? 'Other' : reason} 
                onChange={e => {
                  if (e.target.value === 'Other') {
                    setIsOtherReason(true);
                    setReason('');
                  } else {
                    setIsOtherReason(false);
                    setReason(e.target.value);
                  }
                }} 
                style={inputStyle}
                required
              >
                <option value="" disabled>Select a reason...</option>
                <option value="TO">TO</option>
                <option value="Sat Off">Sat Off</option>
                <option value="PM Off">PM Off</option>
                <option value="PH Off in Lieu">PH Off in Lieu</option>
                <option value="Other">Other (Please specify)</option>
              </select>

              {isOtherReason && (
                <input 
                  type="text" 
                  required 
                  value={reason} 
                  onChange={e => setReason(e.target.value)} 
                  placeholder="e.g. Worked overtime on Saturday" 
                  style={inputStyle} 
                />
              )}
            </div>

            {(reason === 'TO' || isOtherReason) && (
              <>
                <div>
                  <label style={labelStyle}>Study/Acc No (Optional)</label>
                  <input type="text" value={studyAccNo} onChange={e => setStudyAccNo(e.target.value)} style={inputStyle} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Start Time</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>End Time</label>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Hours *</label>
                  <input type="number" required step="0.25" min="0.25" value={hours} onChange={e => setHours(e.target.value)} style={inputStyle} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              {leave && <button type="button" disabled={loading} onClick={handleDelete} style={{ flex: 1, backgroundColor: 'var(--danger, #ef4444)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>}
              <button type="submit" disabled={loading} style={{ flex: 1, backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, padding: '0.5rem' }}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
