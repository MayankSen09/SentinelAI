/**
 * Firewall Validator — off-chain pre-validation of transactions.
 *
 * Checks amount and receiver against the AgentPolicy before
 * invoking the on-chain program. This provides fast-fail for
 * obvious violations without spending SOL on failed transactions.
 *
 * Requirements: 4.1, 4.2, 4.3, 8.1
 */

import { AgentPolicy, ValidationResult } from "../models/types";

/**
 * Validate a transaction against the agent's policy.
 *
 * Checks:
 *  1. amount <= policy.maxAmount
 *  2. receiver === policy.allowedReceiver
 *
 * Returns { valid, reason } — reason is descriptive on failure.
 */
export function validateTransaction(
  policy: AgentPolicy,
  amount: number,
  receiver: string
): ValidationResult {
  // Check 1: Amount does not exceed policy maximum
  if (amount > policy.maxAmount) {
    return {
      valid: false,
      reason: `Transaction amount (${amount} lamports) exceeds policy maximum (${policy.maxAmount} lamports)`,
    };
  }

  // Check 2: Receiver matches the policy's allowed receiver
  const allowedReceiver = policy.allowedReceiver.toBase58();
  if (receiver !== allowedReceiver) {
    return {
      valid: false,
      reason: `Receiver ${receiver} does not match policy allowed receiver ${allowedReceiver}`,
    };
  }

  return {
    valid: true,
    reason: "Transaction passes firewall validation",
  };
}
