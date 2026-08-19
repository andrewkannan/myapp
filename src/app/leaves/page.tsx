import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import LeaveRequestForm from '@/components/leaves/LeaveRequestForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

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
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', color: '#4b5563', textDecoration: 'none', marginRight: '1rem', fontWeight: 500 }}>
          <ChevronLeft size={20} /> Back to Roster
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>My Leaves</h1>
      </div>
      
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', color: '#111827' }}>Request New Leave</h2>
        <LeaveRequestForm />
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
