use anchor_lang::prelude::*;

/// AgentProfile — On-chain account storing an agent's reputation and tx counters.
/// PDA seeds: ["agent_profile", agent_pubkey]
///
/// Requirements: 1.1, 16.1, 16.2, 19.1
#[account]
#[derive(Debug)]
pub struct AgentProfile {
    /// The public key of the AI agent this profile belongs to.
    pub agent_pubkey: Pubkey,

    /// The human or entity wallet that owns and governs this agent profile.
    pub owner: Pubkey,

    /// Reputation score, starts at 50. Increases by 10 on success,
    /// decreases by 5 (saturating) on reputation-gated rejection.
    pub reputation_score: u64,

    /// Total number of transactions submitted (includes rejected).
    pub total_transactions: u64,

    /// Number of successfully executed transactions.
    pub successful_transactions: u64,

    /// PDA bump seed for derivation verification.
    pub bump: u8,

    // ─── Circuit Breaker Fields (Req 16) ─────────────────────────────────
    /// Number of consecutive failures. Reset to 0 on success.
    /// When this reaches CIRCUIT_BREAKER_THRESHOLD (3), agent is frozen.
    pub consecutive_failures: u8,

    /// If true, the agent is frozen by the circuit breaker.
    /// A frozen agent cannot submit transactions until unfrozen by the owner.
    pub frozen: bool,

    // ─── Reputation Decay Field (Req 19) ─────────────────────────────────
    /// The Solana slot number of the last transaction.
    /// Used to calculate reputation decay for idle agents.
    pub last_transaction_slot: u64,
}

impl AgentProfile {
    /// Space required for serialization (excluding the 8-byte Anchor discriminator).
    /// 32 (pubkey) + 32 (owner) + 8 (u64) + 8 (u64) + 8 (u64) + 1 (u8) + 1 (u8) + 1 (bool) + 8 (u64) = 99 bytes
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 8 + 1 + 1 + 1 + 8;

    /// Default reputation score for newly initialized agents.
    pub const DEFAULT_REPUTATION: u64 = 50;

    /// Reputation increment on successful transaction.
    pub const REPUTATION_INCREMENT: u64 = 10;

    /// Reputation decrement on reputation-gated rejection.
    pub const REPUTATION_DECREMENT: u64 = 5;

    /// Number of consecutive failures before circuit breaker trips.
    pub const CIRCUIT_BREAKER_THRESHOLD: u8 = 3;

    /// Number of slots per "day" (~216,000 at 400ms per slot).
    /// Used for reputation decay calculation.
    pub const SLOTS_PER_DAY: u64 = 216_000;

    /// Reputation decay per day of inactivity.
    pub const DECAY_PER_DAY: u64 = 1;
}

/// AgentPolicy — On-chain account storing owner-defined execution rules.
/// PDA seeds: ["agent_policy", owner_pubkey]
///
/// Requirements: 2.1, 22.1, 22.2
#[account]
#[derive(Debug)]
pub struct AgentPolicy {
    /// Owner of this policy (must sign updates).
    pub owner: Pubkey,

    /// Maximum allowed transaction amount in lamports.
    pub max_amount: u64,

    /// Only this receiver public key is permitted.
    pub allowed_receiver: Pubkey,

    /// Minimum agent reputation required to execute.
    pub min_reputation: u64,

    /// If true, transaction details are hidden (PER mode).
    pub private_mode: bool,

    /// PDA bump seed.
    pub bump: u8,

    // ─── Tiered Policy Fields (Req 22) ───────────────────────────────────
    /// Amount threshold above which high-value checks apply.
    /// Set to 0 to disable tiered policy.
    pub high_value_threshold: u64,

    /// Minimum reputation required for high-value transactions.
    pub high_value_min_reputation: u64,
}

impl AgentPolicy {
    /// Space: 32 + 8 + 32 + 8 + 1 + 1 + 8 + 8 = 98 bytes
    pub const SIZE: usize = 32 + 8 + 32 + 8 + 1 + 1 + 8 + 8;
}
