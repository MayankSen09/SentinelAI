'use client';

/**
 * AgentStatus — displays reputation score, gauge, badge, and transaction stats.
 *
 * Requirements: 10.1, 10.2, 10.3
 */

import { useEffect, useCallback } from 'react';
import { useAgentStore } from '@/store/agentStore';
import { StatusBadge } from './StatusBadge';
import { BadgeChips } from './BadgeChips';
import { BACKEND_URL } from '@/lib/constants';

export function AgentStatus() {
  const { selectedAgentPubkey, profile, setProfile } = useAgentStore();

  const fetchProfile = useCallback(async () => {
    if (!selectedAgentPubkey) return;

    try {
      // In demo mode, we derive profile from the activity feed/backend state
      const res = await fetch(
        `${BACKEND_URL}/logs?agent_pubkey=${selectedAgentPubkey}`
      );
      const logs = await res.json();

      // Calculate stats from logs
      const total = Array.isArray(logs) ? logs.length : 0;
      const successful = Array.isArray(logs)
        ? logs.filter((l: { status: string }) => l.status === 'approved').length
        : 0;

      // Reputation: start at 50, +10 per approved, -5 per rejected
      let reputation = 50;
      if (Array.isArray(logs)) {
        const reversed = [...logs].reverse();
        for (const log of reversed) {
          if (log.status === 'approved') {
            reputation += 10;
          } else {
            reputation = Math.max(0, reputation - 5);
          }
        }
      }

      setProfile({
        agentPubkey: selectedAgentPubkey,
        reputationScore: reputation,
        totalTransactions: total,
        successfulTransactions: successful,
      });
    } catch {
      // Keep existing profile on error
    }
  }, [selectedAgentPubkey, setProfile]);

  // Poll every 5 seconds (Requirement 10.3)
  useEffect(() => {
    fetchProfile();
    const interval = setInterval(fetchProfile, 5000);
    return () => clearInterval(interval);
  }, [fetchProfile]);

  if (!selectedAgentPubkey) {
    return (
      <div className="glass-card animate-entrance delay-1">
        <h2 className="text-lg font-semibold mb-4 text-text-secondary">
          Agent Status
        </h2>
        <p className="text-text-muted text-sm">
          Select or add an agent to view status.
        </p>
      </div>
    );
  }

  const score = profile?.reputationScore ?? 50;
  const maxScore = 100;
  const gaugePercent = Math.min(score / maxScore, 1);
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - gaugePercent);

  const gaugeColor =
    score >= 70 ? 'var(--color-trusted)' :
    score >= 40 ? 'var(--color-risky)' :
    'var(--color-blocked)';

  const glowColor =
    score >= 70 ? 'var(--color-trusted-glow)' :
    score >= 40 ? 'var(--color-risky-glow)' :
    'var(--color-blocked-glow)';

  return (
    <div className={`glass-card animate-entrance delay-1 ${profile?.frozen ? 'border-blocked/50 shadow-[0_4px_24px_rgba(255,51,85,0.15)]' : ''}`}>
      <div className="flex items-center justify-between mb-5 border-b border-border/30 pb-3">
        <h2 className="text-lg font-semibold flex items-center gap-3">
          Agent Status
          {profile?.frozen && (
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-blocked/10 text-blocked animate-pulse shadow-[0_0_8px_var(--color-blocked-glow)] border border-blocked/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blocked" />
              FROZEN
            </span>
          )}
        </h2>
        <StatusBadge reputationScore={score} />
      </div>

      <div className="flex items-center gap-8">
        {/* Reputation Gauge */}
        <div className="relative flex-shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Background arc */}
            <circle
              cx="60" cy="60" r="45"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="8"
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              strokeDasharray={circumference}
            />
            {/* Value arc */}
            <circle
              cx="60" cy="60" r="45"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="8"
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                filter: `drop-shadow(0 0 8px ${glowColor})`,
                transition: 'stroke-dashoffset 800ms ease-out, stroke 400ms ease',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-mono text-2xl font-bold"
              style={{ color: gaugeColor }}
            >
              {score}
            </span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">
              Reputation
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div>
            <div className="text-text-muted text-xs uppercase tracking-wider mb-1">
              Total Txns
            </div>
            <div className="font-mono text-xl font-bold">
              {profile?.totalTransactions ?? 0}
            </div>
          </div>
          <div>
            <div className="text-text-muted text-xs uppercase tracking-wider mb-1">
              Successful
            </div>
            <div className="font-mono text-xl font-bold text-trusted">
              {profile?.successfulTransactions ?? 0}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-text-muted text-xs uppercase tracking-wider mb-1">
              Success Rate
            </div>
            <div className="font-mono text-lg font-semibold">
              {profile && profile.totalTransactions > 0
                ? `${Math.round(
                    (profile.successfulTransactions / profile.totalTransactions) * 100
                  )}%`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/30">
        <div className="text-text-muted text-[10px] uppercase tracking-wider mb-2">Dynamic Traits</div>
        <BadgeChips />
      </div>
    </div>
  );
}
