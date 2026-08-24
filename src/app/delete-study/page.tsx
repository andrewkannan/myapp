'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function DeleteStudyPage() {
  const router = useRouter();
  const [accession, setAccession] = useState('');
  const [authCode, setAuthCode] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [results, setResults] = useState<{
    advapacs: 'pending' | 'loading' | 'success' | 'error';
    zed: 'pending' | 'loading' | 'success' | 'error';
    ampacs: 'pending' | 'loading' | 'success' | 'error';
  }>({
    advapacs: 'pending',
    zed: 'pending',
    ampacs: 'pending'
  });

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accession || !authCode) return;
    if (authCode.length !== 3) {
      alert('Please enter your 3-letter verification code.');
      return;
    }

    if (!confirm(`Are you sure you want to delete accession ${accession} from all 3 systems?`)) {
      return;
    }

    setStatus('processing');
    setResults({ advapacs: 'loading', zed: 'loading', ampacs: 'loading' });

    // TODO: Connect to backend API once implemented
    // For now, this just simulates the loading states
    
    // Simulate Zed (Since we'll start with this first)
    setTimeout(() => {
      setResults(prev => ({ ...prev, zed: 'success' }));
    }, 2000);

    // Simulate AdvaPACS
    setTimeout(() => {
      setResults(prev => ({ ...prev, advapacs: 'success' }));
    }, 3500);

    // Simulate AMPACS
    setTimeout(() => {
      setResults(prev => ({ ...prev, ampacs: 'success' }));
      setStatus('done');
    }, 5000);
  };

  const renderStatusIcon = (state: string) => {
    switch (state) {
      case 'loading':
        return <Loader2 className="animate-spin text-gray-400" size={20} />;
      case 'success':
        return <CheckCircle2 className="text-green-500" color="#16a34a" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" color="#ef4444" size={20} />;
      default:
        return <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)' }} />;
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center' }}>
        <button 
          onClick={() => router.push('/')} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: 'var(--foreground)' }}
        >
          <ChevronLeft size={20} /> Back to Dashboard
        </button>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '600px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '12px' }}>
              <Trash2 color="#ef4444" size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>Delete Study</h1>
              <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>Permanently remove an accession across all 3 PACS systems.</p>
            </div>
          </div>

          <form onSubmit={handleDelete} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Accession Number</label>
              <input 
                type="text" 
                required 
                value={accession}
                onChange={e => setAccession(e.target.value)}
                placeholder="e.g. ACC123456" 
                style={inputStyle} 
                disabled={status !== 'idle'}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Verification Code (3-letter)</label>
              <input 
                type="text" 
                required 
                maxLength={3}
                value={authCode}
                onChange={e => setAuthCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC" 
                style={inputStyle}
                disabled={status !== 'idle'}
              />
            </div>

            <button 
              type="submit" 
              disabled={status !== 'idle' || !accession || authCode.length !== 3}
              style={{
                backgroundColor: 'var(--danger)', color: 'white', padding: '0.875rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '1rem', cursor: status !== 'idle' ? 'not-allowed' : 'pointer', marginTop: '1rem', opacity: status !== 'idle' ? 0.7 : 1, transition: 'all 0.2s'
              }}
            >
              {status === 'processing' ? 'Deleting...' : 'Delete Study'}
            </button>
          </form>

          {/* Results Panel */}
          {status !== 'idle' && (
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Deletion Status</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 500 }}>AdvaPACS</span>
                  {renderStatusIcon(results.advapacs)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 500 }}>Zed</span>
                  {renderStatusIcon(results.zed)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 500 }}>AMPACS</span>
                  {renderStatusIcon(results.ampacs)}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
