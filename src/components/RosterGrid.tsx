'use client';

import { useState } from 'react';
import { RosterData, Shift, Station, User } from '@/app/page';
import AssignmentModal from './AssignmentModal';

interface RosterGridProps {
  data: RosterData;
  year: number;
  month: number;
  currentUser: User;
  filterUserId: string;
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

// Singapore 2026 Public Holidays
const SG_PUBLIC_HOLIDAYS: Record<string, string> = {
  '2026-01-01': "New Year's Day",
  '2026-02-17': 'Chinese New Year',
  '2026-02-18': 'Chinese New Year',
  '2026-03-21': 'Hari Raya Puasa',
  '2026-04-03': 'Good Friday',
  '2026-05-01': 'Labour Day',
  '2026-05-27': 'Hari Raya Haji',
  '2026-06-01': 'Vesak Day',
  '2026-08-09': 'National Day (Sunday)',
  '2026-08-10': 'National Day (in lieu)',
  '2026-11-09': 'Deepavali',
  '2026-12-25': 'Christmas Day',
};

function getPhName(date: Date): string | null {
  // Use LOCAL date parts to avoid UTC offset shifting dates (Singapore is UTC+8)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return SG_PUBLIC_HOLIDAYS[`${y}-${m}-${d}`] || null;
}

function getStationColor(stationName: string, locationName: string): string {
  const stUpper = stationName.toUpperCase();
  const locUpper = locationName.toUpperCase();

  // MAM=pink and CT=purple only apply within OIC — other locations use their own band color
  const oicOnly = new Set(['BMD', 'MAM', 'CT', 'PET', 'LUMA MRI', 'MRI 3T 830', 'MRI 3T 930', 'MRI 2 830', 'MRI 2 930', 'MRI 3 830', 'MRI 3 930', 'TUCKER']);
  if (oicOnly.has(stUpper) && locUpper === 'OIC') return STATION_COLORS[stUpper] || LOCATION_COLORS['OIC'];
  return LOCATION_COLORS[locUpper] || '#F8F8F8';
}

// Generate a unique, soft pastel color per staff abbreviation (consistent across renders)
function getUserColor(abbreviation: string): { bg: string; text: string; border: string } {
  const hash = abbreviation.split('').reduce((acc, c) => c.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 55%, 92%)`,      // Very light pastel background
    text: `hsl(${hue}, 60%, 28%)`,    // Deep matching text
    border: `hsl(${hue}, 55%, 70%)`,  // Mid-tone border
  };
}

export default function RosterGrid({ data, year, month, currentUser, filterUserId, onRefresh }: RosterGridProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ date: Date; station: Station | null; status: 'Scheduled' | 'Leave' | 'MC' | 'Off' | 'TimeOff' } | null>(null);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month - 1, i + 1);
    return d;
  });

  // Group stations by location
  const stationsByLocation = data.locations.map(loc => ({
    ...loc,
    stations: data.stations.filter(s => s.locationId === loc.id)
  })).filter(loc => loc.stations.length > 0);

  // Define absence columns
  const absences = ['Leave', 'MC', 'Off', 'TimeOff'] as const;


  // Parse station name into base name + optional time pill (e.g. "MRI 3T 830" → { base: "MRI 3T", time: "830" })
  const parseStationDisplay = (name: string): { base: string; time: string | null } => {
    const match = name.match(/^(.*?)\s+(830|930|1030|1230)$/);
    if (match) return { base: match[1], time: match[2] };
    return { base: name, time: null };
  };

  const handleCellClick = (date: Date, station: Station | null, status: 'Scheduled' | 'Leave' | 'MC' | 'Off' | 'TimeOff') => {
    if (currentUser.accessLevel !== 'MANAGER' && currentUser.accessLevel !== 'ADMIN') return;
    setSelectedCell({ date, station, status });
    setModalOpen(true);
  };

  const getCellShifts = (date: Date, stationId: string | null, status: string) => {
    return data.shifts.filter(s => {
      const shiftDate = new Date(s.date);
      const isSameDate = shiftDate.getDate() === date.getDate() &&
                         shiftDate.getMonth() === date.getMonth() &&
                         shiftDate.getFullYear() === date.getFullYear();
      if (!isSameDate) return false;
      if (stationId) {
        // Include both Scheduled and Cancelled so cancelled shows as strikethrough
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="roster-scroll" style={{ flex: 1, overflow: 'auto' }}>
        <table id="roster-table" style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', fontSize: '0.65rem' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--header-bg)', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <tr>
              <th rowSpan={2} style={{ border: '1px solid var(--border)', padding: '2px 3px', width: '52px', textAlign: 'center', backgroundColor: 'var(--header-bg)', position: 'sticky', left: 0, zIndex: 20, fontSize: '0.6rem', fontWeight: 700 }}>
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
              <th colSpan={4} style={{ border: '1px solid var(--border)', padding: '2px', textAlign: 'center', fontWeight: 700, fontSize: '0.6rem', color: 'var(--danger)' }}>
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
                  'Leave':   { bg: '#DBEAFE', color: '#1e40af', label: 'Leave' },
                  'MC':      { bg: '#DCF5DC', color: '#166534', label: 'MC' },
                  'Off':     { bg: '#FEE2E2', color: '#991B1B', label: 'Day Off' },
                  'TimeOff': { bg: '#FEF3C7', color: '#92400e', label: 'Time Off' },
                };
                const s = absHeaderStyle[abs] || absHeaderStyle['Off'];
                return (
                  <th key={abs} style={{
                    border: '1px solid var(--border)', padding: '2px 1px',
                    textAlign: 'center', fontSize: '0.58rem', fontWeight: 700,
                    backgroundColor: s.bg, color: s.color,
                    whiteSpace: 'nowrap', width: '36px',
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
              const phName = getPhName(date);
              const isPH = !!phName;
              const rowBg = isPH ? '#FFE0E0' : isSunday ? '#EFEFEF' : isWeekend ? 'var(--weekend-bg)' : 'var(--surface)';
              
              // Total columns for PH colspan
              const totalCols = stationsByLocation.flatMap(loc => loc.stations).length + 4 + 1; // stations + absences(4) + total

              // Count staff for the day
              const dayShifts = data.shifts.filter(s => {
                 const d = new Date(s.date);
                 return d.getDate() === date.getDate() && d.getMonth() === date.getMonth();
              });
              const workingStaff = dayShifts.filter(s => s.status === 'Scheduled').length;

              const dateCell = (
                <td style={{ 
                  border: '1px solid var(--border)', padding: '1px 2px', textAlign: 'center', 
                  fontWeight: 700,
                  color: isPH ? '#cc0000' : isSunday ? '#888' : isWeekend ? 'var(--primary)' : 'inherit',
                  position: 'sticky', left: 0, backgroundColor: rowBg, zIndex: 5,
                  width: '52px', lineHeight: 1.1,
                }}>
                  <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', opacity: 0.7 }}>{date.toLocaleDateString('default', { weekday: 'short' })}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>{date.getDate()}</div>
                </td>
              );

              // Public Holiday row — full-width red banner
              if (isPH) {
                return (
                  <tr key={date.toISOString()} style={{ backgroundColor: rowBg }}>
                    {dateCell}
                    <td colSpan={totalCols} style={{
                      border: '1px solid #ffaaaa',
                      backgroundColor: '#FFCCCC',
                      color: '#990000',
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
                          border: '1px solid var(--border)', padding: '1px', verticalAlign: 'middle',
                          cursor: (currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') ? 'pointer' : 'default',
                          transition: 'background-color 0.2s',
                          backgroundColor: shifts.some(s => s.userId === filterUserId) ? '#fef08a' : baseColor
                        }}
                        onMouseOver={(e) => { if(currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') e.currentTarget.style.backgroundColor = 'var(--cell-hover)' }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = shifts.some(s => s.userId === filterUserId) ? '#fef08a' : baseColor }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', justifyContent: 'center', padding: '1px 0' }}>
                          {(() => {
                            const grouped = groupByPeriod(shifts);
                            const hasAmPm = grouped.AM.length > 0 || grouped.PM.length > 0;
                            return (
                              <>
                                {/* Full day pills */}
                                {grouped.Full.map(shift => {
                                  const isFiltered = filterUserId && shift.userId === filterUserId;
                                  const isCancelled = shift.status === 'Cancelled';
                                  const uc = getUserColor(shift.user.abbreviation);
                                  return (
                                    <div key={shift.id}>
                                      <div
                                        title={shift.user.fullName || shift.user.abbreviation}
                                        style={{
                                        backgroundColor: isCancelled ? '#F3F4F6' : isFiltered ? '#1d4ed8' : uc.bg,
                                        color: isCancelled ? '#9CA3AF' : isFiltered ? 'white' : uc.text,
                                        border: `1px solid ${isCancelled ? '#D1D5DB' : isFiltered ? '#1d4ed8' : uc.border}`,
                                        padding: '0 3px', borderRadius: '9999px',
                                        fontSize: '0.6rem', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap',
                                        textDecoration: isCancelled ? 'line-through' : 'none',
                                        cursor: 'default', lineHeight: '1.5',
                                      }}>{shift.user.abbreviation}</div>
                                      {shift.remarks && (
                                        <div style={{ fontSize: '0.48rem', color: '#666', textAlign: 'center', whiteSpace: 'nowrap', lineHeight: 1 }}>
                                          {shift.remarks}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {/* AM pills */}
                                {grouped.AM.map(shift => {
                                  const isFiltered = filterUserId && shift.userId === filterUserId;
                                  const uc = getUserColor(shift.user.abbreviation);
                                  return (
                                    <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                                      <span style={{ fontSize: '0.46rem', fontWeight: 800, color: '#0369a1', backgroundColor: '#E0F2FE', padding: '0 2px', borderRadius: '2px', lineHeight: '1.4', flexShrink: 0 }}>AM</span>
                                      <div
                                        title={shift.user.fullName || shift.user.abbreviation}
                                        style={{
                                        backgroundColor: isFiltered ? '#0369a1' : uc.bg,
                                        color: isFiltered ? 'white' : uc.text,
                                        border: `1px solid ${isFiltered ? '#0369a1' : uc.border}`,
                                        padding: '0 3px', borderRadius: '9999px',
                                        fontSize: '0.6rem', fontWeight: 700, whiteSpace: 'nowrap',
                                        cursor: 'default', lineHeight: '1.5',
                                      }}>{shift.user.abbreviation}</div>
                                    </div>
                                  );
                                })}
                                {/* PM pills */}
                                {grouped.PM.map(shift => {
                                  const isFiltered = filterUserId && shift.userId === filterUserId;
                                  const uc = getUserColor(shift.user.abbreviation);
                                  return (
                                    <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                                      <span style={{ fontSize: '0.46rem', fontWeight: 800, color: '#c2410c', backgroundColor: '#FFF7ED', padding: '0 2px', borderRadius: '2px', lineHeight: '1.4', flexShrink: 0 }}>PM</span>
                                      <div
                                        title={shift.user.fullName || shift.user.abbreviation}
                                        style={{
                                        backgroundColor: isFiltered ? '#c2410c' : uc.bg,
                                        color: isFiltered ? 'white' : uc.text,
                                        border: `1px solid ${isFiltered ? '#c2410c' : uc.border}`,
                                        padding: '0 3px', borderRadius: '9999px',
                                        fontSize: '0.6rem', fontWeight: 700, whiteSpace: 'nowrap',
                                        cursor: 'default', lineHeight: '1.5',
                                      }}>{shift.user.abbreviation}</div>
                                    </div>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    );
                  })}
                  
                  {absences.map(abs => {
                    const shifts = getCellShifts(date, null, abs);
                    return (
                      <td 
                        key={abs} 
                        onClick={() => handleCellClick(date, null, abs)}
                        style={{ 
                          border: '1px solid var(--border)', padding: '1px', verticalAlign: 'middle',
                          cursor: (currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') ? 'pointer' : 'default',
                          transition: 'background-color 0.2s',
                          backgroundColor: shifts.some(s => s.userId === filterUserId) ? '#fef08a' : (isWeekend ? 'var(--weekend-bg)' : 'transparent')
                        }}
                        onMouseOver={(e) => { if(currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') e.currentTarget.style.backgroundColor = 'var(--cell-hover)' }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = shifts.some(s => s.userId === filterUserId) ? '#fef08a' : (isWeekend ? 'var(--weekend-bg)' : 'transparent') }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', justifyContent: 'center' }}>
                          {shifts.map(shift => {
                            const isFiltered = filterUserId && shift.userId === filterUserId;
                            const isCancelled = shift.status === 'Cancelled';
                            const absColor: Record<string, { bg: string; text: string; border: string }> = {
                              'Leave':   { bg: '#DBEAFE', text: '#1e40af', border: '#93C5FD' },
                              'MC':      { bg: '#DCF5DC', text: '#166534', border: '#86efac' },
                              'Off':     { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
                              'TimeOff': { bg: '#FEF3C7', text: '#92400e', border: '#FCD34D' },
                            };
                            const col = absColor[abs] || absColor['Off'];
                            return (
                              <div key={shift.id} title={shift.user.fullName || shift.user.abbreviation} style={{ 
                                backgroundColor: isFiltered ? col.text : isCancelled ? '#F3F4F6' : col.bg,
                                color: isFiltered ? 'white' : isCancelled ? '#9CA3AF' : col.text,
                                border: `1px solid ${isFiltered ? col.text : isCancelled ? '#D1D5DB' : col.border}`,
                                padding: '0 3px',
                                borderRadius: '9999px',
                                fontSize: '0.6rem', 
                                textAlign: 'center', 
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                textDecoration: isCancelled ? 'line-through' : 'none',
                                cursor: 'default', lineHeight: '1.5',
                              }}>
                                {shift.user.abbreviation}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                  
                  {/* Daily Staff Count */}
                  <td style={{ 
                    border: '1px solid var(--border)', padding: '1px', textAlign: 'center', 
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
