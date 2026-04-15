use anchor_lang::prelude::*;
use crate::state::AgentPolicy;

/// Account context for set_policy instruction.
///
/// PDA seeds: ["agent_policy", owner.key()]
/// Uses `init_if_needed` so the policy can be created on first call
/// and updated on subsequent calls by the same owner.
///
/// Requirements: 2.1, 2.2, 2.3, 22.1, 22.2
#[derive(Accounts)]
pub struct SetPolicy<'info> {
    /// The agent policy PDA. Derived from the owner's public key.
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + AgentPolicy::SIZE,
        seeds = [b"agent_policy", owner.key().as_ref()],
        bump
    )]
    pub agent_policy: Account<'info, AgentPolicy>,

    /// The owner of this policy. Must sign both creation and updates.
    #[account(mut)]
    pub owner: Signer<'info>,

    /// System program for account creation.
    pub system_program: Program<'info, System>,
}

/// Handler: Set or update the execution policy.
///
/// On first call: creates the policy account and sets all fields.
/// On subsequent calls: verifies owner matches, then updates fields.
///
/// Post-conditions (Property 3 — Policy Round-Trip):
///   - agent_policy.owner == owner.key()
///   - agent_policy.max_amount == max_amount arg
///   - agent_policy.allowed_receiver == allowed_receiver arg
///   - agent_policy.min_reputation == min_reputation arg
///   - agent_policy.private_mode == private_mode arg
///   - agent_policy.high_value_threshold == high_value_threshold arg
///   - agent_policy.high_value_min_reputation == high_value_min_reputation arg
///
/// Error conditions (Property 4 — Unauthorized Policy Rejection):
///   - If the existing policy.owner != signer → Unauthorized error
pub fn handler(
    ctx: Context<SetPolicy>,
    max_amount: u64,
    allowed_receiver: Pubkey,
    min_reputation: u64,
    private_mode: bool,
    high_value_threshold: u64,
    high_value_min_reputation: u64,
) -> Result<()> {
    let policy = &mut ctx.accounts.agent_policy;
    let owner_key = ctx.accounts.owner.key();

    // On reinit: verify the signer is the existing owner
    // (On first init, policy.owner will be default Pubkey::default())
    if policy.owner != Pubkey::default() && policy.owner != owner_key {
        return Err(crate::errors::SentinelError::Unauthorized.into());
    }

    policy.owner = owner_key;
    policy.max_amount = max_amount;
    policy.allowed_receiver = allowed_receiver;
    policy.min_reputation = min_reputation;
    policy.private_mode = private_mode;
    policy.bump = ctx.bumps.agent_policy;

    // Tiered policy fields (Req 22)
    policy.high_value_threshold = high_value_threshold;
    policy.high_value_min_reputation = high_value_min_reputation;

    msg!(
        "SentinelAI: Policy set for {} — max: {}, receiver: {}, min_rep: {}, private: {}, hv_thresh: {}, hv_min_rep: {}",
        policy.owner,
        policy.max_amount,
        policy.allowed_receiver,
        policy.min_reputation,
        policy.private_mode,
        policy.high_value_threshold,
        policy.high_value_min_reputation
    );

    Ok(())
}
