import { PublicKey } from "@solana/web3.js";

// ─── Request / Response ─────────────────────────────────────────────────────

/** Zod-validated shape of POST /execute body */
export interface ExecuteRequest {
  agent_pubkey: string; // base58 Solana public key
  amount: number; // lamports
  receiver: string; // base58 Solana public key
  payment_type: "normal" | "x402";
}

/** Uniform response shape — every /execute call returns this */
export interface ExecuteResponse {
  status: "approved" | "rejected";
  reason: string;
}

// ─── On-Chain Account Models ────────────────────────────────────────────────

export interface AgentProfile {
  agentPubkey: PublicKey;
  reputationScore: number; // u64 on-chain, number in TS
  totalTransactions: number;
  successfulTransactions: number;
  bump: number;
  consecutiveFailures: number;
  frozen: boolean;
  lastTransactionSlot: number;
}

export interface AgentPolicy {
  owner: PublicKey;
  maxAmount: number; // lamports
  allowedReceiver: PublicKey;
  minReputation: number;
  privateMode: boolean;
  bump: number;
  highValueThreshold: number;
  highValueMinReputation: number;
}

// ─── Firewall ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  reason: string;
}

// ─── Execution Result (internal) ────────────────────────────────────────────

export interface ExecutionResult {
  status: "approved" | "rejected";
  reason: string;
  txSignature?: string;
}

// ─── Logging ────────────────────────────────────────────────────────────────

export interface LogEntry {
  timestamp: string; // ISO 8601
  agent_pubkey?: string; // omitted in private mode
  payment_type: "normal" | "x402";
  amount?: number; // omitted in private mode
  receiver?: string; // omitted in private mode
  status: "approved" | "rejected";
  reason: string;
}
