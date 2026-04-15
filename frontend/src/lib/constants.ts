/**
 * Constants and configuration for the SentinelAI frontend.
 */

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://devnet.helius-rpc.com/?api-key=6f601163-6911-4b7d-98cb-02050e194810';

export const SOLANA_NETWORK = 'devnet' as const;

/** Default mock receiver used in simulation scenarios */
export const MOCK_ALLOWED_RECEIVER =
  'GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK';

/** Simulation preset parameters */
export const SIMULATION_PRESETS = {
  validTransaction: {
    label: 'Valid Transaction',
    description: 'Sends within policy limits to the correct receiver',
    amount: 10_000,
    receiver: MOCK_ALLOWED_RECEIVER,
    payment_type: 'normal' as const,
    variant: 'valid' as const,
  },
  invalidAmount: {
    label: 'Invalid Amount',
    description: 'Amount exceeds the policy maximum',
    amount: 9_999_999_999,
    receiver: MOCK_ALLOWED_RECEIVER,
    payment_type: 'normal' as const,
    variant: 'invalid' as const,
  },
  invalidReceiver: {
    label: 'Invalid Receiver',
    description: 'Receiver does not match the policy allowlist',
    amount: 10_000,
    receiver: '11111111111111111111111111111111',
    payment_type: 'normal' as const,
    variant: 'invalid' as const,
  },
  lowReputation: {
    label: 'Low Reputation',
    description: 'Agent reputation is below the policy minimum',
    amount: 10_000,
    receiver: MOCK_ALLOWED_RECEIVER,
    payment_type: 'normal' as const,
    variant: 'risky' as const,
  },
  x402Payment: {
    label: 'x402 Payment',
    description: 'Agent-to-agent payment routed through the Firewall',
    amount: 10_000,
    receiver: MOCK_ALLOWED_RECEIVER,
    payment_type: 'x402' as const,
    variant: 'x402' as const,
  },
};

/** Reputation score thresholds for status badges */
export const REPUTATION_THRESHOLDS = {
  TRUSTED: 70,
  RISKY: 40,
};
