'use client';

/**
 * StatusBadge — renders Trusted/Risky/Blocked based on reputation_score.
 *
 * Requirements: 10.2
 * Property 13: StatusBadge Correctness
 */

import { REPUTATION_THRESHOLDS } from '@/lib/constants';

interface StatusBadgeProps {
  reputationScore: number;
}

export function StatusBadge({ reputationScore }: StatusBadgeProps) {
  const { label, className } = getBadgeProps(reputationScore);

  return (
    <span className={`badge ${className}`}>
      <span className="status-dot" style={{ width: 6, height: 6 }} />
      {label}
    </span>
  );
}

export function getBadgeProps(score: number): {
  label: string;
  className: string;
} {
  if (score >= REPUTATION_THRESHOLDS.TRUSTED) {
    return { label: 'Trusted', className: 'badge-trusted' };
  }
  if (score >= REPUTATION_THRESHOLDS.RISKY) {
    return { label: 'Risky', className: 'badge-risky' };
  }
  return { label: 'Blocked', className: 'badge-blocked' };
}
