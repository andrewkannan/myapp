'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ArrowLeft, Users, MapPin, Activity } from 'lucide-react';

import { StaffManager } from '@/components/admin/StaffManager';
import { FacilityManager } from '@/components/admin/FacilityManager';
import { AuditViewer } from '@/components/admin/AuditViewer';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'staff' | 'facilities' | 'logs'>('staff');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        const user = data.user;
        if (!user || !['ADMIN', 'MANAGER'].includes(user.accessLevel)) {
          router.push('/');
        } else {
          setCurrentUser(user);
        }
      });
  }, [router]);

  if (!currentUser) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Admin Portal...</div>;

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        padding: '1rem 1.5rem', 
        borderBottom: '1px solid var(--border)', 
        backgroundColor: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>
            Admin Dashboard
          </h1>
          <button 
            onClick={() => router.push('/')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.4rem', 
              color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500,
              background: 'transparent', border: 'none', cursor: 'pointer' 
            }}>
            <ArrowLeft size={16} /> Back to Roster
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {currentUser.fullName || currentUser.abbreviation} ({currentUser.accessLevel})
          </div>
          <button 
            onClick={() => {
              fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.href = '/login');
            }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
              backgroundColor: '#fee2e2', color: 'var(--danger)', border: 'none', cursor: 'pointer',
              borderRadius: '6px', fontWeight: 500
            }}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Nav */}
        <aside style={{ width: '250px', backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '1.5rem 1rem' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <TabButton 
              active={activeTab === 'staff'} 
              onClick={() => setActiveTab('staff')}
              icon={<Users size={18} />}
              label="Staff Management"
            />
            <TabButton 
              active={activeTab === 'facilities'} 
              onClick={() => setActiveTab('facilities')}
              icon={<MapPin size={18} />}
              label="Facilities"
            />
            <TabButton 
              active={activeTab === 'logs'} 
              onClick={() => setActiveTab('logs')}
              icon={<Activity size={18} />}
              label="Audit Logs"
            />
          </nav>
        </aside>

        {/* Content Area */}
        <section style={{ flex: 1, padding: '2rem', overflowY: 'auto', backgroundColor: 'var(--background)' }}>
          {activeTab === 'staff' && <StaffManager />}
          {activeTab === 'facilities' && <FacilityManager />}
          {activeTab === 'logs' && <AuditViewer />}
        </section>
      </div>
    </main>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1rem', borderRadius: '8px',
        width: '100%', textAlign: 'left',
        backgroundColor: active ? 'var(--primary)' : 'transparent',
        color: active ? 'white' : 'var(--foreground)',
        fontWeight: active ? 600 : 500,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        border: 'none',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
