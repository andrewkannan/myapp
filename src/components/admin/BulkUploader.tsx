'use client';
import { useState, useRef } from 'react';
import { Upload, FileDown, FileText, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export function BulkUploader() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) return []; // Only header or empty
    
    // Simplistic CSV parser (assuming no quotes/commas inside values for the template)
    return lines.slice(1).map(line => {
      const [date, staffAbbreviation, recordType, value, period, remarks] = line.split(',').map(s => s?.trim());
      return { date, staffAbbreviation, recordType, value, period, remarks };
    }).filter(row => row.date && row.staffAbbreviation && row.recordType); // Filter entirely empty rows
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setResult(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setPreviewData(parsed);
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (previewData.length === 0) {
      toast('No valid data to upload.', 'error');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: previewData })
      });
      
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to upload');
      
      setResult(json);
      if (json.errors?.length === 0) {
        toast('Bulk upload completed successfully!', 'success');
        setFile(null);
        setPreviewData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        toast(`Completed with ${json.errors.length} errors.`, 'error');
      }
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: '2rem', marginBottom: '2rem', borderTop: '4px solid var(--primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--foreground)' }}>Unified Bulk Upload</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Migrate and load massive amounts of Roster, Leaves, and Time-Off data directly from a CSV file.
          </p>
        </div>
        <a 
          href="/api/admin/bulk-upload/template" 
          download 
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FileDown size={18} />
          Download Template
        </a>
      </div>

      <div style={{ 
        border: '2px dashed var(--border)', 
        borderRadius: '12px', 
        padding: '3rem 2rem', 
        textAlign: 'center',
        backgroundColor: file ? 'var(--primary-bg)' : 'var(--surface)',
        transition: 'all 0.2s'
      }}>
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          id="csv-upload"
        />
        <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: file ? 'var(--primary)' : 'var(--border)', color: file ? 'white' : 'var(--text-muted)', borderRadius: '50%' }}>
            {file ? <FileText size={32} /> : <Upload size={32} />}
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--foreground)' }}>
              {file ? file.name : 'Select CSV File to Upload'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {file ? `${previewData.length} records parsed and ready.` : 'Supports .csv format only'}
            </p>
          </div>
        </label>
        
        {file && (
          <button 
            onClick={handleUpload} 
            disabled={loading || previewData.length === 0}
            className="btn btn-primary"
            style={{ marginTop: '1.5rem', minWidth: '200px' }}
          >
            {loading ? 'Processing...' : 'Upload Data'}
          </button>
        )}
      </div>

      {result && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: result.errors?.length ? '#fef2f2' : '#f0fdf4', borderRadius: '12px', border: `1px solid ${result.errors?.length ? '#fecaca' : '#bbf7d0'}` }}>
          <h3 style={{ fontWeight: 600, color: result.errors?.length ? '#991b1b' : '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {result.errors?.length ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>}
            Upload Results
          </h3>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <div><strong style={{ color: 'var(--text-muted)' }}>Shifts Created:</strong> {result.stats?.shifts}</div>
            <div><strong style={{ color: 'var(--text-muted)' }}>Leaves Created:</strong> {result.stats?.leaves}</div>
            <div><strong style={{ color: 'var(--text-muted)' }}>Time-Offs Created:</strong> {result.stats?.timeOffs}</div>
          </div>
          
          {result.errors && result.errors.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontWeight: 600, color: '#991b1b', marginBottom: '0.5rem' }}>Errors ({result.errors.length}):</h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#991b1b', fontSize: '0.875rem' }}>
                {result.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {previewData.length > 0 && !result && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Data Preview ({previewData.length} records)</h3>
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: 'var(--header-bg)', textAlign: 'left' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>Staff</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>Value</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>Period</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>{row.date}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>{row.staffAbbreviation}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        backgroundColor: row.recordType === 'ROSTER' ? '#e0f2fe' : row.recordType === 'LEAVE' ? '#fce7f3' : '#ffedd5',
                        color: row.recordType === 'ROSTER' ? '#0369a1' : row.recordType === 'LEAVE' ? '#be185d' : '#c2410c',
                      }}>
                        {row.recordType}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>{row.value}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>{row.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 5 && (
              <div style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                ... and {previewData.length - 5} more records
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
