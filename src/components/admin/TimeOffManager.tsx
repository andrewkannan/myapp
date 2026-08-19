'use client';
import { useState, useEffect } from 'react';

export function TimeOffManager() {
  const [records, setRecords] = useState<any[]>([]);
  const [filter, setFilter] = useState('PENDING'); // PENDING or ALL

  useEffect(() => {
    fetchRecords();
  }, [filter]);

  const fetchRecords = async () => {
    const res = await fetch('/api/time-off/admin');
    if (res.ok) {
      const data = await res.json();
      if (filter === 'PENDING') {
        setRecords(data.filter((r: any) => r.status === 'PENDING'));
      } else {
        setRecords(data);
      }
    }
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const res = await fetch('/api/time-off/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    if (res.ok) {
      fetchRecords();
    } else {
      alert('Failed to update record');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Time-Off & Overtime Approvals</h2>
          <p className="text-sm text-gray-500">Review and approve staff time-off claims and logged overtime.</p>
        </div>
        <div className="space-x-2">
          <button 
            className={\px-4 py-2 rounded-md border text-sm font-semibold \\} 
            onClick={() => setFilter('PENDING')}>Pending</button>
          <button 
            className={\px-4 py-2 rounded-md border text-sm font-semibold \\} 
            onClick={() => setFilter('ALL')}>All Records</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-xs font-semibold text-gray-600">STAFF</th>
              <th className="p-3 text-xs font-semibold text-gray-600">DATE</th>
              <th className="p-3 text-xs font-semibold text-gray-600">REASON</th>
              <th className="p-3 text-xs font-semibold text-gray-600">TIME</th>
              <th className="p-3 text-xs font-semibold text-gray-600 text-right">HOURS</th>
              <th className="p-3 text-xs font-semibold text-gray-600">STATUS</th>
              <th className="p-3 text-xs font-semibold text-gray-600 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3 font-semibold text-sm">{r.user?.fullName || r.user?.abbreviation}</td>
                <td className="p-3 text-sm">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                <td className="p-3 text-sm">{r.reason} {r.studyAccNo && <span className="text-gray-400 text-xs ml-2">#{r.studyAccNo}</span>}</td>
                <td className="p-3 text-sm text-gray-500">{r.startTime && r.endTime ? \\ - \\ : '-'}</td>
                <td className={\p-3 text-sm text-right font-bold \\}>
                  {r.hours > 0 ? '+' : ''}{r.hours} HRS
                </td>
                <td className="p-3">
                  <span className={\px-2 py-1 text-xs rounded-full \\}>
                    {r.status}
                  </span>
                </td>
                <td className="p-3 text-right space-x-2">
                  {r.status === 'PENDING' && (
                    <>
                      <button className="px-3 py-1 text-xs rounded-md border border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleAction(r.id, 'APPROVED')}>Approve</button>
                      <button className="px-3 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleAction(r.id, 'REJECTED')}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500 text-sm">No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
