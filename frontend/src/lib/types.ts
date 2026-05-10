/**
 * Core Domain Type Definitions for the SentinelAI Frontend.
 */

export interface AgentProfile {
  agentPubkey: string;
  reputationScore: number;
  totalTransactions: number;
  successfulTransactions: number;
  consecutiveFailures?: number;
  frozen?: boolean;
  lastTransactionSlot?: number;
}

export interface AgentPolicy {
  owner: string;
  maxAmount: number;
  allowedReceiver: string;
  minReputation: number;
  privateMode: boolean;
  highValueThreshold?: number;
  highValueMinReputation?: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  status: 'approved' | 'rejected';
  reason: string;
  isPrivate: boolean;
  amount?: number;
  receiver?: string;
  paymentType?: 'normal' | 'x402';
}
