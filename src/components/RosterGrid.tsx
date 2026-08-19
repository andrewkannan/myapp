'use client';

import { useState, useMemo } from 'react';
import { RosterData, Shift, Station, User } from '@/app/page';
import AssignmentModal from './AssignmentModal';

interface RosterGridProps {
  data: RosterData;
  year: number;
  month: number;
  currentUser: User;
  filterUserIds: string[];
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

export default function RosterGrid({ data, year, month, currentUser, filterUserIds, onRefresh }: RosterGridProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ date: Date; station: Station | null; status: 'Scheduled' | 'Leave' | 'MC' | 'Off' } | null>(null);

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

  // Group stations by location
  const stationsByLocation = useMemo(() => data.locations.map(loc => ({
    ...loc,
    stations: data.stations.filter(s => s.locationId === loc.id)
  })).filter(loc => loc.stations.length > 0), [data.stations, data.locations]);

  // Define absence columns — Off / Leave / MC only
  const absences = ['Off', 'Leave', 'MC'] as const;


  // Parse station name into base name + optional time pill (e.g. "MRI 3T 830" → { base: "MRI 3T", time: "830" })
  const parseStationDisplay = (name: string): { base: string; time: string | null } => {
    const match = name.match(/^(.*?)\s+(830|930|1030|1230)$/);
    if (match) return { base: match[1], time: match[2] };
    return { base: name, time: null };
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
        <table id="roster-table" style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', fontSize: '0.65rem' }}>
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
                    color: '#1a1a1a',
                    backgroundColor: bg
                  }}>
                    {loc.name}
                  </th>
                );
              })}
              <th colSpan={3} style={{ border: '1px solid var(--border)', padding: '2px', textAlign: 'center', fontWeight: 700, fontSize: '0.6rem', color: 'var(--danger)' }}>
                Absences
              </th>
              <th rowSpan={2} style={{ border: '1px solid var(--border)', padding: '2px', width: '28px', textAlign: 'center', backgroundColor: 'var(--header-bg)', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                #
              </th>
            </tr>
            <tr>
              {stationsByLocation.flatMap(loc => loc.stations).map(station => {
                const locName = stationsByLocation.find(l => l.id === station.locationId)?.name || '';
                const { base, time } = parseStationDisplay(station.name);
                return (
                <th key={station.id} style={{ 
                  border: '1px solid var(--border)', padding: '2px 1px', textAlign: 'center', 
                  fontSize: '0.58rem', fontWeight: 700, color: '#333',
                  backgroundColor: getStationColor(station.name, locName),
                  whiteSpace: 'nowrap', lineHeight: 1.2,
                }}>
                  <div>{base}</div>
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
              {absences.map(abs => {
                const absHeaderStyle: Record<string, { bg: string; color: string; label: string }> = {
                  'Off':   { bg: '#FEE2E2', color: '#991B1B', label: 'OFF' },
                  'Leave': { bg: '#DBEAFE', color: '#1e40af', label: 'LEAVE' },
                  'MC':    { bg: '#DCF5DC', color: '#166534', label: 'MC' },
                };
                const s = absHeaderStyle[abs] || absHeaderStyle['Off'];
                return (
                  <th key={abs} style={{
                    border: '1px solid var(--border)', padding: '2px 1px',
                    textAlign: 'center', fontSize: '0.58rem', fontWeight: 700,
                    backgroundColor: s.bg, color: s.color,
                    whiteSpace: 'nowrap', width: '72px',
                  }}>
                    {s.label}
                  </th>
                );
              })}
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
                      color: '#B91C1C',
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
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#F3F4F6',
                      color: '#6B7280',
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
                              {period === 'AM' && <sup style={{ color: '#0369a1', fontWeight: 900, fontSize: '0.45rem', marginRight: '1px' }}>am</sup>}
                              {period === 'PM' && <sup style={{ color: '#c2410c', fontWeight: 900, fontSize: '0.45rem', marginRight: '1px' }}>pm</sup>}
                              {shift.user.abbreviation}
                              {shift.remarks && <div style={{ color: '#888', fontSize: '0.45rem', lineHeight: 1, marginTop: '1px' }}>{shift.remarks}</div>}
                            </span>
                          );
                        })}
                      </td>
                    );
                  })}
                  {absences.map(abs => {
                    const shifts = getCellShifts(date, null, abs);
                    
                    const dayLeaves = leavesByDate.get(getLocalDateString(date)) || [];
                    const actualLeaves = dayLeaves.filter(l => {
                       if (abs === 'Leave' && ['AL', 'ML', 'CCL', 'UL', 'NS', 'HL', 'UPL'].includes(l.type)) return true;
                       if (abs === 'MC' && l.type === 'MC') return true;
                       if (abs === 'Off' && ['OFF', 'TO'].includes(l.type)) return true;
                       return false;
                    });

                    const hasFilteredItem = shifts.some(s => filterUserIds.includes(s.userId)) || actualLeaves.some(l => filterUserIds.includes(l.userId));

                    return (
                      <td 
                        key={abs} 
                        onClick={() => handleCellClick(date, null, abs)}
                        style={{ 
                          border: '1px solid var(--border)', padding: '2px 3px', verticalAlign: 'top',
                          textAlign: 'left', lineHeight: 1.1,
                          cursor: (currentUser.permissions?.includes('ROSTER_EDIT')) ? 'pointer' : 'default',
                          transition: 'background-color 0.2s',
                          backgroundColor: (isWeekend ? 'var(--weekend-bg)' : 'transparent')
                        }}
                        onMouseOver={(e) => { if(currentUser.permissions?.includes('ROSTER_EDIT')) e.currentTarget.style.backgroundColor = 'var(--cell-hover)' }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = (isWeekend ? 'var(--weekend-bg)' : 'transparent') }}
                      >
                        {/* Plain text absence cell — Excel style */}
                        {shifts.map(shift => {
                          const isCancelled = shift.status === 'Cancelled';
                          const isFiltered = filterUserIds.length > 0 && filterUserIds.includes(shift.userId);
                          const isOther = filterUserIds.length > 0 && !isFiltered;
                          return (
                            <span
                              key={shift.id}
                              title={shift.user.fullName || shift.user.abbreviation}
                              style={{
                                display: isOther ? 'none' : 'inline-block',
                                opacity: isOther ? 0.15 : 1,
                                filter: isOther ? 'grayscale(100%)' : 'none',
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                color: isCancelled ? '#9CA3AF' : '#111',
                                textDecoration: isCancelled ? 'line-through' : 'none',
                                marginRight: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {shift.user.abbreviation}
                              {shift.remarks && <span style={{ color: '#888', fontSize: '0.5rem', marginLeft: '3px' }}>{shift.remarks}</span>}
                            </span>
                          );
                        })}
                        {actualLeaves.map(leave => {
                          const isFiltered = filterUserIds.length > 0 && filterUserIds.includes(leave.userId);
                          const isOther = filterUserIds.length > 0 && !isFiltered;
                          const period = leave.period;
                          return (
                            <span
                              key={leave.id}
                              title={leave.user.fullName || leave.user.abbreviation}
                              style={{
                                display: isOther ? 'none' : 'inline-block',
                                opacity: isOther ? 0.15 : 1,
                                filter: isOther ? 'grayscale(100%)' : 'none',
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                color: '#1e40af',
                                backgroundColor: '#dbeafe',
                                padding: '1px 3px',
                                borderRadius: '3px',
                                margin: '1px',
                              }}
                            >
                              {period === 'AM' && <span style={{ color: '#0369a1', marginRight: '2px' }}>am</span>}
                              {period === 'PM' && <span style={{ color: '#c2410c', marginRight: '2px' }}>pm</span>}
                              {leave.user.abbreviation}
                              {!['AL', 'OFF', 'MC'].includes(leave.type) && <span style={{ color: '#6b7280', marginLeft: '2px', fontSize: '0.5rem' }}>{leave.type}</span>}
                              {leave.remarks && <span style={{ color: '#888', fontSize: '0.5rem', marginLeft: '3px' }}>{leave.remarks}</span>}
                            </span>
                          );
                        })}
                      </td>
                    );
                  })}
                  
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
          users={data.users}
          onClose={() => setModalOpen(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
