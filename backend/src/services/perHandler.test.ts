import { describe, it, expect } from 'vitest';

/**
 * Unit tests for perHandler.
 *
 * Tests field omission with concrete private log entries
 * and non-private completeness.
 * Requirements: 6.2, 7.1
 */

import { applyPER, buildResponse, isPrivateMode } from "./perHandler";
import type { LogEntry, ExecutionResult } from "../models/types";

describe("perHandler", () => {
  const fullEntry: LogEntry = {
    timestamp: "2026-04-11T10:00:00.000Z",
    agent_pubkey: "AgentPubkey123",
    payment_type: "normal",
    amount: 500_000,
    receiver: "ReceiverPubkey456",
    status: "approved",
    reason: "Transaction approved",
  };

  describe("applyPER", () => {
    it("should strip amount, receiver, agent_pubkey in private mode", () => {
      const redacted = applyPER(fullEntry, true);
      expect(redacted.amount).toBeUndefined();
      expect(redacted.receiver).toBeUndefined();
      expect(redacted.agent_pubkey).toBeUndefined();
    });

    it("should preserve timestamp, payment_type, status, reason in private mode", () => {
      const redacted = applyPER(fullEntry, true);
      expect(redacted.timestamp).toBe(fullEntry.timestamp);
      expect(redacted.payment_type).toBe(fullEntry.payment_type);
      expect(redacted.status).toBe(fullEntry.status);
      expect(redacted.reason).toBe(fullEntry.reason);
    });

    it("should preserve all fields in non-private mode", () => {
      const result = applyPER(fullEntry, false);
      expect(result.amount).toBe(fullEntry.amount);
      expect(result.receiver).toBe(fullEntry.receiver);
      expect(result.agent_pubkey).toBe(fullEntry.agent_pubkey);
      expect(result.timestamp).toBe(fullEntry.timestamp);
      expect(result.payment_type).toBe(fullEntry.payment_type);
      expect(result.status).toBe(fullEntry.status);
      expect(result.reason).toBe(fullEntry.reason);
    });

    it("should not mutate the original entry", () => {
      const original = { ...fullEntry };
      applyPER(fullEntry, true);
      expect(fullEntry).toEqual(original);
    });
  });

  describe("buildResponse", () => {
    it("should always return status and reason", () => {
      const result: ExecutionResult = {
        status: "approved",
        reason: "All checks passed",
        txSignature: "sig123",
      };
      const response = buildResponse(result, false);
      expect(response.status).toBe("approved");
      expect(response.reason).toBe("All checks passed");
    });

    it("should return status and reason in private mode", () => {
      const result: ExecutionResult = {
        status: "rejected",
        reason: "Policy violation",
      };
      const response = buildResponse(result, true);
      expect(response.status).toBe("rejected");
      expect(response.reason).toBe("Policy violation");
    });
  });

  describe("isPrivateMode", () => {
    it("should return true when private mode is enabled", () => {
      expect(isPrivateMode(true)).toBe(true);
    });

    it("should return false when private mode is disabled", () => {
      expect(isPrivateMode(false)).toBe(false);
    });
  });
});
