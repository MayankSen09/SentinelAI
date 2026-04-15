'use client';

import { useEffect, useState } from 'react';
import { BACKEND_URL } from '@/lib/constants';

interface AuditLogEntry {
  original_log: {
    timestamp: string;
    status: string;
    reason: string;
    payment_type?: string;
  };
  hash: string;
}

export function AuditTrail() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudit() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/audit`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data);
        }
      } catch (err) {
        console.error('Failed to fetch audit log', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAudit();
    const interval = setInterval(fetchAudit, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4 text-center text-text-muted text-sm">Loading audit trail...</div>;
  }

  return (
    <div className="glass-card animate-entrance delay-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>📜</span> Immutable Audit Trail
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-text-muted border border-border px-2 py-0.5 rounded">
          SHA-256 Hashed
        </span>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {entries.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-4">No audit records found.</p>
        ) : (
          entries.map((entry, idx) => (
            <div key={idx} className="bg-surface border border-border rounded p-3 text-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-text-muted font-mono">{new Date(entry.original_log.timestamp).toLocaleString()}</span>
                <span className={`uppercase font-bold tracking-wider ${entry.original_log.status === 'approved' ? 'text-trusted' : 'text-blocked'}`}>
                  {entry.original_log.status}
                </span>
              </div>
              <p className="text-text-secondary truncate" title={entry.original_log.reason}>
                {entry.original_log.reason}
              </p>
              <div className="mt-1 flex items-center gap-2 bg-void p-1.5 rounded border border-border/50">
                <span className="text-[10px] text-text-muted uppercase">Hash</span>
                <span className="font-mono text-[10px] text-accent truncate text-opacity-80" 
                      title={entry.hash}>
                  {entry.hash}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
