'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{ message: string; resolve: (val: boolean) => void } | null>(null);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast, confirm }}>
      {children}
      
      {/* Toast Notifications */}
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '1rem 1.25rem', borderRadius: '8px',
            backgroundColor: 'var(--surface)',
            borderLeft: `4px solid ${t.type === 'success' ? 'var(--success)' : t.type === 'error' ? 'var(--danger)' : 'var(--primary)'}`,
            boxShadow: 'var(--shadow-lg)',
            animation: 'slideUp 0.2s ease-out',
            minWidth: '250px'
          }}>
            {t.type === 'success' && <CheckCircle size={18} color="var(--success)" />}
            {t.type === 'error' && <AlertCircle size={18} color="var(--danger)" />}
            {t.type === 'info' && <Info size={18} color="var(--primary)" />}
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}>{t.message}</span>
            <button 
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Custom Confirm Dialog */}
      {confirmState && (
        <div className="modal-backdrop" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ padding: '1.5rem', maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#fef9c3', borderRadius: '50%', color: '#854d0e' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Are you sure?</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{confirmState.message}</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => { confirmState.resolve(false); setConfirmState(null); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => { confirmState.resolve(true); setConfirmState(null); }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
