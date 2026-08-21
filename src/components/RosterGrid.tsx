'use client';

import React, { useState, useMemo } from 'react';
import { RosterData, Shift, Station, User } from '@/app/page';
import AssignmentModal from './AssignmentModal';
import LeaveModal from './LeaveModal';

interface RosterGridProps {
  data: RosterData;
  year: number;
  month: number;
  currentUser: User;
  filterUserIds: string[];
  activeModalities?: string[];
  onRefresh: () => void;
}

// Location band colors — matched to Excel column groupings
const LOCATION_COLORS: Record<string, string> = {
  'OIC':    '#EAF9F7', // very light teal/aqua
  'NOVENA': '#E8F5E9', // soft sage green
  'ICON':   '#EDE7F6', // soft lavender/purple
  'ANSON':  '#E8F5E9', // same soft green as NOVENA
  'CAMDEN': '#EDE7F6', // same soft purple as ICON (matches Excel)
  'JURONG': '#E0F7FA', // soft cyan-teal
};

// Station-level color overrides (applied regardless of location)
const STATION_COLORS: Record<string, string> = {
  'BMD':        '#F4FDC2', // pale yellow
  'MAM':        '#F8D7EA', // soft pink — MAM is always pink across all locations
  'CT':         '#E8E4FF', // soft violet — CT is always purple across all locations
  'PET':        '#FFF3CC', // soft amber-yellow
  'LUMA MRI':   '#F0F0F0', // neutral grey
  'MRI 3T 830': '#D6F5F8', // soft cyan
  'MRI 3T 930': '#D6F5F8',
  'MRI 2 830':  '#D6F5F8',
  'MRI 2 930':  '#D6F5F8',
  'MRI 3 830':  '#D6F5F8',
  'MRI 3 930':  '#D6F5F8',
  'TUCKER':     '#D6F5F8',
};

function getStationColor(stationName: string, locationName: string): string {
  const stUpper = stationName.toUpperCase();
  const locUpper = locationName.toUpperCase();

  // MAM=pink and CT=purple only apply within OIC — other locations use their own band color
  const oicOnly = new Set(['BMD', 'MAM', 'CT', 'PET', 'LUMA MRI', 'MRI 3T 830', 'MRI 3T 930', 'MRI 2 830', 'MRI 2 930', 'MRI 3 830', 'MRI 3 930', 'TUCKER']);
  if (oicOnly.has(stUpper) && locUpper === 'OIC') return STATION_COLORS[stUpper] || LOCATION_COLORS['OIC'];
  return LOCATION_COLORS[locUpper] || '#F8F8F8';
}

export default function RosterGrid({ data, year, month, currentUser, filterUserIds, activeModalities, onRefresh }: RosterGridProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ date: Date; station: Station | null; status: 'Scheduled' | 'Leave' | 'MC' | 'Off' } | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedLeaveCell, setSelectedLeaveCell] = useState<{ date: Date; leave?: any } | null>(null);

  const publicHolidaysMap = useMemo(() => {
    const map = new Map<string, string>();
    if (data.publicHolidays) {
      data.publicHolidays.forEach(ph => {
        const dateStr = ph.date.split('T')[0];
        map.set(dateStr, ph.name);
      });
    }
    return map;
  }, [data.publicHolidays]);

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => {
    return new Date(year, month - 1, i + 1);
  }), [year, month, daysInMonth]);

  // Group stations by location and filter by active modality
  const stationsByLocation = useMemo(() => {
    return data.locations.map(loc => {
      const stations = data.stations.filter(s => {
        if (s.locationId !== loc.id) return false;
        if (activeModalities && activeModalities.length > 0) {
          const upperName = s.name.toUpperCase();
          const hasMod = activeModalities.some(m => upperName.includes(m.toUpperCase()));
          if (!hasMod) return false;
        }
        return true;
      });
      return { ...loc, stations };
    }).filter(loc => loc.stations.length > 0);
  }, [data.stations, data.locations, activeModalities]);

  // Define absence columns — Off / Leave / MC only
  const absences = ['Off', 'Leave', 'MC'] as const;


  // Parse station name into base name + optional time pill, and split into two lines if requested
  const parseStationDisplay = (name: string): { line1: string; line2?: string; time: string | null } => {
    let base = name;
    let time = null;
    const match = name.match(/^(.*?)\s+(830|930|1030|1230|8\.30|9\.30)$/);
    if (match) {
      base = match[1];
      time = match[2].replace('.', '');
    }

    if (base.toUpperCase() === 'LUMA MRI') {
      return { line1: 'LUMA', line2: 'MRI', time };
    }
    if (base.toUpperCase() === 'TUCKER MRI') {
      return { line1: 'TUCKER', line2: 'MRI', time };
    }

    return { line1: base, time };
  };

  const handleCellClick = (date: Date, station: Station | null, status: 'Scheduled' | 'Leave' | 'MC' | 'Off') => {
    if (!currentUser.permissions?.includes('ROSTER_EDIT')) return;
    setSelectedCell({ date, station, status });
    setModalOpen(true);
  };

  // O(1) Indexing for massive performance boost
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    data.shifts.forEach(s => {
      const dStr = typeof s.date === 'string' ? s.date.split('T')[0] : new Date(s.date).toISOString().split('T')[0];
      if (!map.has(dStr)) map.set(dStr, []);
      map.get(dStr)!.push(s);
    });
    return map;
  }, [data.shifts]);

  const leavesByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    (data.leaves || []).forEach(l => {
      const dStr = typeof l.date === 'string' ? l.date.split('T')[0] : new Date(l.date).toISOString().split('T')[0];
      if (!map.has(dStr)) map.set(dStr, []);
      map.get(dStr)!.push(l);
    });
    return map;
  }, [data.leaves]);

  const getLocalDateString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const getCellShifts = (date: Date, stationId: string | null, status: string) => {
    const dStr = getLocalDateString(date);
    const dayShifts = shiftsByDate.get(dStr) || [];
    
    return dayShifts.filter(s => {
      if (stationId) {
        return s.stationId === stationId && (s.status === 'Scheduled' || s.status === 'Cancelled');
      } else {
        return s.status === status || s.status === 'Cancelled' && s.stationId === null && status !== 'Scheduled';
      }
    });
  };

  // Group cell shifts by period for display
  const groupByPeriod = (shifts: Shift[]) => ({
    Full: shifts.filter(s => !s.shiftPeriod || s.shiftPeriod === 'Full'),
    AM:   shifts.filter(s => s.shiftPeriod === 'AM'),
    PM:   shifts.filter(s => s.shiftPeriod === 'PM'),
  });

  return (
    <div className="roster-scroll-parent" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="roster-scroll" style={{ flex: 1, overflow: 'auto' }}>
        <table id="roster-table" style={{ borderCollapse: 'collapse', width: 'max-content', tableLayout: 'fixed', fontSize: '0.65rem' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--header-bg)', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <tr>
              <th rowSpan={2} style={{ border: '1px solid var(--border)', padding: '2px 3px', width: '60px', textAlign: 'center', backgroundColor: 'var(--header-bg)', position: 'sticky', left: 0, zIndex: 20, fontSize: '0.65rem', fontWeight: 700, boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                Date
              </th>
              {stationsByLocation.map(loc => {
                // Use a slightly more saturated version of the band color for the header
                const bandColor: Record<string, string> = {
                  'OIC':    '#B2EBE6',
                  'NOVENA': '#C8E6C9',
                  'ICON':   '#D1C4E9',
                  'ANSON':  '#C8E6C9',
                  'CAMDEN': '#D1C4E9',
                  'JURONG': '#B2EBF2',
                };
                const bg = bandColor[loc.name.toUpperCase()] || 'var(--header-bg)';
                return (
                  <th key={loc.id} colSpan={loc.stations.length} style={{ 
                    border: '1px solid var(--border)',
                    borderBottom: '2px solid rgba(0,0,0,0.15)',
                    padding: '2px 2px', textAlign: 'center', 
                    fontWeight: 700, fontSize: '0.62rem',
                    letterSpacing: '0.04em',
                    color: 'var(--foreground)',
                    backgroundColor: bg
                  }}>
                    {loc.name}
                  </th>
                );
              })}
              <th style={{ border: '1px solid var(--border)', padding: '2px', textAlign: 'center', fontWeight: 700, fontSize: '0.6rem', color: '#1e40af', width: '135px' }}>
                Leaves
              </th>
              <th rowSpan={2} style={{ border: '1px solid var(--border)', padding: '2px', width: '28px', textAlign: 'center', backgroundColor: 'var(--header-bg)', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                #
              </th>
            </tr>
            <tr>
              {stationsByLocation.flatMap(loc => loc.stations).map(station => {
                const locName = stationsByLocation.find(l => l.id === station.locationId)?.name || '';
                const { line1, line2, time } = parseStationDisplay(station.name);
                return (
                <th key={station.id} style={{ 
                  border: '1px solid var(--border)', padding: '2px 1px', textAlign: 'center', 
                  fontSize: '0.58rem', fontWeight: 700, color: 'var(--foreground)',
                  backgroundColor: getStationColor(station.name, locName),
                  whiteSpace: 'nowrap', lineHeight: 1.2,
                  width: '50px'
                }}>
                  <div>{line1}</div>
                  {line2 && <div>{line2}</div>}
                  {time && (
                    <div style={{
                      marginTop: '1px',
                      display: 'inline-block',
                      backgroundColor: time === '830' ? '#0d9488' : time === '930' ? '#d97706' : '#1d4ed8',
                      color: 'white',
                      fontSize: '0.5rem',
                      fontWeight: 800,
                      padding: '0 4px',
                      borderRadius: '9999px',
                    }}>{time}</div>
                  )}
                </th>
                );
              })}
              <th style={{
                border: '1px solid var(--border)', padding: '2px 1px',
                textAlign: 'center', fontSize: '0.58rem', fontWeight: 700,
                backgroundColor: '#DBEAFE', color: '#1e40af',
                whiteSpace: 'nowrap', width: '135px',
              }}>
                LEAVES
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map(date => {
              const dayOfWeek = date.getDay();
              const isSunday = dayOfWeek === 0;
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              const dateKey = `${y}-${m}-${d}`;
              const phName = publicHolidaysMap.get(dateKey);
              const isPH = !!phName;
              const rowBg = isPH ? '#FEF2F2' : isSunday ? '#EFEFEF' : isWeekend ? 'var(--weekend-bg)' : 'var(--surface)';
              
              // Total columns for PH colspan
              const totalCols = stationsByLocation.flatMap(loc => loc.stations).length + 3 + 1; // stations + absences(3) + total

              // Count staff for the day
              const dayShifts = shiftsByDate.get(getLocalDateString(date)) || [];
              const workingStaff = dayShifts.filter(s => s.status === 'Scheduled').length;

              const dateCell = (
                <td style={{ 
                  border: '1px solid var(--border)', padding: '3px 4px', textAlign: 'left', verticalAlign: 'top',
                  fontWeight: 700,
                  color: isPH ? '#DC2626' : isSunday ? '#888' : isWeekend ? 'var(--primary)' : 'inherit',
                  position: 'sticky', left: 0, backgroundColor: rowBg, zIndex: 5,
                  width: '60px', whiteSpace: 'nowrap',
                  boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)'
                }}>
                  <span style={{ fontSize: '0.6rem', textTransform: 'capitalize', display: 'inline-block', width: '22px' }}>{date.toLocaleDateString('default', { weekday: 'short' })}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>{date.getDate()}</span>
                </td>
              );

              // Public Holiday row — full-width red banner
              if (isPH) {
                return (
                  <tr key={date.toISOString()} style={{ backgroundColor: rowBg }}>
                    {dateCell}
                    <td colSpan={totalCols} style={{
                      border: '1px solid #FEE2E2',
                      backgroundColor: '#FEF2F2',
                      color: 'var(--danger-text)',
                      fontWeight: 700,
                      textAlign: 'center',
                      padding: '2px',
                      fontSize: '0.62rem',
                      letterSpacing: '0.04em'
                    }}>
                      PUBLIC HOLIDAY — {phName}
                    </td>
                  </tr>
                );
              }

              // Sunday row — grey "Centre Closed" banner
              if (isSunday && !isPH) {
                return (
                  <tr key={date.toISOString()} style={{ backgroundColor: rowBg }}>
                    {dateCell}
                    <td colSpan={totalCols} style={{
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-hover)',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      textAlign: 'center',
                      padding: '2px',
                      fontSize: '0.6rem',
                      fontStyle: 'italic'
                    }}>
                      Centre Closed
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={date.toISOString()} style={{ backgroundColor: rowBg }}>
                  {dateCell}
                  
                  {stationsByLocation.flatMap(loc => loc.stations).map(station => {
                    const shifts = getCellShifts(date, station.id, 'Scheduled');
                    const locName = stationsByLocation.find(l => l.id === station.locationId)?.name || '';
                    const baseColor = getStationColor(station.name, locName);
                    
                    return (
                      <td 
                        key={station.id} 
                        onClick={() => handleCellClick(date, station, 'Scheduled')}
                        style={{ 
                          border: '1px solid var(--border)', padding: '2px 2px', verticalAlign: 'top',
                          textAlign: 'center', lineHeight: 1.1,
                          cursor: (currentUser.permissions?.includes('ROSTER_EDIT')) ? 'pointer' : 'default',
                          transition: 'background-color 0.2s',
                          backgroundColor: baseColor
                        }}
                        onMouseOver={(e) => { if(currentUser.permissions?.includes('ROSTER_EDIT')) e.currentTarget.style.backgroundColor = 'var(--cell-hover)' }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = baseColor }}
                      >
                        {/* Plain text cell — Excel style */}
                        {shifts.map(shift => {
                          const isCancelled = shift.status === 'Cancelled';
                          const isFiltered = filterUserIds.length > 0 && filterUserIds.includes(shift.userId);
                          const isOther = filterUserIds.length > 0 && !isFiltered;
                          const period = shift.shiftPeriod;
                          return (
                            <span
                              key={shift.id}
                              title={shift.user.fullName || shift.user.abbreviation}
                              style={{
                                display: isOther ? 'none' : 'block', // "only show the selected data" -> hide the others completely, or wait "grey other others", let's use opacity
                                opacity: isOther ? 0.15 : 1,
                                filter: isOther ? 'grayscale(100%)' : 'none',
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                color: isCancelled ? '#9CA3AF' : '#111',
                                textDecoration: isCancelled ? 'line-through' : 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {period === 'AM' && <sup style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '0.45rem', marginRight: '1px' }}>am</sup>}
                              {period === 'PM' && <sup style={{ color: '#c2410c', fontWeight: 900, fontSize: '0.45rem', marginRight: '1px' }}>pm</sup>}
                              {shift.user.abbreviation}
                              {shift.remarks && <div style={{ color: 'var(--text-muted)', fontSize: '0.45rem', lineHeight: 1, marginTop: '1px' }}>{shift.remarks}</div>}
                            </span>
                          );
                        })}
                      </td>
                    );
                  })}
                  {(() => {
                    const dayLeaves = leavesByDate.get(getLocalDateString(date)) || [];
                    const canEdit = currentUser.permissions?.includes('ROSTER_EDIT') || currentUser.role === 'ADMIN';

                    return (
                      <td 
                        onClick={(e) => {
                          if (!canEdit) return;
                          if (e.target === e.currentTarget) {
                            setSelectedLeaveCell({ date });
                            setLeaveModalOpen(true);
                          }
                        }}
                        style={{ 
                          border: '1px solid var(--border)', padding: '2px 3px', verticalAlign: 'top',
                          textAlign: 'left', lineHeight: 1.1,
                          cursor: canEdit ? 'pointer' : 'default',
                          transition: 'background-color 0.2s',
                          backgroundColor: (isWeekend ? 'var(--weekend-bg)' : 'transparent')
                        }}
                      >
                        {dayLeaves.map(leave => {
                          const isFiltered = filterUserIds.length > 0 && filterUserIds.includes(leave.userId);
                          const isOther = filterUserIds.length > 0 && !isFiltered;
                          const period = leave.period;
                          return (
                            <span
                              key={leave.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!canEdit) return;
                                setSelectedLeaveCell({ date, leave });
                                setLeaveModalOpen(true);
                              }}
                              title={leave.user.fullName || leave.user.abbreviation}
                              style={{
                                display: isOther ? 'none' : 'inline-block',
                                opacity: isOther ? 0.15 : 1,
                                filter: isOther ? 'grayscale(100%)' : 'none',
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                color: leave.type === 'TO' ? '#92400e' : '#1e40af',
                                backgroundColor: leave.type === 'TO' ? '#fef3c7' : '#dbeafe',
                                padding: '1px 3px',
                                borderRadius: '3px',
                                margin: '1px',
                                cursor: canEdit ? 'pointer' : 'default',
                              }}
                            >
                              {leave.user.abbreviation}
                              <span style={{ color: 'var(--primary)', marginLeft: '3px' }}>{leave.type}</span>
                              {period !== 'FULL' && <span style={{ color: period === 'AM' ? '#0369a1' : '#c2410c', marginLeft: '2px', fontSize: '0.5rem' }}>{period.toLowerCase()}</span>}
                              {leave.remarks && <span style={{ color: 'var(--text-muted)', fontSize: '0.5rem', marginLeft: '3px' }}>{leave.remarks}</span>}
                            </span>
                          );
                        })}
                      </td>
                    );
                  })()}
                  
                  {/* Daily Staff Count */}
                  <td style={{ 
                    border: '1px solid var(--border)', padding: '3px 1px', textAlign: 'center', verticalAlign: 'top',
                    fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.6rem'
                  }}>
                    {workingStaff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && selectedCell && (
        <AssignmentModal
          date={selectedCell.date}
          station={selectedCell.station}
          statusType={selectedCell.status}
          currentShifts={getCellShifts(selectedCell.date, selectedCell.station?.id || null, selectedCell.status)}
          allShifts={data.shifts}
          allLeaves={data.leaves}
          users={data.users}
          onClose={() => setModalOpen(false)}
          onRefresh={onRefresh}
        />
      )}

      {leaveModalOpen && selectedLeaveCell && (
        <LeaveModal
          date={selectedLeaveCell.date}
          leave={selectedLeaveCell.leave}
          users={data.users}
          onClose={() => setLeaveModalOpen(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
