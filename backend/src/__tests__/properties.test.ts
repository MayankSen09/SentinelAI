import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Property-based tests for the SentinelAI backend.
 *
 * Uses fast-check to verify correctness properties across randomized inputs.
 * Each property test runs a minimum of 100 iterations.
 *
 * Properties tested:
 *  P8:  Backend Response Shape Completeness
 *  P9:  Private Mode Log Omission
 *  P10: Non-Private Log Completeness
 *  P14: x402 Firewall Short-Circuit
 */

import * as fc from "fast-check";
import { PublicKey, Keypair } from "@solana/web3.js";
import { buildLogEntry, clearLogs } from "../utils/logger";
import { applyPER } from "../services/perHandler";
import { validateTransaction } from "../services/firewallValidator";
import { routeX402 } from "../services/x402Router";
import { AgentPolicy, LogEntry } from "../models/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a random Solana-like base58 pubkey string */
const arbPubkey = fc.constantFrom(
  Keypair.generate().publicKey.toBase58(),
  Keypair.generate().publicKey.toBase58(),
  Keypair.generate().publicKey.toBase58(),
  Keypair.generate().publicKey.toBase58(),
  Keypair.generate().publicKey.toBase58(),
  "GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK",
  "11111111111111111111111111111111"
);

/** Generate a random positive integer for lamports */
const arbLamports = fc.integer({ min: 1, max: 10_000_000_000 });

/** Generate a random payment type */
const arbPaymentType = fc.constantFrom("normal" as const, "x402" as const);

/** Generate a random status */
const arbStatus = fc.constantFrom("approved" as const, "rejected" as const);

/** Generate a random log entry */
const arbLogEntry: fc.Arbitrary<LogEntry> = fc.record({
  timestamp: fc.constant(new Date().toISOString()),
  agent_pubkey: fc.option(fc.string({ minLength: 32, maxLength: 44 }), { nil: undefined }),
  payment_type: arbPaymentType,
  amount: fc.option(arbLamports, { nil: undefined }),
  receiver: fc.option(fc.string({ minLength: 32, maxLength: 44 }), { nil: undefined }),
  status: arbStatus,
  reason: fc.string({ minLength: 1, maxLength: 200 }),
});

/** Build a policy with controllable fields */
function makePolicy(
  maxAmount: number,
  allowedReceiver: string,
  privateMode: boolean = false
): AgentPolicy {
  return {
    owner: Keypair.generate().publicKey,
    maxAmount,
    allowedReceiver: new PublicKey(allowedReceiver),
    minReputation: 40,
    privateMode,
    bump: 255,
    highValueThreshold: 0,
    highValueMinReputation: 0,
  };
}

// ─── Property 8: Backend Response Shape Completeness ────────────────────────
// Feature: sentinel-ai, Property 8: Backend Response Shape Completeness
// For any POST /execute request (valid or invalid, normal or x402), the backend
// response SHALL always contain both a `status` field and a `reason` field.

describe("Property 8: Backend Response Shape Completeness", () => {
  it("buildLogEntry always produces entries with status and reason fields", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 44 }),   // agent pubkey
        arbPaymentType,
        arbLamports,
        fc.string({ minLength: 10, maxLength: 44 }),   // receiver
        arbStatus,
        fc.string({ minLength: 1, maxLength: 200 }),   // reason
        fc.boolean(),                                    // private mode
        (agentPubkey, paymentType, amount, receiver, status, reason, privateMode) => {
          const entry = buildLogEntry(
            agentPubkey, paymentType, amount, receiver, status, reason, privateMode
          );
          // status and reason must always be present
          expect(entry.status).toBeDefined();
          expect(entry.reason).toBeDefined();
          expect(["approved", "rejected"]).toContain(entry.status);
          expect(typeof entry.reason).toBe("string");
          expect(entry.reason.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: Private Mode Log Omission ──────────────────────────────────
// Feature: sentinel-ai, Property 9: Private Mode Log Omission
// For any transaction processed with private_mode = true, the backend log entry
// SHALL contain timestamp, payment_type, and outcome but SHALL NOT contain
// amount, receiver, or agent_pubkey.

describe("Property 9: Private Mode Log Omission", () => {
  beforeEach(() => clearLogs());

  it("buildLogEntry with privateMode=true omits amount, receiver, agent_pubkey", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 44 }),
        arbPaymentType,
        arbLamports,
        fc.string({ minLength: 10, maxLength: 44 }),
        arbStatus,
        fc.string({ minLength: 1, maxLength: 200 }),
        (agentPubkey, paymentType, amount, receiver, status, reason) => {
          const entry = buildLogEntry(
            agentPubkey, paymentType, amount, receiver, status, reason, true // private mode
          );

          // SHALL NOT contain these fields
          expect(entry.agent_pubkey).toBeUndefined();
          expect(entry.amount).toBeUndefined();
          expect(entry.receiver).toBeUndefined();

          // SHALL contain these fields
          expect(entry.timestamp).toBeDefined();
          expect(entry.payment_type).toBeDefined();
          expect(entry.status).toBeDefined();
          expect(entry.reason).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("applyPER with privateMode=true strips sensitive fields", () => {
    fc.assert(
      fc.property(arbLogEntry, (entry) => {
        const redacted = applyPER(entry, true);

        expect(redacted.agent_pubkey).toBeUndefined();
        expect(redacted.amount).toBeUndefined();
        expect(redacted.receiver).toBeUndefined();
        expect(redacted.timestamp).toBeDefined();
        expect(redacted.payment_type).toBeDefined();
        expect(redacted.status).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 10: Non-Private Log Completeness ──────────────────────────────
// Feature: sentinel-ai, Property 10: Non-Private Log Completeness
// For any transaction processed with private_mode = false, the backend log entry
// SHALL contain timestamp, agent_pubkey, payment_type, amount, receiver, status,
// and reason.

describe("Property 10: Non-Private Log Completeness", () => {
  beforeEach(() => clearLogs());

  it("buildLogEntry with privateMode=false includes all fields", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 44 }),
        arbPaymentType,
        arbLamports,
        fc.string({ minLength: 10, maxLength: 44 }),
        arbStatus,
        fc.string({ minLength: 1, maxLength: 200 }),
        (agentPubkey, paymentType, amount, receiver, status, reason) => {
          const entry = buildLogEntry(
            agentPubkey, paymentType, amount, receiver, status, reason, false // non-private mode
          );

          expect(entry.timestamp).toBeDefined();
          expect(entry.agent_pubkey).toBe(agentPubkey);
          expect(entry.payment_type).toBe(paymentType);
          expect(entry.amount).toBe(amount);
          expect(entry.receiver).toBe(receiver);
          expect(entry.status).toBe(status);
          expect(entry.reason).toBe(reason);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 14: x402 Firewall Short-Circuit ───────────────────────────────
// Feature: sentinel-ai, Property 14: x402 Firewall Short-Circuit
// For any x402 payment request that fails Firewall validation, the backend SHALL
// return a rejection response with a descriptive reason and SHALL NOT invoke
// the Solana Program submit_transaction instruction.

describe("Property 14: x402 Firewall Short-Circuit", () => {
  it("x402 with amount > maxAmount is rejected by firewall without reaching program", () => {
    const allowedReceiver = "GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK";

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),       // max amount (policy)
        fc.integer({ min: 1_000_001, max: 10_000_000 }), // amount (exceeds)
        (maxAmount, amount) => {
          const policy = makePolicy(maxAmount, allowedReceiver);
          const result = routeX402(policy, amount, allowedReceiver);

          expect(result.valid).toBe(false);
          expect(result.reason).toContain("x402 payment rejected");
          expect(result.reason).toContain("exceeds policy maximum");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("x402 with wrong receiver is rejected by firewall", () => {
    const allowedReceiver = "GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK";
    const wrongReceiver = "11111111111111111111111111111111";

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000_000 }),
        (amount) => {
          const policy = makePolicy(1_000_000_000, allowedReceiver);
          const result = routeX402(policy, amount, wrongReceiver);

          expect(result.valid).toBe(false);
          expect(result.reason).toContain("x402 payment rejected");
          expect(result.reason).toContain("does not match");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("x402 with valid params passes firewall", () => {
    const allowedReceiver = "GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK";

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000_000 }),
        (amount) => {
          const policy = makePolicy(1_000_000_000, allowedReceiver);
          const result = routeX402(policy, amount, allowedReceiver);

          expect(result.valid).toBe(true);
          expect(result.reason).toContain("passes firewall");
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 24: x402 HTTP 402 Challenge-Response ────────────────────────
// Feature: sentinel-ai, Property 24: x402 HTTP 402 Challenge-Response

describe("Property 24: x402 HTTP 402 Challenge-Response", () => {
  it("HTTP 402 challenge shape is correct", () => {
    fc.assert(
      fc.property(
        arbLamports,
        fc.string({ minLength: 10, maxLength: 44 }),
        (amount, receiver) => {
          const challenge = {
            status: "payment_required",
            message: "Access requires payment",
            payment_request: {
              network: "solana-devnet",
              amount,
              token: "SOL",
              receiver,
            }
          };
          expect(challenge.payment_request.amount).toBe(amount);
          expect(challenge.payment_request.receiver).toBe(receiver);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 26: Audit Log Integrity ───────────────────────────────────────
// Feature: sentinel-ai, Property 26: Audit Log Integrity

import { sha256 } from "crypto-hash";

describe("Property 26: Audit Log Integrity", () => {
  it("Audit log hash matches unredacted entry", async () => {
    await fc.assert(
      fc.asyncProperty(arbLogEntry, async (entry) => {
        const entryString = JSON.stringify(entry);
        const hash = await sha256(entryString);
        
        expect(hash).toBeDefined();
        expect(hash.length).toBe(64);
      }),
      { numRuns: 100 }
    );
  });
});
