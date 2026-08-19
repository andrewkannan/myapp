'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, CheckCircle2, Navigation, LogOut } from 'lucide-react';

export default function MobileSchedulePage() {
  const [session, setSession] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          router.push('/login');
        } else {
          setSession(data.user);
        }
      });
  }, [router]);

  useEffect(() => {
    if (session) {
      fetch('/api/schedule')
        .then(res => res.json())
        .then(data => {
          setShifts(data.shifts || []);
          setLeaves(data.leaves || []);
          setLoading(false);
        });
    }
  }, [session]);

  if (!session || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#fbfbfd' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e5e5ea', borderTopColor: '#007aff', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Helper to format Date string
  const getLocalDateString = (d: Date) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);

  const days = [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: tomorrow },
    { label: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dayAfter), date: dayAfter }
  ];

  const getDayData = (date: Date) => {
    const dStr = getLocalDateString(date);
    const dayShifts = shifts.filter(s => {
      const shiftDate = typeof s.date === 'string' ? s.date.split('T')[0] : new Date(s.date).toISOString().split('T')[0];
      return shiftDate === dStr;
    });
    const dayLeaves = leaves.filter(l => {
      const leaveDate = typeof l.date === 'string' ? l.date.split('T')[0] : new Date(l.date).toISOString().split('T')[0];
      return leaveDate === dStr;
    });
    return { shifts: dayShifts, leaves: dayLeaves };
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#fbfbfd', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      padding: '2.5rem 1.5rem',
      paddingBottom: '8rem'
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em', margin: '0 0 0.25rem 0', lineHeight: 1.1 }}>
            {greeting()},<br/>{session.fullName?.split(' ')[0] || session.abbreviation}
          </h1>
          <p style={{ color: '#86868b', fontSize: '1.125rem', fontWeight: 500, margin: 0 }}>
            {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(today)}
          </p>
        </div>
        <button 
          onClick={() => router.push('/')}
          style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#e8e8ed', display: 'flex', justifyContent: 'center', alignItems: 'center', border: 'none', color: '#1d1d1f' }}
        >
          <Navigation size={20} />
        </button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {days.map((day, index) => {
          const { shifts, leaves } = getDayData(day.date);
          const isToday = index === 0;

          // Card Styles
          const cardStyle = {
            backgroundColor: '#ffffff',
            borderRadius: '32px',
            padding: '2rem',
            boxShadow: isToday ? '0 14px 34px rgba(0,0,0,0.06)' : '0 4px 14px rgba(0,0,0,0.03)',
            border: '1px solid rgba(0,0,0,0.02)',
            position: 'relative' as const,
            overflow: 'hidden' as const
          };

          return (
            <div key={day.label}>
              <div style={{ marginBottom: '1rem', paddingLeft: '0.5rem' }}>
                <h2 style={{ 
                  fontSize: isToday ? '1rem' : '1.25rem', 
                  fontWeight: 700, 
                  color: isToday ? '#ffffff' : '#1d1d1f', 
                  margin: 0,
                  padding: isToday ? '0.35rem 1rem' : '0',
                  backgroundColor: isToday ? '#68B04D' : 'transparent',
                  borderRadius: isToday ? '9999px' : '0',
                  display: 'inline-block',
                  letterSpacing: isToday ? '0.05em' : 'normal',
                  textTransform: isToday ? 'uppercase' : 'none'
                }}>
                  {day.label}
                </h2>
              </div>
              
              <div style={cardStyle}>
                {leaves.length > 0 ? (
                  // ON LEAVE
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#fef2f2', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ef4444' }}>
                      <Calendar size={28} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.375rem', fontWeight: 700, color: '#1d1d1f' }}>On Leave</h3>
                      <p style={{ margin: 0, color: '#ef4444', fontWeight: 600, fontSize: '1rem' }}>
                        {leaves.map(l => l.type).join(', ')}
                      </p>
                    </div>
                  </div>
                ) : shifts.length > 0 ? (
                  // HAS SHIFTS
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {shifts.map((shift, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderTop: i > 0 ? '1px solid #f5f5f7' : 'none', paddingTop: i > 0 ? '1.5rem' : 0 }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#f5f5f7', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#007aff' }}>
                          <MapPin size={28} strokeWidth={2.5} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.375rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
                            {shift.station?.name || 'Unknown Station'}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#86868b', fontSize: '1rem', fontWeight: 500 }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '4px', backgroundColor: shift.shiftPeriod === 'AM' ? '#ff9500' : shift.shiftPeriod === 'PM' ? '#5856d6' : '#34c759' }} />
                            {shift.shiftPeriod === 'AM' ? 'Morning Shift' : shift.shiftPeriod === 'PM' ? 'Afternoon Shift' : 'Full Day Shift'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // OFF / NOT SCHEDULED
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', opacity: 0.7 }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#f5f5f7', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#86868b' }}>
                      <CheckCircle2 size={28} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.375rem', fontWeight: 700, color: '#1d1d1f' }}>Not Scheduled</h3>
                      <p style={{ margin: 0, color: '#86868b', fontWeight: 500, fontSize: '1rem' }}>Rest Day</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
