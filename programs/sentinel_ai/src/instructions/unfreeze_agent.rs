use anchor_lang::prelude::*;
use crate::state::{AgentProfile, AgentPolicy};
use crate::errors::SentinelError;

/// Account context for unfreeze_agent instruction.
///
/// Only the policy owner can unfreeze a frozen agent.
/// This provides the manual "kill switch recovery" for the circuit breaker.
///
/// Requirements: 16.7
#[derive(Accounts)]
pub struct UnfreezeAgent<'info> {
    /// Agent profile PDA (mutable — frozen and consecutive_failures are reset).
    #[account(
        mut,
        seeds = [b"agent_profile", agent.key().as_ref()],
        bump = agent_profile.bump,
        has_one = owner
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    /// CHECK: Only used to derive the proper agent profile PDA.
    pub agent: AccountInfo<'info>,

    /// The owner of the agent's policy. Must sign.
    pub owner: Signer<'info>,
}

/// Handler: Unfreeze a frozen agent.
///
/// Pre-conditions:
///   - owner == agent_policy.owner (enforced by PDA derivation)
///   - agent_profile.frozen == true (otherwise no-op)
///
/// Post-conditions:
///   - agent_profile.frozen = false
///   - agent_profile.consecutive_failures = 0
///
/// Property 22: Circuit Breaker Reset
pub fn handler(ctx: Context<UnfreezeAgent>) -> Result<()> {
    let profile = &mut ctx.accounts.agent_profile;
    let owner = ctx.accounts.owner.key();

    // The macro constraint `has_one = owner` on agent_profile already guarantees
    // the transaction signer is the legally authorized human owner of the agent!

    let was_frozen = profile.frozen;

    // Reset circuit breaker state
    profile.frozen = false;
    profile.consecutive_failures = 0;

    msg!(
        "SentinelAI: Agent {} {} by owner {}",
        profile.agent_pubkey,
        if was_frozen { "UNFROZEN" } else { "already active" },
        owner
    );

    // Emit event for real-time dashboard
    emit!(AgentUnfrozen {
        agent: profile.agent_pubkey,
        unfrozen_by: owner,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Emitted when an agent is unfrozen by its owner.
#[event]
pub struct AgentUnfrozen {
    pub agent: Pubkey,
    pub unfrozen_by: Pubkey,
    pub timestamp: i64,
}
