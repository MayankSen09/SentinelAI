/**
 * x402 Payment Router.
 *
 * Routes x402 agent-to-agent payments through the Firewall validator
 * before allowing program invocation. If validation fails, the payment
 * is rejected immediately without calling the Solana program.
 *
 * Requirements: 6.3, 8.1, 8.2, 8.3
 */

import { AgentPolicy, ValidationResult } from "../models/types";
import { validateTransaction } from "./firewallValidator";

/**
 * Route an x402 payment through firewall validation.
 *
 * Delegates to firewallValidator — if any check fails, the payment
 * is rejected with a descriptive reason and the Solana program is
 * never invoked (Property 14: x402 Firewall Short-Circuit).
 */
export function routeX402(
  policy: AgentPolicy,
  amount: number,
  receiver: string
): ValidationResult {
  const result = validateTransaction(policy, amount, receiver);

  if (!result.valid) {
    return {
      valid: false,
      reason: `x402 payment rejected: ${result.reason}`,
    };
  }

  return {
    valid: true,
    reason: "x402 payment passes firewall validation",
  };
}
