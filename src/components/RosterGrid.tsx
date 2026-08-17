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

const LOCATION_COLORS: Record<string, string> = {
  'OIC': '#C3FDF6',
  'NOVENA': '#FFE4E1', // Misty Rose
  'ICON': '#FFF0F5',   // Lavender Blush
  'ANSON': '#CCCCFF',
  'CAMDEN': '#99E6D4',
  'JURONG': '#E6E6FA'  // Lavender
};

const STATION_COLORS: Record<string, string> = {
  'BMD': '#F4FDC2',
  'MAM': '#F2CAE6',
  'CT': '#BAB2FF',
  'PET': '#FFC900'
};

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
              {stationsByLocation.flatMap(loc => loc.stations).map(station => (
                <th key={station.id} style={{ 
                  border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', 
                  fontSize: '0.875rem', fontWeight: 500, color: 'black',
                  backgroundColor: STATION_COLORS[station.name.toUpperCase()] || LOCATION_COLORS[stationsByLocation.find(l => l.id === station.locationId)?.name.toUpperCase() || ''] || 'var(--header-bg)'
                }}>
                  {station.name}
                </th>
              ))}
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
              const rowBg = isWeekend ? 'var(--weekend-bg)' : 'var(--surface)';
              
              // Count staff for the day
              const dayShifts = data.shifts.filter(s => {
                 const d = new Date(s.date);
                 return d.getDate() === date.getDate() && d.getMonth() === date.getMonth();
              });
              const workingStaff = dayShifts.filter(s => s.status === 'Scheduled').length;

              return (
                <tr key={date.toISOString()} style={{ backgroundColor: rowBg }}>
                  <td style={{ 
                    border: '1px solid var(--border)', padding: '0.5rem', textAlign: 'center', 
                    fontWeight: isWeekend ? 600 : 400, color: isWeekend ? 'var(--primary)' : 'inherit',
                    position: 'sticky', left: 0, backgroundColor: rowBg, zIndex: 5
                  }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>{date.toLocaleDateString('default', { weekday: 'short' })}</div>
                    <div>{date.getDate()}</div>
                  </td>
                  
                  {stationsByLocation.flatMap(loc => loc.stations).map(station => {
                    const shifts = getCellShifts(date, station.id, 'Scheduled');
                    return (
                      <td 
                        key={station.id} 
                        onClick={() => handleCellClick(date, station, 'Scheduled')}
                        style={{ 
                          border: '1px solid var(--border)', padding: '0.25rem', verticalAlign: 'top',
                          minWidth: '60px', cursor: (currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') ? 'pointer' : 'default',
                          transition: 'background-color 0.2s',
                          backgroundColor: shifts.some(s => s.userId === filterUserId) ? '#fef08a' : ''
                        }}
                        onMouseOver={(e) => { if(currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') e.currentTarget.style.backgroundColor = 'var(--cell-hover)' }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = shifts.some(s => s.userId === filterUserId) ? '#fef08a' : '' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minHeight: '30px' }}>
                          {shifts.map(shift => (
                            <div key={shift.id} style={{ 
                              backgroundColor: shift.userId === filterUserId ? 'var(--primary)' : 'var(--primary-light)', 
                              color: shift.userId === filterUserId ? 'white' : 'var(--primary)', 
                              padding: '2px 4px', borderRadius: '4px', fontSize: '0.75rem', 
                              textAlign: 'center', fontWeight: 500
                            }}>
                              {shift.user.abbreviation}
                            </div>
                          ))}
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
                          border: '1px solid var(--border)', padding: '0.25rem', verticalAlign: 'top',
                          minWidth: '60px', cursor: (currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') ? 'pointer' : 'default',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => { if(currentUser.accessLevel === 'MANAGER' || currentUser.accessLevel === 'ADMIN') e.currentTarget.style.backgroundColor = 'var(--cell-hover)' }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minHeight: '30px' }}>
                          {shifts.map(shift => (
                            <div key={shift.id} style={{ 
                              backgroundColor: shift.userId === filterUserId ? 'var(--danger)' : '#fee2e2', 
                              color: shift.userId === filterUserId ? 'white' : 'var(--danger)', 
                              padding: '2px 4px', borderRadius: '4px', fontSize: '0.75rem', 
                              textAlign: 'center', fontWeight: 500
                            }}>
                              {shift.user.abbreviation}
                            </div>
                          ))}
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
