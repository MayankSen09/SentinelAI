import { describe, it, expect } from 'vitest';
import { PublicKey } from "@solana/web3.js";
import { routeX402 } from "./x402Router";
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

describe("x402Router", () => {
  it("should validate successfully and return a positive reason when checks pass", () => {
    const policy = makePolicy({ maxAmount: 500 });
    const result = routeX402(policy, 250, ALLOWED_RECEIVER.toBase58());
    
    expect(result.valid).toBe(true);
    expect(result.reason).toContain("passes firewall validation");
  });

  it("should correctly wrap the validation error when exceeding max limit", () => {
    const policy = makePolicy({ maxAmount: 100 });
    const result = routeX402(policy, 150, ALLOWED_RECEIVER.toBase58());
    
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("x402 payment rejected");
    expect(result.reason).toContain("exceeds policy maximum");
  });

  it("should correctly wrap the validation error for wrong receiver mismatch", () => {
    const policy = makePolicy();
    const result = routeX402(policy, 100, WRONG_RECEIVER.toBase58());
    
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("x402 payment rejected");
    expect(result.reason).toContain("does not match policy allowed receiver");
  });
});
