/**
 * PER-aware structured transaction logger.
 *
 * When private_mode is enabled, the logger omits sensitive fields
 * (amount, receiver, agent_pubkey) from stored log entries.
 *
 * Requirements: 9.1, 9.2, 9.3
 */

import { LogEntry } from "../models/types";

/** In-memory log storage — replace with DB for production */
const logs: LogEntry[] = [];

/**
 * Build a PER-redacted log entry.
 * If privateMode is true, amount/receiver/agent_pubkey are stripped.
 */
export function buildLogEntry(
  agentPubkey: string,
  paymentType: "normal" | "x402",
  amount: number,
  receiver: string,
  status: "approved" | "rejected",
  reason: string,
  privateMode: boolean
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    payment_type: paymentType,
    status,
    reason,
  };

  if (!privateMode) {
    entry.agent_pubkey = agentPubkey;
    entry.amount = amount;
    entry.receiver = receiver;
  }

  return entry;
}

/**
 * Store a log entry. The entry should already be PER-redacted
 * via buildLogEntry before calling this.
 */
export function logTransaction(entry: LogEntry): void {
  logs.push(entry);
}

/**
 * Retrieve logged transactions, optionally filtered by agent pubkey.
 * Returns newest-first (reversed chronological order).
 */
export function getLogs(agentPubkey?: string): LogEntry[] {
  if (agentPubkey) {
    // In private mode entries have no agent_pubkey, so they won't match
    // This is intentional — private entries are only visible in the full feed
    return logs
      .filter((log) => log.agent_pubkey === agentPubkey)
      .slice()
      .reverse();
  }
  return logs.slice().reverse();
}

/**
 * Clear all logs — primarily used in testing.
 */
export function clearLogs(): void {
  logs.length = 0;
}
