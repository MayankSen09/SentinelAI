use anchor_lang::prelude::*;
use crate::state::AgentProfile;

/// Account context for initialize_agent_profile instruction.
///
/// PDA seeds: ["agent_profile", agent.key()]
/// The `init` constraint ensures this account can only be created once per agent,
/// which inherently enforces Property 2 (Double Initialization Rejection).
///
/// Requirements: 1.1, 1.3, 16.1, 16.2, 19.1
#[derive(Accounts)]
pub struct InitializeAgentProfile<'info> {
    /// The agent's profile PDA. Derived from the agent's public key.
    #[account(
        init,
        payer = payer,
        space = 8 + AgentProfile::SIZE,
        seeds = [b"agent_profile", agent.key().as_ref()],
        bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    /// The agent whose profile is being created.
    /// CHECK: Any valid public key can be an agent. This is the key used for PDA derivation.
    pub agent: AccountInfo<'info>,

    /// The account paying for the profile's rent.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program for creating accounts.
    pub system_program: Program<'info, System>,
}

/// Handler: Create a new agent profile with default values.
///
/// Post-conditions (Property 1):
///   - agent_profile.agent_pubkey == agent.key()
///   - agent_profile.reputation_score == 50
///   - agent_profile.total_transactions == 0
///   - agent_profile.successful_transactions == 0
///   - agent_profile.consecutive_failures == 0
///   - agent_profile.frozen == false
///   - agent_profile.last_transaction_slot == current_slot
pub fn handler(ctx: Context<InitializeAgentProfile>) -> Result<()> {
    let agent_profile = &mut ctx.accounts.agent_profile;

    agent_profile.agent_pubkey = ctx.accounts.agent.key();
    agent_profile.owner = ctx.accounts.payer.key();
    agent_profile.reputation_score = AgentProfile::DEFAULT_REPUTATION;
    agent_profile.total_transactions = 0;
    agent_profile.successful_transactions = 0;
    agent_profile.bump = ctx.bumps.agent_profile;

    // Circuit breaker fields (Req 16)
    agent_profile.consecutive_failures = 0;
    agent_profile.frozen = false;

    // Reputation decay field (Req 19)
    agent_profile.last_transaction_slot = Clock::get()?.slot;

    msg!(
        "SentinelAI: Agent profile initialized for {} with reputation {}",
        agent_profile.agent_pubkey,
        agent_profile.reputation_score
    );

    Ok(())
}
