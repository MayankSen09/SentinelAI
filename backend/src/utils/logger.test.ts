import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for logger.
 *
 * Tests log entry shape for private and non-private modes with concrete inputs.
 * Requirements: 9.1, 9.2, 9.3
 */

import { buildLogEntry, logTransaction, getLogs, clearLogs } from "./logger";

describe("logger", () => {
  beforeEach(() => {
    clearLogs();
  });

  describe("buildLogEntry", () => {
    it("should include all fields in non-private mode", () => {
      const entry = buildLogEntry(
        "AgentPubkey123", "normal", 500_000, "ReceiverPubkey456",
        "approved", "Transaction approved", false
      );

      expect(entry.agent_pubkey).toBe("AgentPubkey123");
      expect(entry.amount).toBe(500_000);
      expect(entry.receiver).toBe("ReceiverPubkey456");
      expect(entry.payment_type).toBe("normal");
      expect(entry.status).toBe("approved");
      expect(entry.reason).toBe("Transaction approved");
      expect(entry.timestamp).toBeDefined();
    });

    it("should omit amount, receiver, agent_pubkey in private mode", () => {
      const entry = buildLogEntry(
        "AgentPubkey123", "x402", 500_000, "ReceiverPubkey456",
        "rejected", "Policy violation", true
      );

      expect(entry.agent_pubkey).toBeUndefined();
      expect(entry.amount).toBeUndefined();
      expect(entry.receiver).toBeUndefined();
      // Non-sensitive fields should still be present
      expect(entry.payment_type).toBe("x402");
      expect(entry.status).toBe("rejected");
      expect(entry.reason).toBe("Policy violation");
      expect(entry.timestamp).toBeDefined();
    });

    it("should always include a valid ISO 8601 timestamp", () => {
      const entry = buildLogEntry(
        "Agent", "normal", 100, "Receiver", "approved", "ok", false
      );
      expect(() => new Date(entry.timestamp)).not.toThrow();
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    });
  });

  describe("logTransaction + getLogs", () => {
    it("should store and retrieve log entries", () => {
      const entry = buildLogEntry(
        "Agent1", "normal", 100, "Receiver1", "approved", "ok", false
      );
      logTransaction(entry);
      const logs = getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(entry);
    });

    it("should return logs in reverse chronological order", () => {
      const entry1 = buildLogEntry("A1", "normal", 100, "R1", "approved", "first", false);
      const entry2 = buildLogEntry("A2", "normal", 200, "R2", "rejected", "second", false);
      logTransaction(entry1);
      logTransaction(entry2);

      const logs = getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].reason).toBe("second");
      expect(logs[1].reason).toBe("first");
    });

    it("should filter by agent_pubkey when provided", () => {
      const entry1 = buildLogEntry("Agent1", "normal", 100, "R1", "approved", "ok", false);
      const entry2 = buildLogEntry("Agent2", "normal", 200, "R2", "rejected", "fail", false);
      logTransaction(entry1);
      logTransaction(entry2);

      const logs = getLogs("Agent1");
      expect(logs).toHaveLength(1);
      expect(logs[0].agent_pubkey).toBe("Agent1");
    });

    it("should not return private entries when filtering by agent_pubkey", () => {
      const privateEntry = buildLogEntry("Agent1", "normal", 100, "R1", "approved", "ok", true);
      logTransaction(privateEntry);

      const logs = getLogs("Agent1");
      expect(logs).toHaveLength(0); // agent_pubkey was stripped
    });
  });

  describe("clearLogs", () => {
    it("should clear all stored logs", () => {
      const entry = buildLogEntry("A", "normal", 1, "R", "approved", "ok", false);
      logTransaction(entry);
      expect(getLogs()).toHaveLength(1);

      clearLogs();
      expect(getLogs()).toHaveLength(0);
    });
  });
});
