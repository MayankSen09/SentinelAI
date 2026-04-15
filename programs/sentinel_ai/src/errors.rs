use anchor_lang::prelude::*;

/// Custom error codes for the SentinelAI program.
///
/// Requirements: 1.2, 2.2, 3.1, 4.1, 4.2, 16.3, 22.4
#[error_code]
pub enum SentinelError {
    /// 6000 - Agent profile already exists for this public key.
    #[msg("Agent profile already initialized")]
    AlreadyInitialized,

    /// 6001 - Signer does not own this policy account.
    #[msg("Unauthorized: signer is not the policy owner")]
    Unauthorized,

    /// 6002 - Agent reputation score is below the policy minimum.
    #[msg("Reputation score below minimum required")]
    ReputationTooLow,

    /// 6003 - Transaction amount exceeds the policy maximum.
    #[msg("Transaction amount exceeds policy maximum")]
    AmountExceedsMax,

    /// 6004 - Receiver does not match the policy allowed receiver.
    #[msg("Receiver does not match policy allowed receiver")]
    ReceiverNotAllowed,

    /// 6005 - SOL transfer via System Program CPI failed.
    #[msg("SOL transfer failed")]
    TransferFailed,

    /// 6006 - Agent is frozen by the circuit breaker after 3 consecutive failures.
    #[msg("Agent is frozen by circuit breaker — owner must unfreeze")]
    AgentFrozen,

    /// 6007 - High-value transaction requires higher reputation.
    #[msg("High-value transaction requires higher reputation")]
    HighValueReputationInsufficient,
}
