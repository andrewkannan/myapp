'use client';

import { useState, useMemo } from 'react';
import { User } from '@/app/page';

interface StaffPickerProps {
  users: User[];
  selectedIds: string[];
  conflictUserIds?: string[]; // users already working elsewhere today
  onToggle: (userId: string) => void;
}

function getUserColor(abbreviation: string) {
  const hash = abbreviation.split('').reduce((acc, c) => c.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 55%, 92%)`,
    text: `hsl(${hue}, 60%, 28%)`,
    border: `hsl(${hue}, 55%, 70%)`,
    selectedBg: `hsl(${hue}, 65%, 40%)`,
  };
}

export default function StaffPicker({ users, selectedIds, conflictUserIds = [], onToggle }: StaffPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u =>
      u.abbreviation.toLowerCase().includes(q) ||
      (u.fullName?.toLowerCase().includes(q))
    );
  }, [users, search]);

  return (
    <div>
      {/* Search box */}
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <input
          type="text"
          placeholder="Search staff name or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem 0.5rem 2rem',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.875rem',
            backgroundColor: 'var(--background)',
            outline: 'none',
          }}
        />
        <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>🔍</span>
      </div>

      {/* Staff grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
        gap: '0.4rem',
        maxHeight: '220px',
        overflowY: 'auto',
        padding: '0.25rem',
      }}>
        {filtered.map(user => {
          const uc = getUserColor(user.abbreviation);
          const isSelected = selectedIds.includes(user.id);
          const hasConflict = conflictUserIds.includes(user.id);

          return (
            <button
              key={user.id}
              onClick={() => onToggle(user.id)}
              title={`${user.fullName || user.abbreviation}${hasConflict ? ' ⚠ Already working today' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                padding: '0.4rem 0.25rem',
                borderRadius: '8px',
                border: `2px solid ${isSelected ? uc.selectedBg : hasConflict ? '#F59E0B' : uc.border}`,
                backgroundColor: isSelected ? uc.selectedBg : hasConflict ? '#FFFBEB' : uc.bg,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                position: 'relative',
              }}
            >
              {/* Conflict badge */}
              {hasConflict && !isSelected && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  fontSize: '0.6rem', background: '#F59E0B', color: 'white',
                  borderRadius: '50%', width: '14px', height: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700
                }}>!</span>
              )}
              {/* Selected tick */}
              {isSelected && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  fontSize: '0.6rem', background: '#16a34a', color: 'white',
                  borderRadius: '50%', width: '14px', height: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700
                }}>✓</span>
              )}
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: isSelected ? 'white' : uc.text,
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em'
              }}>
                {user.abbreviation}
              </span>
              <span style={{
                fontSize: '0.55rem',
                color: isSelected ? 'rgba(255,255,255,0.85)' : uc.text,
                opacity: 0.85,
                textAlign: 'center',
                lineHeight: 1.2,
                maxWidth: '64px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.fullName?.split(' ')[0] || ''}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No staff found
          </div>
        )}
      </div>

      {/* Selection summary */}
      {selectedIds.length > 0 && (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {selectedIds.map(id => {
            const u = users.find(x => x.id === id);
            if (!u) return null;
            const uc = getUserColor(u.abbreviation);
            return (
              <span key={id} style={{
                backgroundColor: uc.selectedBg, color: 'white',
                padding: '2px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600
              }}>
                {u.abbreviation} ×
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
