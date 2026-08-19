'use client';
import { useState, useEffect } from 'react';

export default function TimeOffPage() {
  const [session, setSession] = useState<any>(null);
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
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.user) setSession(data.user);
    });
    fetchRecords();
  }, []);

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

  if (!session) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold">OVERTIME TIME-OFF CLAIM CHIT</h1>
          <p className="text-gray-500 mt-2">Staff Name: <span className="font-semibold text-black">{session.fullName || session.abbreviation}</span></p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 uppercase font-semibold">Total Balance</p>
          <p className="text-4xl font-bold text-blue-600">{balance.toFixed(2)} HRS</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-bold mb-4">Submit New Entry</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-4 flex items-center space-x-4 mb-2">
            <label className="font-semibold text-sm">Entry Type:</label>
            <div className="flex items-center space-x-2">
              <input type="radio" id="earn" checked={!isClaim} onChange={() => setIsClaim(false)} className="w-4 h-4" />
              <label htmlFor="earn" className="font-semibold text-green-700">Earn Overtime (+)</label>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <input type="radio" id="claim" checked={isClaim} onChange={() => setIsClaim(true)} className="w-4 h-4" />
              <label htmlFor="claim" className="font-semibold text-red-700">Claim Time-Off (-)</label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Date</label>
            <input className="w-full border rounded-md px-3 py-2 text-sm" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1">Procedure / Reason</label>
            <input className="w-full border rounded-md px-3 py-2 text-sm" type="text" placeholder="e.g. US THYROID or Claim time off" value={reason} onChange={e => setReason(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Study Acc No. (Optional)</label>
            <input className="w-full border rounded-md px-3 py-2 text-sm" type="text" value={studyAccNo} onChange={e => setStudyAccNo(e.target.value)} />
          </div>
          
          <div>
            <label className="block text-xs font-semibold mb-1">Start Time (Optional)</label>
            <input className="w-full border rounded-md px-3 py-2 text-sm" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">End Time (Optional)</label>
            <input className="w-full border rounded-md px-3 py-2 text-sm" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Hours</label>
            <input className="w-full border rounded-md px-3 py-2 text-sm" type="number" step="0.25" min="0.25" placeholder="e.g. 1.5" value={hours} onChange={e => setHours(e.target.value)} required />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-black text-white rounded-md py-2 text-sm font-semibold hover:bg-gray-800">Submit</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-xs font-semibold text-gray-600">NO.</th>
              <th className="p-3 text-xs font-semibold text-gray-600">DATE & DAY</th>
              <th className="p-3 text-xs font-semibold text-gray-600">PROCEDURE/REASON</th>
              <th className="p-3 text-xs font-semibold text-gray-600">STUDY ACC. NO.</th>
              <th className="p-3 text-xs font-semibold text-gray-600">START TIME</th>
              <th className="p-3 text-xs font-semibold text-gray-600">END TIME</th>
              <th className="p-3 text-xs font-semibold text-gray-600 text-right">OVERTIME (HR)</th>
              <th className="p-3 text-xs font-semibold text-gray-600 text-right">TOTAL HOURS</th>
              <th className="p-3 text-xs font-semibold text-gray-600">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3 text-sm">{i + 1}</td>
                <td className="p-3 text-sm">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                <td className="p-3 text-sm">{r.reason}</td>
                <td className="p-3 text-sm">{r.studyAccNo}</td>
                <td className="p-3 text-sm">{r.startTime}</td>
                <td className="p-3 text-sm">{r.endTime}</td>
                <td className={\p-3 text-sm text-right font-semibold \\}>
                  {r.hours > 0 ? '+' : ''}{r.hours} HRS
                </td>
                <td className="p-3 text-sm text-right font-bold bg-blue-50/50">
                  {r.status === 'APPROVED' ? \\ HRS\ : '-'}
                </td>
                <td className="p-3">
                  <span className={\px-2 py-1 text-xs rounded-full \\}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500 text-sm">No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
