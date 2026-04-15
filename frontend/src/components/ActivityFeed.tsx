'use client';

/**
 * ActivityFeed — renders the transaction activity log with PER masking.
 *
 * Requirements: 12.1, 12.2, 12.3
 * Properties 11, 12: Private/Non-Private Activity Feed
 */

import { useEffect, useCallback } from 'react';
import { useAgentStore, ActivityEntry } from '@/store/agentStore';
import { BACKEND_URL } from '@/lib/constants';

interface ActivityFeedProps {
  /** Max entries to display (mobile-friendly) */
  maxEntries?: number;
  /** Whether to auto-poll for new entries */
  autoPoll?: boolean;
}

export function ActivityFeed({
  maxEntries,
  autoPoll = true,
}: ActivityFeedProps) {
  const { selectedAgentPubkey, activityFeed, setActivityFeed } =
    useAgentStore();

  const fetchLogs = useCallback(async () => {
    try {
      const url = selectedAgentPubkey
        ? `${BACKEND_URL}/logs?agent_pubkey=${selectedAgentPubkey}`
        : `${BACKEND_URL}/logs`;

      const res = await fetch(url);
      const logs = await res.json();

      if (Array.isArray(logs)) {
        const entries: ActivityEntry[] = logs.map(
          (log: {
            timestamp: string;
            status: 'approved' | 'rejected';
            reason: string;
            amount?: number;
            receiver?: string;
            payment_type?: 'normal' | 'x402';
            agent_pubkey?: string;
          }, i: number) => ({
            id: `${log.timestamp}-${i}`,
            timestamp: log.timestamp,
            status: log.status,
            reason: log.reason,
            isPrivate: !log.amount && !log.receiver,
            amount: log.amount,
            receiver: log.receiver,
            paymentType: log.payment_type,
          })
        );
        setActivityFeed(entries);
      }
    } catch {
      // Keep existing feed on error
    }
  }, [selectedAgentPubkey, setActivityFeed]);

  // Poll every 3 seconds
  useEffect(() => {
    fetchLogs();
    if (autoPoll) {
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [fetchLogs, autoPoll]);

  const displayedEntries = maxEntries
    ? activityFeed.slice(0, maxEntries)
    : activityFeed;

  return (
    <div className="glass-card animate-entrance delay-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Activity Feed</h2>
        <span className="text-xs text-text-muted">
          {activityFeed.length} transaction{activityFeed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {displayedEntries.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm">
          <div className="text-2xl mb-2">📋</div>
          No transactions yet. Use the Simulation Panel to generate activity.
        </div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {displayedEntries.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString();

  return (
    <div className="feed-row">
      {/* Status dot */}
      <div
        className={`status-dot ${
          entry.status === 'approved'
            ? 'status-dot-approved'
            : 'status-dot-rejected'
        }`}
      />

      {/* Timestamp */}
      <span className="text-xs text-text-muted font-mono w-20 flex-shrink-0">
        {time}
      </span>

      {/* Status */}
      <span
        className={`text-xs font-semibold uppercase w-16 flex-shrink-0 ${
          entry.status === 'approved' ? 'text-trusted' : 'text-blocked'
        }`}
      >
        {entry.status}
      </span>

      {/* Details or Private */}
      <div className="flex-1 min-w-0">
        {entry.isPrivate ? (
          <span className="text-xs text-private flex items-center gap-1">
            🔒 Private Execution
          </span>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-secondary truncate">
              {entry.reason}
            </span>
            {entry.amount !== undefined && (
              <span className="text-[11px] font-mono text-text-muted">
                {entry.amount.toLocaleString()} lamports →{' '}
                {entry.receiver
                  ? `${entry.receiver.slice(0, 4)}...${entry.receiver.slice(-4)}`
                  : '?'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Payment type badge */}
      {entry.paymentType === 'x402' && (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-x402-glow text-x402 flex-shrink-0">
          x402
        </span>
      )}
    </div>
  );
}
