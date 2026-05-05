use anchor_lang::prelude::*;
use crate::state::AgentProfile;

/// Account context for freeze_agent instruction.
///
/// Only the profile owner can manually freeze an agent.
/// This provides the manual "kill switch" for the circuit breaker.
#[derive(Accounts)]
pub struct FreezeAgent<'info> {
    /// Agent profile PDA (mutable — frozen is set to true).
    #[account(
        mut,
        seeds = [b"agent_profile", agent.key().as_ref()],
        bump = agent_profile.bump,
        has_one = owner
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    /// CHECK: Only used to derive the proper agent profile PDA.
    pub agent: AccountInfo<'info>,

    /// The owner of the agent profile. Must sign.
    pub owner: Signer<'info>,
}

/// Handler: Manually freeze an agent.
///
/// Pre-conditions:
///   - owner == agent_profile.owner (enforced by has_one)
///
/// Post-conditions:
///   - agent_profile.frozen = true
pub fn handler(ctx: Context<FreezeAgent>) -> Result<()> {
    let profile = &mut ctx.accounts.agent_profile;
    let owner = ctx.accounts.owner.key();

    let was_frozen = profile.frozen;

    profile.frozen = true;

    msg!(
        "SentinelAI: Agent {} {} by owner {}",
        profile.agent_pubkey,
        if was_frozen { "already frozen" } else { "FROZEN" },
        owner
    );

    emit!(AgentFrozen {
        agent: profile.agent_pubkey,
        frozen_by: owner,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// Emitted when an agent is manually frozen by its owner.
#[event]
pub struct AgentFrozen {
    pub agent: Pubkey,
    pub frozen_by: Pubkey,
    pub timestamp: i64,
}
