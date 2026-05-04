/**
 * Program Client — builds and sends submit_transaction to the Solana program.
 *
 * In demo/simulation mode, simulates the on-chain firewall logic locally
 * (reputation check → policy check → tiered check → mock transfer → reputation update)
 * without requiring a deployed program. Includes Circuit Breaker.
 */

import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { GetCommitmentSignature } from "@magicblock-labs/ephemeral-rollups-sdk";
import type { AgentPolicy, AgentProfile, ExecutionResult } from "../models/types";

// ─── Dual Provider Setup (MagicBlock Integration) ─────────────────────────────
const MOCK_WALLET = new anchor.Wallet(Keypair.generate());

// 1. Base Layer Provider (Solana Devnet/Localnet)
export const provider = new anchor.AnchorProvider(
  new Connection(process.env.RPC_URL || "http://127.0.0.1:8899"),
  MOCK_WALLET,
  { commitment: "confirmed" }
);

// 2. Ephemeral Rollup Provider (MagicBlock devnet)
export const providerEphemeralRollup = new anchor.AnchorProvider(
  new Connection(
    process.env.EPHEMERAL_PROVIDER_ENDPOINT || "https://devnet-as.magicblock.app",
    { wsEndpoint: process.env.EPHEMERAL_WS_ENDPOINT || "wss://devnet-as.magicblock.app" }
  ),
  MOCK_WALLET,
  { commitment: "processed" }
);

// ─── In-Memory Agent Profiles (Demo Mode) ───────────────────────────────────

const agentProfiles: Map<string, AgentProfile> = new Map();

export function getOrCreateProfile(agentPubkey: string): AgentProfile {
  if (agentProfiles.has(agentPubkey)) {
    return agentProfiles.get(agentPubkey)!;
  }

  const profile: AgentProfile = {
    agentPubkey: new PublicKey(agentPubkey),
    reputationScore: 50,
    totalTransactions: 0,
    successfulTransactions: 0,
    bump: 255,
    consecutiveFailures: 0,
    frozen: false,
    lastTransactionSlot: 0,
  };

  agentProfiles.set(agentPubkey, profile);
  return profile;
}

export function getProfile(agentPubkey: string): AgentProfile | null {
  return agentProfiles.get(agentPubkey) ?? null;
}

export async function submitTransaction(
  agentPubkey: string,
  amount: number,
  receiver: string,
  policy: AgentPolicy
): Promise<ExecutionResult> {
  const profile = getOrCreateProfile(agentPubkey);

  // ── Step 0: Circuit Breaker - Frozen Check ──────────────────────────
  if (profile.frozen) {
    return {
      status: "rejected",
      reason: `Agent frozen by circuit breaker (${profile.consecutiveFailures} consecutive failures). Owner must unfreeze.`,
    };
  }

  // ── Step 1: Reputation Gate ─────────────────────────────────────────
  if (profile.reputationScore < policy.minReputation) {
    profile.reputationScore = Math.max(0, profile.reputationScore - 5);
    profile.totalTransactions += 1;
    profile.consecutiveFailures += 1;
    
    if (profile.consecutiveFailures >= 3) {
      profile.frozen = true;
    }

    return {
      status: "rejected",
      reason: `Reputation score (${profile.reputationScore + 5} → ${profile.reputationScore}) below minimum required (${policy.minReputation})`,
    };
  }

  // ── Step 2: Policy Gate - Amount ────────────────────────────────────
  if (amount > policy.maxAmount) {
    profile.consecutiveFailures += 1;
    if (profile.consecutiveFailures >= 3) profile.frozen = true;
    
    return {
      status: "rejected",
      reason: `Transaction amount (${amount} lamports) exceeds policy maximum (${policy.maxAmount} lamports)`,
    };
  }

  // ── Step 3: Policy Gate - Receiver ──────────────────────────────────
  const allowedReceiver = policy.allowedReceiver.toBase58();
  if (receiver !== allowedReceiver) {
    profile.consecutiveFailures += 1;
    if (profile.consecutiveFailures >= 3) profile.frozen = true;

    return {
      status: "rejected",
      reason: `Receiver ${receiver} does not match policy allowed receiver ${allowedReceiver}`,
    };
  }

  // ── Step 4: Tiered Gate (Req 22) ────────────────────────────────────
  if (
    policy.highValueThreshold > 0 && 
    amount > policy.highValueThreshold && 
    profile.reputationScore < policy.highValueMinReputation
  ) {
    profile.consecutiveFailures += 1;
    if (profile.consecutiveFailures >= 3) profile.frozen = true;

    return {
      status: "rejected",
      reason: `High-value transaction (${amount} lamports) requires reputation >= ${policy.highValueMinReputation}, agent has ${profile.reputationScore}`,
    };
  }

  // ── Step 5: MagicBlock Ephemeral Rollup Execution Routing ─────────────
  profile.reputationScore += 10;
  profile.successfulTransactions += 1;
  profile.totalTransactions += 1;
  profile.consecutiveFailures = 0; // reset on success

  if (policy.privateMode) {
    // Route to Ephemeral Rollup for private execution
    const txSignature = `mb_per_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // In production, we invoke providerEphemeralRollup.sendAndConfirm
    // and commit via GetCommitmentSignature
    return {
      status: "approved",
      reason: `[PRIVATE] Executed via MagicBlock Ephemeral Rollup. Underlying transfer hidden.`,
      txSignature,
    };
  } else {
    // Route to Standard Solana Base Layer
    const txSignature = `sol_base_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      status: "approved",
      reason: `Transaction approved on Base Layer. ${amount} lamports sent to ${receiver}. Reputation: ${profile.reputationScore - 10} → ${profile.reputationScore}`,
      txSignature,
    };
  }
}

export function unfreezeAgent(agentPubkey: string): void {
  const profile = getOrCreateProfile(agentPubkey);
  profile.frozen = false;
  profile.consecutiveFailures = 0;
}

export function setProfileReputation(
  agentPubkey: string,
  reputationScore: number
): void {
  const profile = getOrCreateProfile(agentPubkey);
  profile.reputationScore = reputationScore;
}

export function clearProfiles(): void {
  agentProfiles.clear();
}
