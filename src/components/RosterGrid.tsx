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

// Soft, readable column colors matching Excel pastels
const LOCATION_COLORS: Record<string, string> = {
  'OIC':    '#E8FBF8', // very light aqua
  'NOVENA': '#EBF5EB', // very light green
  'ICON':   '#F5F5F5', // off-white grey
  'ANSON':  '#EEEEFF', // very light lavender
  'CAMDEN': '#E6F7F1', // very light teal
  'JURONG': '#EBF3FA', // very light blue
};

// Station header colors — kept close to Excel but toned down
const STATION_COLORS: Record<string, string> = {
  'BMD':        '#F4FDC2',
  'MAM':        '#F2CAE6',
  'CT':         '#DDD9FF',
  'PET':        '#FFEEA0',
  'LUMA MRI':   '#EEEEEE',
  'MRI 3T 830': '#C8F5F8',
  'MRI 3T 930': '#C8F5F8',
  'MRI 2 830':  '#C8F5F8',
  'MRI 2 930':  '#C8F5F8',
  'MRI 3 830':  '#C8F5F8',
  'MRI 3 930':  '#C8F5F8',
  'TUCKER':     '#C8F5F8',
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

  if (stUpper in STATION_COLORS) return STATION_COLORS[stUpper];
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
  const [selectedCell, setSelectedCell] = useState<{ date: Date; station: Station | null; status: 'Scheduled' | 'Leave' | 'MC' | 'Off' } | null>(null);

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
  const absences = ['Leave', 'MC', 'Off'] as const;

  // Parse station name into base name + optional time pill (e.g. "MRI 3T 830" → { base: "MRI 3T", time: "830" })
  const parseStationDisplay = (name: string): { base: string; time: string | null } => {
    const match = name.match(/^(.*?)\s+(830|930|1030|1230)$/);
    if (match) return { base: match[1], time: match[2] };
    return { base: name, time: null };
  };

  const handleCellClick = (date: Date, station: Station | null, status: 'Scheduled' | 'Leave' | 'MC' | 'Off') => {
    // Only allow MANAGERs or ADMINs to edit
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
        return s.stationId === stationId && s.status === 'Scheduled';
      } else {
        return s.status === status;
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
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1200px' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--header-bg)', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <tr>
              <th rowSpan={2} style={{ border: '1px solid var(--border)', padding: '0.5rem', width: '80px', textAlign: 'center', backgroundColor: 'var(--header-bg)', position: 'sticky', left: 0, zIndex: 20 }}>
                Date
              </th>
              {stationsByLocation.map(loc => (
                <th key={loc.id} colSpan={loc.stations.length} style={{ 
                  border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', 
                  fontWeight: 700, color: 'black', backgroundColor: LOCATION_COLORS[loc.name.toUpperCase()] || 'var(--header-bg)' 
                }}>
                  {loc.name}
                </th>
              ))}
              <th colSpan={3} style={{ border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', fontWeight: 700, color: 'var(--danger)' }}>
                Absences
              </th>
              <th rowSpan={2} style={{ border: '1px solid var(--border)', padding: '0.5rem', width: '60px', textAlign: 'center', backgroundColor: 'var(--header-bg)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Total<br/>Staff
              </th>
            </tr>
            <tr>
              {stationsByLocation.flatMap(loc => loc.stations).map(station => {
                const locName = stationsByLocation.find(l => l.id === station.locationId)?.name || '';
                const { base, time } = parseStationDisplay(station.name);
                return (
                <th key={station.id} style={{ 
                  border: '1px solid var(--border)', padding: '0.4rem 0.3rem', textAlign: 'center', 
                  fontSize: '0.72rem', fontWeight: 700, color: '#333',
                  backgroundColor: getStationColor(station.name, locName),
                  whiteSpace: 'nowrap'
                }}>
                  <div>{base}</div>
                  {time && (
                    <div style={{
                      marginTop: '2px',
                      display: 'inline-block',
                      backgroundColor: '#1d4ed8',
                      color: 'white',
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '9999px',
                      letterSpacing: '0.03em',
                    }}>{time}</div>
                  )}
                </th>
                );
              })}
              {absences.map(abs => (
                <th key={abs} style={{ border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#555' }}>
                  {abs}
                </th>
              ))}
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
              const totalCols = stationsByLocation.flatMap(loc => loc.stations).length + 3 + 1; // stations + absences + total

              // Count staff for the day
              const dayShifts = data.shifts.filter(s => {
                 const d = new Date(s.date);
                 return d.getDate() === date.getDate() && d.getMonth() === date.getMonth();
              });
              const workingStaff = dayShifts.filter(s => s.status === 'Scheduled').length;

              const dateCell = (
                <td style={{ 
                  border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', 
                  fontWeight: 700,
                  color: isPH ? '#cc0000' : isSunday ? '#888' : isWeekend ? 'var(--primary)' : 'inherit',
                  position: 'sticky', left: 0, backgroundColor: rowBg, zIndex: 5,
                  minWidth: '72px'
                }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{date.toLocaleDateString('default', { weekday: 'short' })}</div>
                  <div style={{ fontSize: '1rem' }}>{date.getDate()}</div>
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
                      padding: '0.6rem',
                      fontSize: '0.9rem',
                      letterSpacing: '0.05em'
                    }}>
                      🇸🇬 PUBLIC HOLIDAY — {phName}
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
                      fontWeight: 700,
                      textAlign: 'center',
                      padding: '0.6rem',
                      fontSize: '0.875rem',
                      letterSpacing: '0.05em',
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
                          border: '1px solid var(--border)', padding: '0.25rem', verticalAlign: 'middle',
                          minWidth: '60px', cursor: (currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') ? 'pointer' : 'default',
                          transition: 'background-color 0.2s',
                          backgroundColor: shifts.some(s => s.userId === filterUserId) ? '#fef08a' : baseColor
                        }}
                        onMouseOver={(e) => { if(currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') e.currentTarget.style.backgroundColor = 'var(--cell-hover)' }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = shifts.some(s => s.userId === filterUserId) ? '#fef08a' : baseColor }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minHeight: '30px', justifyContent: 'center', padding: '2px 0' }}>
                          {(() => {
                            const grouped = groupByPeriod(shifts);
                            const hasAmPm = grouped.AM.length > 0 || grouped.PM.length > 0;
                            return (
                              <>
                                {/* Full day pills */}
                                {grouped.Full.map(shift => {
                                  const isFiltered = filterUserId && shift.userId === filterUserId;
                                  const uc = getUserColor(shift.user.abbreviation);
                                  return (
                                    <div key={shift.id}>
                                      <div style={{
                                        backgroundColor: isFiltered ? '#1d4ed8' : uc.bg,
                                        color: isFiltered ? 'white' : uc.text,
                                        border: `1px solid ${isFiltered ? '#1d4ed8' : uc.border}`,
                                        padding: '2px 5px', borderRadius: '9999px',
                                        fontSize: '0.68rem', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap'
                                      }}>{shift.user.abbreviation}</div>
                                      {shift.remarks && (
                                        <div style={{ fontSize: '0.55rem', color: '#666', textAlign: 'center', marginTop: '1px', whiteSpace: 'nowrap' }}>
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
                                    <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                      <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#0369a1', backgroundColor: '#E0F2FE', padding: '0 3px', borderRadius: '3px', lineHeight: '1.4' }}>AM</span>
                                      <div style={{
                                        backgroundColor: isFiltered ? '#0369a1' : uc.bg,
                                        color: isFiltered ? 'white' : uc.text,
                                        border: `1px solid ${isFiltered ? '#0369a1' : uc.border}`,
                                        padding: '1px 5px', borderRadius: '9999px',
                                        fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap'
                                      }}>{shift.user.abbreviation}</div>
                                    </div>
                                  );
                                })}
                                {/* PM pills */}
                                {grouped.PM.map(shift => {
                                  const isFiltered = filterUserId && shift.userId === filterUserId;
                                  const uc = getUserColor(shift.user.abbreviation);
                                  return (
                                    <div key={shift.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                      <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#c2410c', backgroundColor: '#FFF7ED', padding: '0 3px', borderRadius: '3px', lineHeight: '1.4' }}>PM</span>
                                      <div style={{
                                        backgroundColor: isFiltered ? '#c2410c' : uc.bg,
                                        color: isFiltered ? 'white' : uc.text,
                                        border: `1px solid ${isFiltered ? '#c2410c' : uc.border}`,
                                        padding: '1px 5px', borderRadius: '9999px',
                                        fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap'
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
                          border: '1px solid var(--border)', padding: '0.25rem', verticalAlign: 'middle',
                          minWidth: '60px', cursor: (currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') ? 'pointer' : 'default',
                          transition: 'background-color 0.2s',
                          backgroundColor: shifts.some(s => s.userId === filterUserId) ? '#fef08a' : (isWeekend ? 'var(--weekend-bg)' : 'transparent')
                        }}
                        onMouseOver={(e) => { if(currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') e.currentTarget.style.backgroundColor = 'var(--cell-hover)' }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = shifts.some(s => s.userId === filterUserId) ? '#fef08a' : (isWeekend ? 'var(--weekend-bg)' : 'transparent') }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minHeight: '30px', justifyContent: 'center' }}>
                          {shifts.map(shift => {
                            const isFiltered = filterUserId && shift.userId === filterUserId;
                            const uc = getUserColor(shift.user.abbreviation);
                            return (
                              <div key={shift.id} style={{ 
                                backgroundColor: isFiltered ? '#dc2626' : '#FEE2E2',
                                color: isFiltered ? 'white' : '#991B1B',
                                border: `1px solid ${isFiltered ? '#dc2626' : '#FCA5A5'}`,
                                padding: '2px 6px',
                                borderRadius: '9999px',
                                fontSize: '0.7rem', 
                                textAlign: 'center', 
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
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
                    border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', 
                    fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem'
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
