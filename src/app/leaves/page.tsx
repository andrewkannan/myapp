import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

export default async function LeavesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userLeaves = await prisma.leave.findMany({
    where: { userId: session.id },
    orderBy: { date: 'desc' }
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>My Leaves</h1>
      
      <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Request New Leave</h2>
        {/* Placeholder for Leave Request Form */}
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Leave request form UI will be added here in the next update.</p>
      </div>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Leave History</h2>
      {userLeaves.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No leave records found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Period</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {userLeaves.map((leave) => (
              <tr key={leave.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem' }}>{new Date(leave.date).toLocaleDateString()}</td>
                <td style={{ padding: '0.75rem' }}>{leave.type}</td>
                <td style={{ padding: '0.75rem' }}>{leave.period}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold',
                    backgroundColor: leave.status === 'APPROVED' ? '#dcfce7' : '#fef9c3',
                    color: leave.status === 'APPROVED' ? '#166534' : '#854d0e'
                  }}>
                    {leave.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
