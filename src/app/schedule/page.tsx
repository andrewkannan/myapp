'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, CheckCircle2, Navigation, MoreVertical, CalendarDays, Activity, Clock, Settings, Moon, Coffee, Sun } from 'lucide-react';

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

  const fetchSchedule = (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    fetch('/api/schedule')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load schedule');
        return res.json();
      })
      .then(data => {
        setShifts(data.shifts || []);
        setLeaves(data.leaves || []);
        if (showLoader) setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        if (showLoader) setLoading(false);
      });
  };

  useEffect(() => {
    if (session) {
      fetchSchedule(true);
      const interval = setInterval(() => {
        fetchSchedule(false);
      }, 15000); // Poll every 15 seconds
      return () => clearInterval(interval);
    }
  }, [session]);

  if (!session || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #e5e5ea', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Syncing schedule...</p>
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
    <div className="animate-fade-in" style={{ backgroundColor: 'var(--background)', minHeight: '100vh', padding: '1.5rem', paddingBottom: '4rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <header className="animate-slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', position: 'relative', zIndex: 50 }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--foreground)', letterSpacing: '-0.02em', margin: '0 0 0.25rem 0', lineHeight: 1.1 }}>
            {greeting()},<br/>{session.fullName || session.abbreviation}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', fontWeight: 500, margin: 0 }}>
            {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(today)}
          </p>
        </div>
        
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#e8e8ed', display: 'flex', justifyContent: 'center', alignItems: 'center', border: 'none', color: 'var(--foreground)' }}
          >
            <MoreVertical size={20} />
          </button>
          
          {menuOpen && (
            <div className="animate-menu" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem', width: '220px', backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '16px', padding: '0.5rem', boxShadow: '0 10px 40px var(--shadow-color)', border: '1px solid var(--glass-border)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button onClick={() => router.push('/?view=grid')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', backgroundColor: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '1rem', fontWeight: 500, width: '100%', textAlign: 'left' }}>
                <CalendarDays size={18} color="#007aff" /> Roster
              </button>
              <button onClick={() => router.push('/leaves')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', backgroundColor: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '1rem', fontWeight: 500, width: '100%', textAlign: 'left' }}>
                <Activity size={18} color="#34c759" /> Leaves
              </button>
              <button onClick={() => router.push('/leaves?tab=timeoff')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', backgroundColor: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '1rem', fontWeight: 500, width: '100%', textAlign: 'left' }}>
                <Clock size={18} color="#ff9500" /> Time Off
              </button>
              {session.permissions?.some((p: string) => ['STAFF_MANAGE', 'FACILITY_MANAGE', 'ROLE_MANAGE', 'AUDIT_VIEW'].includes(p)) && (
                <>
                  <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.1)', margin: '4px 8px' }} />
                  <button onClick={() => router.push('/admin')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', backgroundColor: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '1rem', fontWeight: 500, width: '100%', textAlign: 'left' }}>
                    <Settings size={18} color="#5856d6" /> Admin Dashboard
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {error && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)', padding: '2rem', textAlign: 'center' }}>
          <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
            <Activity size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>Failed to Sync</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{error}</p>
          <button onClick={() => fetchSchedule(true)} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', backgroundColor: 'var(--danger-text)', color: 'white', border: 'none', fontWeight: 600, fontSize: '1rem' }}>Retry</button>
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

          const isSunday = day.date.getDay() === 0;

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
                  isSunday ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '20px', backgroundImage: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', boxShadow: '0 4px 14px rgba(253, 230, 138, 0.5)', overflow: 'visible' }}>
                        {/* Steam wisps */}
                        <div style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                          <div style={{ width: '3px', height: '14px', borderRadius: '2px', backgroundColor: '#d97706', opacity: 0.35, animation: 'steam1 1.8s ease-in-out infinite' }} />
                          <div style={{ width: '3px', height: '18px', borderRadius: '2px', backgroundColor: '#d97706', opacity: 0.25, animation: 'steam2 2.2s ease-in-out infinite 0.3s' }} />
                          <div style={{ width: '3px', height: '12px', borderRadius: '2px', backgroundColor: '#d97706', opacity: 0.3, animation: 'steam3 2s ease-in-out infinite 0.6s' }} />
                        </div>
                        <Coffee size={36} color="#d97706" />
                        <style>{`
                          @keyframes steam1 {
                            0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.35; }
                            50% { transform: translateY(-10px) scaleY(1.4); opacity: 0; }
                          }
                          @keyframes steam2 {
                            0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.25; }
                            50% { transform: translateY(-14px) scaleY(1.5); opacity: 0; }
                          }
                          @keyframes steam3 {
                            0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.3; }
                            50% { transform: translateY(-8px) scaleY(1.3); opacity: 0; }
                          }
                        `}</style>
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.375rem', fontWeight: 800, color: '#b45309' }}>Rest Well!</h3>
                        <p style={{ margin: 0, color: '#92400e', fontSize: '1rem', fontWeight: 500 }}>It&apos;s Sunday. Take a break and recharge.</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'var(--background)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                        <Moon size={28} />
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-muted)' }}>Off Day</h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1rem' }}>No schedule for today</p>
                      </div>
                    </div>
                  )
                ) : (() => {
                  // Separate real leaves (AL/MC etc) from time-off claims
                  const realLeaves = leaves.filter(l => l.type !== 'TO');
                  const timeOffClaims = leaves.filter(l => l.type === 'TO' && l.remarks && l.remarks.includes('-'));
                  // Full-day leaves get their own panel, half-day leaves shown as tags
                  const fullDayLeaves = realLeaves.filter(l => l.period === 'FULL');
                  const halfDayLeaves = realLeaves.filter(l => l.period === 'AM' || l.period === 'PM');

                  return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Full day leaves as panels */}
                    {fullDayLeaves.map((l, i) => (
                      <div key={`leave-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderBottom: (shifts.length > 0 || halfDayLeaves.length > 0 || timeOffClaims.length > 0 || i < fullDayLeaves.length - 1) ? (isToday ? '1px solid #bbf7d0' : '1px solid #f5f5f7') : 'none', paddingBottom: (shifts.length > 0 || halfDayLeaves.length > 0 || timeOffClaims.length > 0 || i < fullDayLeaves.length - 1) ? '1.5rem' : 0 }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: isToday ? '#dcfce7' : '#fef2f2', display: 'flex', justifyContent: 'center', alignItems: 'center', color: isToday ? '#16a34a' : '#ef4444' }}>
                          <Calendar size={28} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.375rem', fontWeight: 700, color: 'var(--foreground)' }}>On Leave</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isToday ? '#15803d' : '#ef4444', fontWeight: 600, fontSize: '1rem', flexWrap: 'wrap' }}>
                            <span>{l.type}</span>
                            {l.status === 'PENDING' && (
                              <span style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning-text)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 700 }}>PENDING</span>
                            )}
                          </div>
                          {l.remarks && (
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                              &quot;{l.remarks}&quot;
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
                        <div key={`shift-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: '0', borderTop: (i > 0 || fullDayLeaves.length > 0) ? (isToday ? '1px solid #bbf7d0' : '1px solid #f5f5f7') : 'none', paddingTop: (i > 0 || fullDayLeaves.length > 0) ? '1.5rem' : 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                              {(() => {
                                const upperLoc = locName.toUpperCase();
                                let logoSrc = null;
                                if (upperLoc === 'OIC') logoSrc = '/asiamedic-logo.png?v=2';
                                else if (upperLoc === 'ICON') logoSrc = '/icon-logo.jpg?v=2';
                                else if (upperLoc === 'NOVENA') logoSrc = '/asiamedic-sunway-logo.png?v=2';
                                else if (upperLoc === 'TUCKER') logoSrc = '/tucker-logo.png?v=1';
                                else if (['ANSON', 'CAMDEN', 'JURONG'].includes(upperLoc)) logoSrc = '/ata-logo.png?v=1';
                                
                                return logoSrc ? (
                                  <img src={logoSrc} alt={locName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                                ) : (
                                  <MapPin size={28} strokeWidth={2.5} />
                                );
                              })()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.375rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                        </div>
                      );
                    })}

                    {/* Half-day leave + Time-off claims as compact inline tags */}
                    {(halfDayLeaves.length > 0 || timeOffClaims.length > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: shifts.length > 0 ? '0' : '0', marginTop: shifts.length > 0 ? '-0.5rem' : '0' }}>
                        {halfDayLeaves.map((l, i) => (
                          <span key={`hl-${i}`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
                            backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca'
                          }}>
                            <Calendar size={13} />
                            {l.type} {l.period}
                          </span>
                        ))}
                        {timeOffClaims.map((l, i) => (
                          <span key={`to-${i}`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
                            backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a'
                          }}>
                            <Clock size={13} />
                            TO {l.period !== 'FULL' ? l.period : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
