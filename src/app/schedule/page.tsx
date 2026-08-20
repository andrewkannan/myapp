'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, CheckCircle2, Navigation, MoreVertical, CalendarDays, Activity, Clock, Settings, Moon } from 'lucide-react';

export default function MobileSchedulePage() {
  const [session, setSession] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const fetchSchedule = () => {
    setLoading(true);
    setError(null);
    fetch('/api/schedule')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load schedule');
        return res.json();
      })
      .then(data => {
        setShifts(data.shifts || []);
        setLeaves(data.leaves || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (session) {
      fetchSchedule();
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
    <div className="animate-fade-in" style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '1.5rem', paddingBottom: '4rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <header className="animate-slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', position: 'relative', zIndex: 50 }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em', margin: '0 0 0.25rem 0', lineHeight: 1.1 }}>
            {greeting()},<br/>{session.fullName?.split(' ')[0] || session.abbreviation}
          </h1>
          <p style={{ color: '#86868b', fontSize: '1.125rem', fontWeight: 500, margin: 0 }}>
            {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(today)}
          </p>
        </div>
        
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#e8e8ed', display: 'flex', justifyContent: 'center', alignItems: 'center', border: 'none', color: '#1d1d1f' }}
          >
            <MoreVertical size={20} />
          </button>
          
          {menuOpen && (
            <div className="animate-menu" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', width: '220px', backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '16px', padding: '0.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.05)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button onClick={() => router.push('/?view=grid')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', backgroundColor: 'transparent', border: 'none', color: '#1d1d1f', fontSize: '1rem', fontWeight: 500, width: '100%', textAlign: 'left' }}>
                <CalendarDays size={18} color="#007aff" /> Roster
              </button>
              <button onClick={() => router.push('/leaves')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', backgroundColor: 'transparent', border: 'none', color: '#1d1d1f', fontSize: '1rem', fontWeight: 500, width: '100%', textAlign: 'left' }}>
                <Activity size={18} color="#34c759" /> Leaves
              </button>
              <button onClick={() => router.push('/leaves?tab=timeoff')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', backgroundColor: 'transparent', border: 'none', color: '#1d1d1f', fontSize: '1rem', fontWeight: 500, width: '100%', textAlign: 'left' }}>
                <Clock size={18} color="#ff9500" /> Time Off
              </button>
              {session.permissions?.some((p: string) => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE', 'AUDIT_VIEW'].includes(p)) && (
                <>
                  <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.1)', margin: '4px 8px' }} />
                  <button onClick={() => router.push('/admin')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', backgroundColor: 'transparent', border: 'none', color: '#1d1d1f', fontSize: '1rem', fontWeight: 500, width: '100%', textAlign: 'left' }}>
                    <Settings size={18} color="#5856d6" /> Admin Dashboard
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', padding: '1.5rem', borderRadius: '24px', border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <p style={{ color: '#991b1b', margin: 0, fontWeight: 500 }}>{error}</p>
          <button onClick={fetchSchedule} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', fontWeight: 600, fontSize: '1rem' }}>Retry</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {days.map((day, index) => {
          const { shifts, leaves } = getDayData(day.date);
          const isToday = index === 0;

          // Card Styles
          // Card Styles
          const cardStyle = {
            backgroundColor: isToday ? '#f0fdf4' : '#ffffff',
            borderRadius: '32px',
            padding: '2rem',
            boxShadow: isToday ? '0 14px 34px rgba(34, 197, 94, 0.12)' : '0 4px 14px rgba(0,0,0,0.03)',
            border: isToday ? '2px solid #4ade80' : '1px solid rgba(0,0,0,0.02)',
            position: 'relative' as const,
            overflow: 'hidden' as const
          };

          const parseStationDisplay = (name: string) => {
            if (!name) return { base: '', time: null };
            const parts = name.split(' ');
            const last = parts[parts.length - 1];
            if (['830', '930', '1230', '230', '330', '430', '730', '1030', '1130'].includes(last)) {
              return { base: parts.slice(0, -1).join(' '), time: last };
            }
            return { base: name, time: null };
          };

          return (
            <div key={day.label} className={`animate-slide-up delay-${Math.min(index + 1, 5)}`}>
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
                {leaves.length === 0 && shifts.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#f5f5f7', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#86868b' }}>
                      <Moon size={28} />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.375rem', fontWeight: 700, color: '#86868b' }}>Off Day</h3>
                      <p style={{ margin: 0, color: '#86868b', fontSize: '1rem' }}>No schedule for today</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Render Leaves */}
                    {leaves.map((l, i) => (
                      <div key={`leave-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderBottom: shifts.length > 0 || i < leaves.length - 1 ? (isToday ? '1px solid #bbf7d0' : '1px solid #f5f5f7') : 'none', paddingBottom: shifts.length > 0 || i < leaves.length - 1 ? '1.5rem' : 0 }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: l.type === 'TO' ? '#fef3c7' : (isToday ? '#dcfce7' : '#fef2f2'), display: 'flex', justifyContent: 'center', alignItems: 'center', color: l.type === 'TO' ? '#d97706' : (isToday ? '#16a34a' : '#ef4444') }}>
                          {l.type === 'TO' ? <Clock size={28} /> : <Calendar size={28} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.375rem', fontWeight: 700, color: '#1d1d1f' }}>
                            {l.type === 'TO' ? 'Time Off' : 'On Leave'}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: l.type === 'TO' ? '#d97706' : (isToday ? '#15803d' : '#ef4444'), fontWeight: 600, fontSize: '1rem', flexWrap: 'wrap' }}>
                            <span>{l.type}</span>
                            {l.period && (
                              <span style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                {l.period}
                              </span>
                            )}
                            {l.status === 'PENDING' && (
                              <span style={{ backgroundColor: '#fef9c3', color: '#854d0e', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 700 }}>PENDING</span>
                            )}
                          </div>
                          {l.remarks && (
                            <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic' }}>
                              "{l.remarks}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Render Shifts */}
                    {shifts.map((shift, i) => {
                      const stName = shift.station?.name || 'Unknown Station';
                      let locName = shift.station?.location?.name || '';
                      let { base, time } = parseStationDisplay(stName);
                      
                      if (base.toUpperCase() === 'TUCKER') {
                        locName = 'TUCKER';
                        base = 'MRI';
                      }

                      return (
                        <div key={`shift-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderTop: i > 0 ? (isToday ? '1px solid #bbf7d0' : '1px solid #f5f5f7') : 'none', paddingTop: i > 0 ? '1.5rem' : 0 }}>
                          <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: isToday ? '#dcfce7' : '#f5f5f7', display: 'flex', justifyContent: 'center', alignItems: 'center', color: isToday ? '#16a34a' : '#007aff', overflow: 'hidden' }}>
                            {(() => {
                              const upperLoc = locName.toUpperCase();
                              let logoSrc = null;
                              if (upperLoc === 'OIC') logoSrc = '/asiamedic-logo.png?v=2';
                              else if (upperLoc === 'ICON') logoSrc = '/icon-logo.jpg?v=1';
                              else if (upperLoc === 'NOVENA') logoSrc = '/asiamedic-sunway-logo.png?v=2';
                              else if (upperLoc === 'TUCKER') logoSrc = '/tucker-logo.png?v=1';
                              else if (['ANSON', 'CAMDEN', 'JURONG'].includes(upperLoc)) logoSrc = '/ata-logo.png?v=1';
                              
                              return logoSrc ? (
                                <img src={logoSrc} alt={locName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }} />
                              ) : (
                                <MapPin size={28} strokeWidth={2.5} />
                              );
                            })()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.375rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {locName && <span style={{ color: isToday ? '#15803d' : '#86868b', fontSize: '1rem', fontWeight: 600 }}>{locName}</span>}
                              {base}
                              {time && (
                                <span style={{ backgroundColor: time === '830' ? '#0d9488' : time === '930' ? '#d97706' : '#1d4ed8', color: 'white', fontSize: '0.85rem', padding: '2px 8px', borderRadius: '99px', fontWeight: 800 }}>
                                  {time}
                                </span>
                              )}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isToday ? '#16a34a' : '#86868b', fontSize: '1rem', fontWeight: 500 }}>
                              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '4px', backgroundColor: shift.shiftPeriod === 'AM' ? '#ff9500' : shift.shiftPeriod === 'PM' ? '#5856d6' : '#34c759' }} />
                              {shift.shiftPeriod === 'AM' ? 'Morning Shift' : shift.shiftPeriod === 'PM' ? 'Afternoon Shift' : 'Full Day Shift'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
