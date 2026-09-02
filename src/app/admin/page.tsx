'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ArrowLeft, Users, MapPin, Activity, List, Upload, BarChart3, Mail } from 'lucide-react';

import { StaffManager } from '@/components/admin/StaffManager';
import { FacilityManager } from '@/components/admin/FacilityManager';
import { AuditViewer } from '@/components/admin/AuditViewer';
import { SystemListManager } from '@/components/admin/SystemListManager';
import { MasterLeaveViewer } from '@/components/admin/MasterLeaveViewer';
import { TimeOffManager } from '@/components/admin/TimeOffManager';
import { BulkUploader } from '@/components/admin/BulkUploader';
import { EmailManager } from '@/components/admin/EmailManager';
import AnalyticsViewer from '@/components/admin/AnalyticsViewer';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'staff' | 'facilities' | 'lists' | 'logs' | 'leaves' | 'timeoff' | 'upload' | 'emails'>('analytics');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        const user = data.user;
        const hasAdminAccess = user?.permissions?.some((p: string) => 
          ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE', 'AUDIT_VIEW', 'ROSTER_EDIT', 'LEAVE_VIEW_ALL', 'LEAVE_APPROVE', 'TIMEOFF_APPROVE', 'BULK_UPLOAD'].includes(p)
        );
        if (!user || !hasAdminAccess) {
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
        <style>{`
          .admin-header-title { display: block; font-size: 1.25rem; font-weight: 600; color: var(--primary); }
          .admin-header-left { display: flex; align-items: center; gap: 2rem; flex-direction: row; }
          .admin-header-name { font-size: 0.875rem; color: var(--text-muted); font-weight: 500; }
          @media (max-width: 768px) {
            .admin-header-title { display: none; }
            .admin-header-left { gap: 1rem; flex-direction: row-reverse; justify-content: flex-end; }
            .admin-header-name { display: none; }
          }
        `}</style>
        <div className="admin-header-left">
          <h1 className="admin-header-title">
            Admin Dashboard
          </h1>
          <button 
            onClick={() => router.push('/')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.4rem', 
              color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500,
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 0
            }}>
            <ArrowLeft size={16} /> Back to Roster
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="admin-header-name">
            {currentUser.fullName || currentUser.abbreviation}
            {currentUser.role ? ` (${currentUser.role})` : ''}
          </div>
          <button 
            onClick={() => {
              fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.href = '/login');
            }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
              backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: 'none', cursor: 'pointer',
              borderRadius: '6px', fontWeight: 500
            }}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, overflow: 'hidden' }}>
        {/* Navigation */}
        <aside style={{ 
          width: isMobile ? '100%' : '250px', 
          backgroundColor: 'var(--surface)', 
          borderRight: isMobile ? 'none' : '1px solid var(--border)', 
          borderBottom: isMobile ? '1px solid var(--border)' : 'none',
          padding: isMobile ? '0.5rem' : '1.5rem 1rem',
          flexShrink: 0,
          overflowX: isMobile ? 'auto' : 'visible'
        }}>
          <nav style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'row' : 'column', 
            gap: '0.5rem',
            width: isMobile ? 'max-content' : 'auto'
          }}>
            <TabButton 
              active={activeTab === 'analytics'} 
              onClick={() => setActiveTab('analytics')}
              icon={<BarChart3 size={18} />}
              label="Analytics & Reports"
              isMobile={isMobile}
            />
            {currentUser.permissions?.includes('STAFF_MANAGE') && (
              <TabButton 
                active={activeTab === 'staff'} 
                onClick={() => setActiveTab('staff')}
                icon={<Users size={18} />}
                label="Staff Management"
                isMobile={isMobile}
              />
            )}
            {(currentUser.permissions?.includes('LEAVE_VIEW_ALL') || currentUser.permissions?.includes('STAFF_MANAGE')) && (
              <TabButton 
                active={activeTab === 'leaves'} 
                onClick={() => setActiveTab('leaves')}
                icon={<List size={18} />}
                label="Master Leave Preview"
                isMobile={isMobile}
              />
            )}
            {(currentUser.permissions?.includes('TIMEOFF_APPROVE') || currentUser.permissions?.includes('STAFF_MANAGE')) && (
              <TabButton 
                active={activeTab === 'timeoff'} 
                onClick={() => setActiveTab('timeoff')}
                icon={<Activity size={18} />}
                label="Time-Off Claims"
                isMobile={isMobile}
              />
            )}
            {currentUser.permissions?.includes('FACILITY_MANAGE') && (
              <TabButton 
                active={activeTab === 'facilities'} 
                onClick={() => setActiveTab('facilities')}
                icon={<MapPin size={18} />}
                label="Facility Settings"
                isMobile={isMobile}
              />
            )}
            {(currentUser.permissions?.includes('BULK_UPLOAD') || currentUser.permissions?.includes('ROSTER_EDIT')) && (
              <TabButton 
                active={activeTab === 'upload'} 
                onClick={() => setActiveTab('upload')}
                icon={<Upload size={18} />}
                label="Bulk Upload"
                isMobile={isMobile}
              />
            )}
            {currentUser.permissions?.includes('ROLE_MANAGE') && (
              <TabButton 
                active={activeTab === 'lists'} 
                onClick={() => setActiveTab('lists')}
                icon={<List size={18} />}
                label="System Lists & Roles"
                isMobile={isMobile}
              />
            )}
            {currentUser.permissions?.includes('AUDIT_VIEW') && (
              <TabButton 
                active={activeTab === 'logs'} 
                onClick={() => setActiveTab('logs')}
                icon={<Activity size={18} />}
                label="Audit Logs"
                isMobile={isMobile}
              />
            )}
            {currentUser.permissions?.includes('STAFF_MANAGE') && (
              <TabButton 
                active={activeTab === 'emails'} 
                onClick={() => setActiveTab('emails')}
                icon={<Mail size={18} />}
                label="Onboarding Emails"
                isMobile={isMobile}
              />
            )}
          </nav>
        </aside>

        {/* Content Area */}
        <section style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', overflowY: 'auto', backgroundColor: 'var(--background)' }}>
          <div style={{ display: activeTab === 'analytics' ? 'block' : 'none', height: '100%' }}>
            <AnalyticsViewer />
          </div>
          <div style={{ display: activeTab === 'staff' ? 'block' : 'none', height: '100%' }}>
            <StaffManager />
          </div>
          <div style={{ display: activeTab === 'leaves' ? 'block' : 'none', height: '100%' }}>
            <MasterLeaveViewer />
          </div>
          <div style={{ display: activeTab === 'timeoff' ? 'block' : 'none', height: '100%' }}>
            <TimeOffManager />
          </div>
          <div style={{ display: activeTab === 'facilities' ? 'block' : 'none', height: '100%' }}>
            <FacilityManager />
          </div>
          <div style={{ display: activeTab === 'upload' ? 'block' : 'none', height: '100%' }}>
            <BulkUploader />
          </div>
          <div style={{ display: activeTab === 'emails' ? 'block' : 'none', height: '100%' }}>
            <EmailManager isActive={activeTab === 'emails'} />
          </div>
          <div style={{ display: activeTab === 'lists' ? 'block' : 'none', height: '100%' }}>
            <SystemListManager />
          </div>
          <div style={{ display: activeTab === 'logs' ? 'block' : 'none', height: '100%' }}>
            <AuditViewer />
          </div>
        </section>
      </div>
    </main>
  );
}

function TabButton({ active, onClick, icon, label, isMobile }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isMobile?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1rem', borderRadius: '8px',
        width: isMobile ? 'auto' : '100%', whiteSpace: 'nowrap', textAlign: 'left',
        backgroundColor: active ? 'var(--primary-light)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        fontWeight: active ? 600 : 500,
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        border: 'none',
      }}
      onMouseOver={e => { if (!active) { e.currentTarget.style.backgroundColor = 'var(--cell-hover)'; e.currentTarget.style.color = 'var(--foreground)'; } }}
      onMouseOut={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
    >
      {icon}
      {label}
    </button>
  );
}
