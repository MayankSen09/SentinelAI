/**
 * Policy Fetcher — retrieves AgentPolicy from Solana chain.
 *
 * Uses the Anchor client to derive the PDA and deserialize the account.
 * In development/demo mode, can return mock policies for simulation.
 *
 * Requirements: 6.1
 */

import { PublicKey, Connection } from "@solana/web3.js";
import type { AgentPolicy } from "../models/types";

/** PDA seed prefix for AgentPolicy accounts */
const AGENT_POLICY_SEED = "agent_policy";

/**
 * Derive the AgentPolicy Program Derived Address (PDA).
 *
 * @param agentPubkey The agent's primary authority public key
 * @param programId The Sentinel Solana program ID
 * @returns A tuple containing the derived PDA and the bump seed
 */
export function deriveAgentPolicyPDA(
  agentPubkey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(AGENT_POLICY_SEED), agentPubkey.toBuffer()],
    programId
  );
}

/**
 * Fetch an agent's policy from the Solana chain.
 *
 * In demo/simulation mode (when DEMO_MODE env var is set or connection/programId are omitted),
 * returns a simulated policy for testing without executing on-chain RPCs.
 *
 * @param agentPubkey The target agent base58 address
 * @param connection Optional Solana JSON RPC connection
 * @param programId Optional program ID for PDA derivation
 * @returns The parsed on-chain or simulated policy
 * @throws PolicyNotFoundError if the policy does not exist on-chain
 */
export async function fetchAgentPolicy(
  agentPubkey: string,
  connection?: Connection,
  programId?: PublicKey
): Promise<AgentPolicy> {
  // Demo mode: return a mock policy for simulation/testing
  if (process.env.DEMO_MODE === "true" || !connection || !programId) {
    return getMockPolicy(agentPubkey);
  }

  // Production mode: fetch from chain via Anchor
  try {
    const agentKey = new PublicKey(agentPubkey);
    const [policyPDA] = deriveAgentPolicyPDA(agentKey, programId);

    const accountInfo = await connection.getAccountInfo(policyPDA);
    if (!accountInfo) {
      throw new PolicyNotFoundError(agentPubkey);
    }

    // Deserialize the account data (Anchor format: 8-byte discriminator + data)
    return deserializeAgentPolicy(accountInfo.data);
  } catch (error) {
    if (error instanceof PolicyNotFoundError) {
      throw error;
    }
    throw new PolicyNotFoundError(agentPubkey);
  }
}

/**
 * Deserialize raw account data from the chain into an AgentPolicy object.
 * Matches the Anchor layout structure with 8-byte discriminator prefix.
 *
 * @param data Raw account buffer from the RPC connection
 * @returns Fully structured and deserialized AgentPolicy model
 */
function deserializeAgentPolicy(data: Buffer): AgentPolicy {
  const offset = 8; // Skip Anchor discriminator

  const owner = new PublicKey(data.subarray(offset, offset + 32));
  const maxAmount = Number(data.readBigUInt64LE(offset + 32));
  const allowedReceiver = new PublicKey(
    data.subarray(offset + 40, offset + 72)
  );
  const minReputation = Number(data.readBigUInt64LE(offset + 72));
  const privateMode = data[offset + 80] === 1;
  const bump = data[offset + 81] || 0;
  const highValueThreshold = Number(data.readBigUInt64LE(offset + 82));
  const highValueMinReputation = Number(data.readBigUInt64LE(offset + 90));

  return {
    owner,
    maxAmount,
    allowedReceiver,
    minReputation,
    privateMode,
    bump,
    highValueThreshold,
    highValueMinReputation,
  };
}

// ─── Mock Policy for Demo Mode ──────────────────────────────────────────────

/** Default mock receiver for simulations */
const MOCK_ALLOWED_RECEIVER = "GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK";

/** In-memory mock policy store — used in demo mode */
const mockPolicies: Map<string, AgentPolicy> = new Map();

// Pre-seed demo agent policies
const GOOD_AGENT = "GoodAgent11111111111111111111111111111111111";
mockPolicies.set(GOOD_AGENT, {
  owner: new PublicKey(GOOD_AGENT),
  maxAmount: 10_000_000_000, // 10 SOL limit
  allowedReceiver: new PublicKey(MOCK_ALLOWED_RECEIVER),
  minReputation: 20,
  privateMode: true,
  bump: 255,
  highValueThreshold: 5_000_000_000,
  highValueMinReputation: 80,
});

const BAD_AGENT = "BadAgent99999999999999999999999999999999999";
mockPolicies.set(BAD_AGENT, {
  owner: new PublicKey(BAD_AGENT),
  maxAmount: 100_000, // Very low limit
  allowedReceiver: new PublicKey(MOCK_ALLOWED_RECEIVER),
  minReputation: 60, // Requires 60, but agent has 15
  privateMode: false,
  bump: 255,
  highValueThreshold: 0,
  highValueMinReputation: 0,
});

/**
 * Retrieve an existing mock policy or generate a default one if not found.
 * Primarily utilized during simulated environments and backend-only testing.
 *
 * @param agentPubkey The base58 public key for the agent
 * @returns The designated AgentPolicy
 */
export function getMockPolicy(agentPubkey: string): AgentPolicy {
  if (mockPolicies.has(agentPubkey)) {
    return mockPolicies.get(agentPubkey)!;
  }

  const defaultPolicy: AgentPolicy = {
    owner: new PublicKey(agentPubkey),
    maxAmount: 1_000_000_000, // 1 SOL in lamports
    allowedReceiver: new PublicKey(MOCK_ALLOWED_RECEIVER),
    minReputation: 40,
    privateMode: false,
    bump: 255,
    highValueThreshold: 0,
    highValueMinReputation: 0,
  };

  mockPolicies.set(agentPubkey, defaultPolicy);
  return defaultPolicy;
}

/**
 * Set a mock policy — used in demo/simulation mode and testing.
 */
export function setMockPolicy(
  agentPubkey: string,
  policy: AgentPolicy
): void {
  mockPolicies.set(agentPubkey, policy);
}

/**
 * Clear all mock policies — used in testing.
 */
export function clearMockPolicies(): void {
  mockPolicies.clear();
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class PolicyNotFoundError extends Error {
  constructor(agentPubkey: string) {
    super(`Agent policy not found for ${agentPubkey}`);
    this.name = "PolicyNotFoundError";
  }
}
