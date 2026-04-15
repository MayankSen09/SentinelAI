import { describe, it, expect } from 'vitest';

/**
 * Unit tests for firewallValidator.
 *
 * Tests amount boundary (equal to max, one over) and receiver match/mismatch.
 * Requirements: 4.1, 4.2
 */

import { PublicKey } from "@solana/web3.js";
import { validateTransaction } from "./firewallValidator";
import type { AgentPolicy } from "../models/types";

const ALLOWED_RECEIVER = new PublicKey("GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK");
const WRONG_RECEIVER = new PublicKey("11111111111111111111111111111111");

function makePolicy(overrides: Partial<AgentPolicy> = {}): AgentPolicy {
  return {
    owner: new PublicKey("11111111111111111111111111111112"),
    maxAmount: 1_000_000_000, // 1 SOL
    allowedReceiver: ALLOWED_RECEIVER,
    minReputation: 40,
    privateMode: false,
    bump: 255,
    highValueThreshold: 0,
    highValueMinReputation: 0,
    ...overrides,
  } as AgentPolicy;
}

describe("firewallValidator", () => {
  describe("amount checks", () => {
    it("should approve when amount equals max_amount (boundary)", () => {
      const policy = makePolicy({ maxAmount: 500 });
      const result = validateTransaction(policy, 500, ALLOWED_RECEIVER.toBase58());
      expect(result.valid).toBe(true);
    });

    it("should reject when amount is one over max_amount", () => {
      const policy = makePolicy({ maxAmount: 500 });
      const result = validateTransaction(policy, 501, ALLOWED_RECEIVER.toBase58());
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("exceeds policy maximum");
    });

    it("should approve when amount is well under max_amount", () => {
      const policy = makePolicy({ maxAmount: 1_000_000_000 });
      const result = validateTransaction(policy, 100, ALLOWED_RECEIVER.toBase58());
      expect(result.valid).toBe(true);
    });

    it("should reject when amount is far over max_amount", () => {
      const policy = makePolicy({ maxAmount: 100 });
      const result = validateTransaction(policy, 999_999_999, ALLOWED_RECEIVER.toBase58());
      expect(result.valid).toBe(false);
    });
  });

  describe("receiver checks", () => {
    it("should approve when receiver matches policy", () => {
      const policy = makePolicy();
      const result = validateTransaction(policy, 100, ALLOWED_RECEIVER.toBase58());
      expect(result.valid).toBe(true);
    });

    it("should reject when receiver does not match policy", () => {
      const policy = makePolicy();
      const result = validateTransaction(policy, 100, WRONG_RECEIVER.toBase58());
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("does not match policy allowed receiver");
    });
  });

  describe("combined checks", () => {
    it("should reject on amount first even if receiver is also wrong", () => {
      const policy = makePolicy({ maxAmount: 100 });
      const result = validateTransaction(policy, 200, WRONG_RECEIVER.toBase58());
      expect(result.valid).toBe(false);
      // Amount check comes first
      expect(result.reason).toContain("exceeds policy maximum");
    });
  });
});
