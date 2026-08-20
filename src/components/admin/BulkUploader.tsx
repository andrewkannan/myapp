'use client';
import { useState, useRef } from 'react';
import { Upload, FileDown, FileText, CheckCircle, AlertTriangle, Calendar, Clock, ClipboardList } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

type UploadType = 'roster' | 'leave' | 'timeoff';

interface UploadConfig {
  type: UploadType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
  columns: string[];
  parseRow: (cols: string[]) => Record<string, string>;
}

const UPLOAD_CONFIGS: UploadConfig[] = [
  {
    type: 'roster',
    title: 'Roster / Shift Upload',
    description: 'Upload staff shift assignments with location, station, and timing details.',
    icon: <Calendar size={20} />,
    color: '#0369a1',
    borderColor: '#bae6fd',
    bgColor: '#f0f9ff',
    columns: ['Date', 'Staff', 'Location', 'Station', 'Period', 'Start', 'End', 'Status', 'Remarks'],
    parseRow: (cols: string[]) => ({
      date: cols[0], staffAbbreviation: cols[1], location: cols[2], station: cols[3],
      shiftPeriod: cols[4], startTime: cols[5], endTime: cols[6], status: cols[7], remarks: cols[8],
    }),
  },
  {
    type: 'leave',
    title: 'Leave Upload',
    description: 'Upload leave records — AL, MC, UPL, OFF with period and status.',
    icon: <ClipboardList size={20} />,
    color: '#be185d',
    borderColor: '#fbcfe8',
    bgColor: '#fdf2f8',
    columns: ['Date', 'Staff', 'Leave Type', 'Period', 'Status', 'Remarks'],
    parseRow: (cols: string[]) => ({
      date: cols[0], staffAbbreviation: cols[1], leaveType: cols[2],
      period: cols[3], status: cols[4], remarks: cols[5],
    }),
  },
  {
    type: 'timeoff',
    title: 'Time-Off Upload',
    description: 'Upload time-off claims with study acc no, start/end time, and hours.',
    icon: <Clock size={20} />,
    color: '#c2410c',
    borderColor: '#fed7aa',
    bgColor: '#fff7ed',
    columns: ['Date', 'Staff', 'Reason', 'Study Acc No', 'Start', 'End', 'Hours', 'Status', 'Remarks'],
    parseRow: (cols: string[]) => ({
      date: cols[0], staffAbbreviation: cols[1], reason: cols[2], studyAccNo: cols[3],
      startTime: cols[4], endTime: cols[5], hours: cols[6], status: cols[7], remarks: cols[8],
    }),
  },
];

function parseCSV(text: string, config: UploadConfig) {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length <= 1) return [];
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(s => s?.trim());
    return config.parseRow(cols);
  }).filter(row => row.date && row.staffAbbreviation);
}

function SingleUploader({ config }: { config: UploadConfig }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target?.result as string, config);
      setPreview(parsed);
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (preview.length === 0) { toast('No valid data found in file.', 'error'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: config.type, records: preview }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setResult(json);
      if (json.errorCount === 0) {
        toast(`${json.created} records uploaded successfully!`, 'success');
        setFile(null);
        setPreview([]);
        if (inputRef.current) inputRef.current.value = '';
      } else {
        toast(`Uploaded ${json.created} records with ${json.errorCount} errors.`, 'error');
      }
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const thStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', borderBottom: '2px solid var(--border)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' };

  return (
    <div style={{ border: `1px solid ${config.borderColor}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', backgroundColor: config.bgColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${config.borderColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ color: config.color }}>{config.icon}</div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: config.color, margin: 0 }}>{config.title}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>{config.description}</p>
          </div>
        </div>
        <a
          href={`/api/admin/bulk-upload/template?type=${config.type}`}
          download
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
            border: `1px solid ${config.borderColor}`, backgroundColor: 'white', color: config.color,
            textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <FileDown size={16} />
          Download Template
        </a>
      </div>

      {/* Upload area */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        <input type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} ref={inputRef} id={`csv-${config.type}`} />

        {!file && !result && (
          <label htmlFor={`csv-${config.type}`} style={{
            display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer',
            padding: '1.5rem', border: '2px dashed var(--border)', borderRadius: '10px',
            backgroundColor: 'var(--surface)', transition: 'border-color 0.2s',
          }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--border)', borderRadius: '50%', color: 'var(--text-muted)' }}>
              <Upload size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select CSV file to upload</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Download the template above, fill it in Excel, then upload here</div>
            </div>
          </label>
        )}

        {file && !result && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: config.color }} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{file.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: 'var(--border)', padding: '0.15rem 0.5rem', borderRadius: '99px' }}>
                  {preview.length} records
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={reset} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={loading || preview.length === 0}
                  style={{
                    padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 600,
                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                    backgroundColor: config.color, color: 'white', opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Uploading...' : `Upload ${preview.length} Records`}
                </button>
              </div>
            </div>

            {/* Preview table */}
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: 'var(--header-bg)' }}>
                  <tr>
                    {config.columns.map(col => <th key={col} style={thStyle}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 8).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} style={tdStyle}>{val || <span style={{ color: '#ccc' }}>—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 8 && (
                <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                  ... and {preview.length - 8} more rows
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{
            padding: '1rem 1.25rem', borderRadius: '10px',
            backgroundColor: result.errorCount > 0 ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${result.errorCount > 0 ? '#fecaca' : '#bbf7d0'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {result.errorCount > 0 ? <AlertTriangle size={18} style={{ color: '#dc2626' }} /> : <CheckCircle size={18} style={{ color: '#16a34a' }} />}
                <span style={{ fontWeight: 700, color: result.errorCount > 0 ? '#991b1b' : '#166534' }}>
                  {result.created} records created{result.errorCount > 0 ? `, ${result.errorCount} errors` : ''}
                </span>
              </div>
              <button onClick={reset} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer' }}>
                Upload More
              </button>
            </div>
            {result.errors && result.errors.length > 0 && (
              <ul style={{ margin: '0.75rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#991b1b' }}>
                {result.errors.slice(0, 10).map((e: string, i: number) => <li key={i} style={{ marginBottom: '0.2rem' }}>{e}</li>)}
                {result.errors.length > 10 && <li>... and {result.errors.length - 10} more errors</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function BulkUploader() {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>Bulk Data Upload</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Migrate from paper and Excel. Download each template, fill it in, and upload separately.
        </p>
      </div>
      {UPLOAD_CONFIGS.map(config => (
        <SingleUploader key={config.type} config={config} />
      ))}
    </div>
  );
}
