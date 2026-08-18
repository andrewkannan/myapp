'use client';

import { useState, useMemo } from 'react';
import { X, Search, ChevronUp, ChevronDown } from 'lucide-react';

type DirectoryUser = {
  id: string;
  abbreviation: string;
  fullName: string | null;
  role: string | null;
  accessLevel?: string;
};

interface StaffDirectoryProps {
  users: DirectoryUser[];
  onClose: () => void;
}

function getUserColor(abbreviation: string) {
  const hash = abbreviation.split('').reduce((acc, c) => c.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 55%, 92%)`,
    text: `hsl(${hue}, 60%, 28%)`,
    border: `hsl(${hue}, 55%, 72%)`,
  };
}

const ACCESS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN:   { label: 'Admin',   color: '#92400e', bg: '#FEF3C7' },
  MANAGER: { label: 'Manager', color: '#1e40af', bg: '#DBEAFE' },
  STAFF:   { label: 'Staff',   color: '#374151', bg: '#F3F4F6' },
};

type SortKey = 'abbreviation' | 'fullName' | 'accessLevel';

export default function StaffDirectory({ users, onClose }: StaffDirectoryProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('abbreviation');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users
      .filter(u =>
        !q ||
        u.abbreviation.toLowerCase().includes(q) ||
        (u.fullName?.toLowerCase().includes(q)) ||
        (u.role?.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        const av = (a[sortKey] ?? '').toLowerCase();
        const bv = (b[sortKey] ?? '').toLowerCase();
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [users, search, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3, fontSize: '0.65rem' }}>↕</span>;
    return sortAsc
      ? <ChevronUp size={12} style={{ display: 'inline' }} />
      : <ChevronDown size={12} style={{ display: 'inline' }} />;
  };

  // Summary counts
  const counts = users.reduce((acc, u) => {
    const level = u.accessLevel || 'STAFF';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 40, backdropFilter: 'blur(2px)'
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '420px', maxWidth: '95vw',
        backgroundColor: 'var(--surface)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.22s ease',
      }}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexShrink: 0,
          backgroundColor: 'var(--header-bg)',
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Staff Directory</h2>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {Object.entries(counts).map(([level, cnt]) => {
                const meta = ACCESS_LABELS[level] || ACCESS_LABELS.STAFF;
                return (
                  <span key={level} style={{
                    fontSize: '0.7rem', fontWeight: 600,
                    padding: '2px 8px', borderRadius: '9999px',
                    backgroundColor: meta.bg, color: meta.color,
                  }}>
                    {cnt} {meta.label}{cnt !== 1 ? 's' : ''}
                  </span>
                );
              })}
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                {users.length} total
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '0.25rem', color: 'var(--text-muted)', borderRadius: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, code, or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                backgroundColor: 'var(--background)',
                outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1,
              }}>×</button>
            )}
          </div>
          {search && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '68px 1fr 1fr 80px',
          gap: 0,
          padding: '0.5rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--header-bg)',
          flexShrink: 0,
        }}>
          {([
            { key: 'abbreviation', label: 'Code' },
            { key: 'fullName',     label: 'Full Name' },
            { key: 'accessLevel',  label: 'Role' },
          ] as { key: SortKey; label: string }[]).map(col => (
            <button key={col.key} onClick={() => toggleSort(col.key)} style={{
              display: 'flex', alignItems: 'center', gap: '3px',
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: sortKey === col.key ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer', background: 'none', border: 'none', padding: 0,
              textAlign: 'left',
            }}>
              {col.label} <SortIcon col={col.key} />
            </button>
          ))}
        </div>

        {/* Staff list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No staff found for "<strong>{search}</strong>"
            </div>
          ) : (
            filtered.map((user, idx) => {
              const uc = getUserColor(user.abbreviation);
              const meta = ACCESS_LABELS[user.accessLevel || 'STAFF'] || ACCESS_LABELS.STAFF;
              return (
                <div
                  key={user.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '68px 1fr 1fr 80px',
                    alignItems: 'center',
                    gap: 0,
                    padding: '0.65rem 1.25rem',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: idx % 2 === 0 ? 'var(--surface)' : 'var(--background)',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--cell-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'var(--surface)' : 'var(--background)')}
                >
                  {/* Unique code pill */}
                  <div>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: uc.bg,
                      color: uc.text,
                      border: `1.5px solid ${uc.border}`,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}>
                      {user.abbreviation}
                    </span>
                  </div>

                  {/* Full name */}
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)', paddingRight: '0.5rem' }}>
                    {user.fullName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                  </div>

                  {/* Role/dept */}
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', paddingRight: '0.5rem' }}>
                    {user.role || '—'}
                  </div>

                  {/* Access level badge */}
                  <div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700,
                      padding: '2px 7px', borderRadius: '4px',
                      backgroundColor: meta.bg, color: meta.color,
                    }}>
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--border)',
          fontSize: '0.72rem', color: 'var(--text-muted)',
          flexShrink: 0,
          backgroundColor: 'var(--header-bg)',
        }}>
          Hover over a staff pill on the roster to see their full name
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
