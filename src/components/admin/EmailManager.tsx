'use client';

import { useState, useEffect } from 'react';
import { Mail, Send, CheckSquare, Square, Search } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export function EmailManager() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Email form state
  const [subject, setSubject] = useState('Welcome to the AsiaMedic Roster & Leave Management System');
  const [appUrl, setAppUrl] = useState('https://roster.asiamedic.com.sg/');
  const [customMessage, setCustomMessage] = useState('You are invited to access the new AsiaMedic Roster, Leave, and Time Off Management portal.\n\nEffective September 1st, this system will be the official platform for all staff to check and update their rosters, and manage time off.\n\n*Please note: The official leave applying system will still be the TimesPro HR system.*');
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchUsers();
    
    // Load saved template from localStorage if exists
    const savedSubject = localStorage.getItem('onboarding_subject_v4');
    const savedUrl = localStorage.getItem('onboarding_appUrl_v4');
    const savedMsg = localStorage.getItem('onboarding_msg_v4');
    if (savedSubject) setSubject(savedSubject);
    if (savedUrl) setAppUrl(savedUrl);
    if (savedMsg) setCustomMessage(savedMsg);
  }, []);

  const saveTemplate = () => {
    localStorage.setItem('onboarding_subject_v4', subject);
    localStorage.setItem('onboarding_appUrl_v4', appUrl);
    localStorage.setItem('onboarding_msg_v4', customMessage);
    toast('Email template saved successfully!', 'success');
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
      toast('Failed to load staff list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.abbreviation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const handleToggleUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(uid => uid !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast('Please enter a test email address', 'error');
      return;
    }
    await sendEmails({ testEmail });
  };

  const handleSendToSelected = async () => {
    if (selectedUsers.length === 0) {
      toast('Please select at least one staff member', 'error');
      return;
    }
    await sendEmails({ userIds: selectedUsers });
  };

  const sendEmails = async (payload: { testEmail?: string, userIds?: string[] }) => {
    setSending(true);
    try {
      const res = await fetch('/api/admin/onboarding-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          subject,
          appUrl,
          customMessage
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send emails');
      
      toast(payload.testEmail ? 'Test email sent successfully!' : `Emails sent to ${payload.userIds?.length} staff successfully!`, 'success');
      
      if (!payload.testEmail) {
        setSelectedUsers([]);
      }
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={24} className="text-primary" />
            Onboarding Emails
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Send welcome emails and login instructions to staff via Outlook 365.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Email Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
          
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Email Template</h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Subject Line</label>
              <input 
                type="text" 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                className="input-field" 
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>App URL Link</label>
              <input 
                type="text" 
                value={appUrl} 
                onChange={e => setAppUrl(e.target.value)} 
                className="input-field" 
                style={{ width: '100%', padding: '0.5rem' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>The link staff will click to access the portal.</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Custom Message</label>
              <textarea 
                value={customMessage} 
                onChange={e => setCustomMessage(e.target.value)} 
                className="input-field" 
                rows={4}
                style={{ width: '100%', padding: '0.5rem', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={saveTemplate} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
                  Save Changes
                </button>
              </div>
            </div>
            
            <div style={{ padding: '1rem', backgroundColor: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Preview of generated email:</p>
              
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                <div style={{ backgroundColor: '#0369a1', padding: '15px', textAlign: 'center' }}>
                  <h2 style={{ color: '#ffffff', margin: 0, fontSize: '16px' }}>Welcome to AsiaMedic Roster System</h2>
                </div>
                <div style={{ padding: '20px' }}>
                  <p style={{ fontSize: '14px', color: '#333' }}>Dear [Staff Name],</p>
                  <p style={{ fontSize: '13px', color: '#4b5563', whiteSpace: 'pre-line' }}>{customMessage}</p>

                  <div style={{ textAlign: 'center', margin: '25px 0' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#374151', fontWeight: 600 }}>Click the button below to log in:</p>
                    <a href={appUrl} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', color: '#5e5e5e', textDecoration: 'none', fontWeight: 600, fontSize: '14px', padding: '8px 16px', border: '1px solid #8c8c8c', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <img src="https://img.icons8.com/color/48/microsoft.png" alt="Microsoft" style={{ width: '16px', height: '16px', marginRight: '8px', border: 'none', outline: 'none' }} />
                      <span>Sign in with Microsoft</span>
                    </a>
                  </div>

                  <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderLeft: '4px solid #0369a1', margin: '15px 0', borderRadius: '0 4px 4px 0' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#374151' }}>
                      <strong>Login Instructions:</strong><br/>
                      Please click the button above and log in using your company email and password.
                    </p>
                  </div>

                  <div style={{ backgroundColor: '#f3f4f6', padding: '12px', margin: '15px 0', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#111827' }}><strong>📱 Quick Access on Mobile</strong></p>
                    <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#4b5563' }}>You can save this portal as an app on your phone's home screen:</p>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', color: '#4b5563', lineHeight: 1.5 }}>
                      <li style={{ marginBottom: '4px' }}><strong>iPhone (Safari):</strong> Open the link, tap the <strong>Share</strong> icon, and select <em>Add to Home Screen</em>.</li>
                      <li><strong>Android (Chrome):</strong> Open the link, tap the <strong>Menu</strong> (three dots), and select <em>Add to Home screen</em>.</li>
                    </ul>
                  </div>

                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                    Best regards,<br/>
                    <strong>Administration Team</strong><br/>
                    AsiaMedic Limited
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>1. Send Test Email</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Send a sample email to yourself first to verify SMTP settings.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="email" 
                placeholder="e.g. admin@yourdomain.com" 
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="input-field"
                style={{ flex: 1, padding: '0.5rem' }}
              />
              <button 
                onClick={handleSendTest} 
                disabled={sending || !testEmail} 
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Send size={16} /> {sending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Staff Selection */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>2. Select Staff Recipients</h3>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search staff..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem' }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={handleSelectAll} className="btn-ghost" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                Select All
              </button>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>{selectedUsers.length} selected</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No staff found.</div>
            ) : (
              filteredUsers.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => handleToggleUser(u.id)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', 
                    borderRadius: '6px', cursor: 'pointer',
                    backgroundColor: selectedUsers.includes(u.id) ? 'var(--primary-light)' : 'transparent',
                  }}
                >
                  {selectedUsers.includes(u.id) ? (
                    <CheckSquare size={18} className="text-primary" />
                  ) : (
                    <Square size={18} style={{ color: 'var(--text-muted)' }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.fullName} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({u.abbreviation})</span>
                    </div>
                    {u.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>}
                    {!u.email && <div style={{ fontSize: '0.75rem', color: '#ea580c' }}>No email address</div>}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
            <button 
              onClick={handleSendToSelected} 
              disabled={sending || selectedUsers.length === 0} 
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}
            >
              <Send size={18} /> {sending ? 'Sending Emails...' : `Send to ${selectedUsers.length} Staff`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
