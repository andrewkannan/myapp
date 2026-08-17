'use client';

import { useEffect, useState } from 'react';

type User = {
  id: string;
  abbreviation: string;
  fullName: string;
  role: string;
};

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>AsiaMedic Roster Management</h1>
        <p style={{ color: '#64748b' }}>Overview of scheduled staff and modalities</p>
      </header>

      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Staff Roster ({users.length})</h2>
        {loading ? (
          <p>Loading staff data...</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {users.map(user => (
              <div key={user.id} style={{
                padding: '1rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                backgroundColor: 'var(--surface)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.25rem' }}>{user.abbreviation}</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>{user.role}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
