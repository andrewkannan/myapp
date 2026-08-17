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

// Exact ARGB hex colors from Excel (stripped FF alpha prefix)
// Theme index 4 = cyan-ish light blue used for OIC MRI/XR rows
// Theme index 9 = light green used for NOVENA
// Theme index 5 = grey-blue used for JURONG
const LOCATION_COLORS: Record<string, string> = {
  'OIC':    '#C3FDF6', // light aqua (FFC3FDF6)
  'NOVENA': '#D4EDDA', // light green approximation of theme 9
  'ICON':   '#E8E8E8', // light grey (no color in Excel - ICON cols had theme 0)
  'ANSON':  '#CCCCFF', // lavender (FFCCCCFF)
  'CAMDEN': '#99E6D4', // teal-green (FF99E6D4)
  'JURONG': '#C8DDF0', // light blue-grey (theme 5)
};

// Station-level overrides to match Excel exactly
const STATION_COLORS: Record<string, string> = {
  'BMD':      '#F4FDC2', // pale yellow (FFF4FDC2)
  'MAM':      '#F2CAE6', // light pink (FFF2CAE6)
  'XR':       '#D9EAD3', // light green (theme 4 in OIC context = cyan #64E9F0-ish, but XR header used theme 4)
  'CT':       '#BAB2FF', // soft purple (FFBAB2FF) - OIC CT specifically
  'PET':      '#FFC900', // yellow (FFFFC900)
  'LUMA MRI': '#E8E8E8', // neutral grey (theme 0)
  'MRI 3T':   '#64E9F0', // bright cyan (FF64E9F0)
  'MRI 2':    '#64E9F0',
  'MRI 3':    '#64E9F0',
  'TUCKER':   '#64E9F0',
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
  const key = date.toISOString().substring(0, 10);
  return SG_PUBLIC_HOLIDAYS[key] || null;
}

function getStationColor(stationName: string, locationName: string): string {
  const stUpper = stationName.toUpperCase();
  const locUpper = locationName.toUpperCase();

  // Station-specific overrides first
  if (stUpper === 'BMD') return '#F4FDC2';
  if (stUpper === 'MAM') return '#F2CAE6';
  if (stUpper === 'PET') return '#FFC900';
  if (stUpper === 'CT' && locUpper === 'OIC') return '#BAB2FF'; // Only OIC CT is purple
  if (['MRI 3T', 'MRI 2', 'MRI 3', 'TUCKER'].includes(stUpper)) return '#64E9F0';

  // For XR in OIC - use the OIC XR color
  if (stUpper === 'XR' && locUpper === 'OIC') return '#D5E8D4';

  // Fall back to location color
  return LOCATION_COLORS[locUpper] || '#FFFFFF';
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
                  fontWeight: 600, color: 'black', backgroundColor: LOCATION_COLORS[loc.name.toUpperCase()] || 'var(--header-bg)' 
                }}>
                  {loc.name}
                </th>
              ))}
              <th colSpan={3} style={{ border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', fontWeight: 600, color: 'var(--danger)' }}>
                Absences
              </th>
              <th rowSpan={2} style={{ border: '1px solid var(--border)', padding: '0.5rem', width: '60px', textAlign: 'center', backgroundColor: 'var(--header-bg)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Total<br/>Staff
              </th>
            </tr>
            <tr>
              {stationsByLocation.flatMap(loc => loc.stations).map(station => {
                const locName = stationsByLocation.find(l => l.id === station.locationId)?.name || '';
                return (
                <th key={station.id} style={{ 
                  border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', 
                  fontSize: '0.75rem', fontWeight: 600, color: '#333',
                  backgroundColor: getStationColor(station.name, locName),
                  whiteSpace: 'nowrap'
                }}>
                  {station.name}
                </th>
                );
              })}
              {absences.map(abs => (
                <th key={abs} style={{ border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  {abs}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(date => {
              const dayOfWeek = date.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const phName = getPhName(date);
              const isPH = !!phName;
              const rowBg = isPH ? '#FFE0E0' : isWeekend ? 'var(--weekend-bg)' : 'var(--surface)';
              
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
                  fontWeight: isWeekend || isPH ? 700 : 400, 
                  color: isPH ? '#cc0000' : isWeekend ? 'var(--primary)' : 'inherit',
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minHeight: '30px', justifyContent: 'center' }}>
                          {shifts.map(shift => {
                            const hash = shift.user.abbreviation.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
                            const hue = Math.abs(hash) % 360;
                            const isFiltered = shift.userId === filterUserId;
                            return (
                              <div key={shift.id} style={{ 
                                backgroundColor: isFiltered ? 'var(--primary)' : `hsl(${hue}, 70%, 45%)`,
                                color: 'white', 
                                padding: '4px 6px',
                                borderRadius: '9999px', // Pill shape
                                fontSize: '0.75rem', 
                                textAlign: 'center', 
                                fontWeight: 600,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }}>
                                {shift.user.abbreviation}
                              </div>
                            );
                          })}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minHeight: '30px', justifyContent: 'center' }}>
                          {shifts.map(shift => {
                            const hash = shift.user.abbreviation.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
                            const hue = Math.abs(hash) % 360;
                            const isFiltered = shift.userId === filterUserId;
                            return (
                              <div key={shift.id} style={{ 
                                backgroundColor: isFiltered ? 'var(--danger)' : `hsl(${hue}, 70%, 45%)`,
                                color: 'white', 
                                padding: '4px 6px',
                                borderRadius: '9999px',
                                fontSize: '0.75rem', 
                                textAlign: 'center', 
                                fontWeight: 600,
                                opacity: 0.8,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
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
          users={data.users}
          onClose={() => setModalOpen(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
