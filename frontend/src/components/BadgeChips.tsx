'use client';

import { useAgentStore } from '@/store/agentStore';

export function BadgeChips() {
  const { profile, policy } = useAgentStore();

  if (!profile || !policy) return null;

  const badges: { id: string; label: string; icon: string; color: string }[] = [];

  // Reliable Executor: 100+ transactions and >= 90% success
  const successRate = profile.totalTransactions > 0 ? (profile.successfulTransactions / profile.totalTransactions) : 0;
  if (profile.totalTransactions >= 10 && successRate >= 0.9) {
    badges.push({ id: 'reliable', label: 'Reliable Executor', icon: '💎', color: 'text-trusted bg-trusted/10 border-trusted/20' });
  }

  // Whale Operator: High value threshold enabled
  if (policy.highValueThreshold && policy.highValueThreshold > 0) {
    badges.push({ id: 'whale', label: 'Whale Operator', icon: '🐋', color: 'text-x402 bg-x402/10 border-x402/20' });
  }

  // Privacy Pioneer: Private mode enabled
  if (policy.privateMode) {
    badges.push({ id: 'privacy', label: 'Privacy Pioneer', icon: '🥷', color: 'text-private bg-private/10 border-private/20' });
  }

  // Fresh Agent: Init but very few transactions
  if (profile.totalTransactions < 3) {
    badges.push({ id: 'fresh', label: 'Fresh Agent', icon: '🌱', color: 'text-text-muted bg-surface border-border' });
  }

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {badges.map((b) => (
        <span
          key={b.id}
          className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider border rounded-full ${b.color} flex items-center gap-1.5 shadow-sm`}
        >
          <span>{b.icon}</span>
          {b.label}
        </span>
      ))}
    </div>
  );
}
