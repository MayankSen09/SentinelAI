use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

#[cfg(test)]
mod tests;


use instructions::*;

declare_id!("4ytqEfZTGXUiDo1HXciUFDeTVqGT5AabLLFpTMysJLbH");

/// SentinelAI — On-chain Execution Control Layer for autonomous AI agents.
///
/// Four instructions:
///   1. initialize_agent_profile — Create a new agent profile (reputation = 50)
///   2. set_policy — Set or update execution policy for an agent
///   3. submit_transaction — Validate and execute a transaction (with circuit breaker)
///   4. unfreeze_agent — Owner-only instruction to unfreeze a frozen agent
#[program]
pub mod sentinel_ai {
    use super::*;

    /// Initialize a new agent profile with default reputation score.
    ///
    /// Requirements: 1.1, 1.3, 16.1, 16.2, 19.1
    /// Property 1: Agent Profile Initialization Invariant
    /// Property 2: Double Initialization Rejection (Anchor handles via `init`)
    pub fn initialize_agent_profile(ctx: Context<InitializeAgentProfile>) -> Result<()> {
        instructions::initialize_agent_profile::handler(ctx)
    }

    /// Set or update the execution policy for an agent.
    ///
    /// Requirements: 2.1, 2.2, 2.3, 22.1, 22.2
    /// Property 3: Policy Round-Trip
    /// Property 4: Unauthorized Policy Rejection
    pub fn set_policy(
        ctx: Context<SetPolicy>,
        max_amount: u64,
        allowed_receiver: Pubkey,
        min_reputation: u64,
        private_mode: bool,
        high_value_threshold: u64,
        high_value_min_reputation: u64,
    ) -> Result<()> {
        instructions::set_policy::handler(
            ctx,
            max_amount,
            allowed_receiver,
            min_reputation,
            private_mode,
            high_value_threshold,
            high_value_min_reputation,
        )
    }

    /// Submit a transaction for validation and execution.
    ///
    /// Flow: frozen check → decay → reputation gate → policy checks → tiered check →
    ///       CPI transfer → reputation update → emit event
    ///
    /// Requirements: 3.1, 4.1, 4.2, 5.1, 5.2, 5.3, 16.3–16.6, 17.1, 19.2, 22.3
    /// Properties 5, 6, 7, 15, 21, 22, 23, 25, 27
    pub fn submit_transaction(ctx: Context<SubmitTransaction>, amount: u64) -> Result<()> {
        instructions::submit_transaction::handler(ctx, amount)
    }

    /// Unfreeze a frozen agent — owner-only.
    ///
    /// Resets frozen = false and consecutive_failures = 0.
    ///
    /// Requirements: 16.7
    /// Property 22: Circuit Breaker Reset
    pub fn unfreeze_agent(ctx: Context<UnfreezeAgent>) -> Result<()> {
        instructions::unfreeze_agent::handler(ctx)
    }
}
