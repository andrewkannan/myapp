'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setOpen(!open)}
        className="btn btn-ghost"
        style={{ padding: '0.5rem' }}
        title="Toggle theme"
      >
        {resolvedTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      {open && (
        <div 
          className="animate-menu card" 
          style={{ 
            position: 'absolute', 
            top: '100%', 
            right: 0, 
            marginTop: '0.5rem', 
            padding: '0.5rem',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.25rem',
            minWidth: '150px',
            zIndex: 100
          }}
        >
          <button 
            className="btn btn-ghost" 
            style={{ justifyContent: 'flex-start', color: theme === 'light' ? 'var(--primary)' : 'var(--text-muted)' }}
            onClick={() => { setTheme('light'); setOpen(false); }}
          >
            <Sun size={16} style={{ marginRight: '0.5rem' }} /> Light
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ justifyContent: 'flex-start', color: theme === 'dark' ? 'var(--primary)' : 'var(--text-muted)' }}
            onClick={() => { setTheme('dark'); setOpen(false); }}
          >
            <Moon size={16} style={{ marginRight: '0.5rem' }} /> Dark
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ justifyContent: 'flex-start', color: theme === 'system' ? 'var(--primary)' : 'var(--text-muted)' }}
            onClick={() => { setTheme('system'); setOpen(false); }}
          >
            <Monitor size={16} style={{ marginRight: '0.5rem' }} /> System
          </button>
        </div>
      )}
    </div>
  );
}
