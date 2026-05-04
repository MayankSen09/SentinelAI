/**
 * PER (Private Execution Runtime) Handler.
 *
 * Strips PII from log entries and responses when private_mode is enabled.
 *
 * Requirements: 6.2, 7.1
 */

import type { LogEntry, ExecutionResult, ExecuteResponse } from "../models/types";

/**
 * Apply PER redaction to a log entry.
 * When privateMode is true, removes amount, receiver, and agent_pubkey.
 */
export function applyPER(entry: LogEntry, privateMode: boolean): LogEntry {
  if (!privateMode) {
    return { ...entry };
  }

  // Strip sensitive fields for private mode
  const redacted: LogEntry = {
    timestamp: entry.timestamp,
    payment_type: entry.payment_type,
    status: entry.status,
    reason: entry.reason,
  };

  return redacted;
}

/**
 * Build a response for the client.
 * In private mode, only status and reason are returned (same shape,
 * but ensures no extra fields leak).
 */
export function buildResponse(
  result: ExecutionResult,
  _privateMode: boolean
): ExecuteResponse {
  // The response shape is always { status, reason } regardless of private mode.
  // Private mode primarily affects logging, not the API response shape.
  return {
    status: result.status,
    reason: result.reason,
  };
}

/**
 * Check if an AgentPolicy has private mode enabled.
 */
export function isPrivateMode(privateMode: boolean): boolean {
  return privateMode === true;
}
