'use client';

/**
 * Zustand store for SentinelAI agent state.
 * Manages selected agent, profile, policy, and activity feed.
 *
 * Requirements: 14.3
 */

import { create } from 'zustand';

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

interface AgentState {
  // Selected agent
  selectedAgentPubkey: string | null;
  agentList: string[];

  // On-chain data
  profile: AgentProfile | null;
  policy: AgentPolicy | null;

  // Activity feed
  activityFeed: ActivityEntry[];
  lastUpdated: number;

  // Actions
  setSelectedAgent: (pubkey: string) => void;
  addAgent: (pubkey: string) => void;
  removeAgent: (pubkey: string) => void;
  setProfile: (profile: AgentProfile | null) => void;
  setPolicy: (policy: AgentPolicy | null) => void;
  setActivityFeed: (entries: ActivityEntry[]) => void;
  appendActivity: (entry: ActivityEntry) => void;
  clearActivityFeed: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  selectedAgentPubkey: null,
  agentList: [],
  profile: null,
  policy: null,
  activityFeed: [],
  lastUpdated: 0,

  setSelectedAgent: (pubkey) =>
    set({
      selectedAgentPubkey: pubkey,
      profile: null,
      policy: null,
      activityFeed: [],
      lastUpdated: Date.now(),
    }),

  addAgent: (pubkey) =>
    set((state) => ({
      agentList: state.agentList.includes(pubkey)
        ? state.agentList
        : [...state.agentList, pubkey],
    })),

  removeAgent: (pubkey) =>
    set((state) => ({
      agentList: state.agentList.filter((p) => p !== pubkey),
      selectedAgentPubkey:
        state.selectedAgentPubkey === pubkey ? null : state.selectedAgentPubkey,
    })),

  setProfile: (profile) => set({ profile, lastUpdated: Date.now() }),
  setPolicy: (policy) => set({ policy }),
  setActivityFeed: (entries) =>
    set({ activityFeed: entries, lastUpdated: Date.now() }),
  appendActivity: (entry) =>
    set((state) => ({
      activityFeed: [entry, ...state.activityFeed],
      lastUpdated: Date.now(),
    })),
  clearActivityFeed: () => set({ activityFeed: [] }),
}));
