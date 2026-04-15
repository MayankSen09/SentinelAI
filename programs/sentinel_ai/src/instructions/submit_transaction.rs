use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{AgentProfile, AgentPolicy};
use crate::errors::SentinelError;

/// Account context for submit_transaction instruction.
///
/// Requires both the agent's profile (mutable, for reputation updates)
/// and the agent's policy (read-only, for validation checks).
///
/// Requirements: 3.1, 4.1, 5.1, 16.3, 19.2, 22.3
#[derive(Accounts)]
pub struct SubmitTransaction<'info> {
    /// Agent profile PDA (mutable — reputation and counters are updated).
    #[account(
        mut,
        seeds = [b"agent_profile", agent.key().as_ref()],
        bump = agent_profile.bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    /// Agent policy PDA (read-only — used for validation only).
    #[account(
        seeds = [b"agent_policy", agent_profile.owner.as_ref()],
        bump = agent_policy.bump
    )]
    pub agent_policy: Account<'info, AgentPolicy>,

    /// The agent submitting the transaction. Must sign.
    #[account(mut)]
    pub agent: Signer<'info>,

    /// The receiver of the SOL transfer.
    /// CHECK: Validated against the policy's allowed_receiver.
    #[account(mut)]
    pub receiver: AccountInfo<'info>,

    /// System program — required for CPI SOL transfer.
    pub system_program: Program<'info, System>,
}

/// Handler: Validate and execute a transaction.
///
/// Execution flow:
///   0. Frozen Check — reject if circuit breaker is tripped
///   1. Reputation Decay — apply idle penalty if applicable
///   2. Reputation Gate — reject if score < min_reputation, decrement by 5
///   3. Policy Gate — reject if amount > max_amount or receiver mismatch
///   4. Tiered Gate — reject high-value tx if rep below high_value_min_reputation
///   5. CPI Transfer — invoke system_program::transfer
///   6. Reputation Update — increment score by 10, update counters, reset failures
///   7. Emit Event — TransactionProcessed event for real-time dashboard
///
/// Properties enforced: P5, P6, P7, P15, P21, P22, P23, P25, P27
pub fn handler(ctx: Context<SubmitTransaction>, amount: u64) -> Result<()> {
    let profile = &mut ctx.accounts.agent_profile;
    let policy = &ctx.accounts.agent_policy;

    // ── Step 0: Circuit Breaker — Frozen Check ──────────────────────────
    // Property 23: Frozen agent → AgentFrozen error, no state changes
    if profile.frozen {
        msg!(
            "SentinelAI: BLOCKED — agent {} is FROZEN by circuit breaker ({} consecutive failures)",
            profile.agent_pubkey,
            profile.consecutive_failures
        );
        return Err(SentinelError::AgentFrozen.into());
    }

    // ── Step 1: Reputation Decay ────────────────────────────────────────
    // Property 25: Apply decay for idle agents (1 point per ~day of inactivity)
    let current_slot = Clock::get()?.slot;
    if profile.last_transaction_slot > 0 && current_slot > profile.last_transaction_slot {
        let elapsed_slots = current_slot - profile.last_transaction_slot;
        let elapsed_days = elapsed_slots / AgentProfile::SLOTS_PER_DAY;
        if elapsed_days > 0 {
            let decay = elapsed_days * AgentProfile::DECAY_PER_DAY;
            let old_score = profile.reputation_score;
            profile.reputation_score = profile.reputation_score.saturating_sub(decay);
            if old_score != profile.reputation_score {
                msg!(
                    "SentinelAI: Reputation decay applied — {} → {} ({} days idle)",
                    old_score,
                    profile.reputation_score,
                    elapsed_days
                );
            }
        }
    }
    // Update last_transaction_slot to current
    profile.last_transaction_slot = current_slot;

    // ── Step 2: Reputation Gate ─────────────────────────────────────────
    // Property 5: If reputation < min_reputation → reject, decrement by 5, increment total
    if profile.reputation_score < policy.min_reputation {
        let old_score = profile.reputation_score;
        profile.reputation_score = profile.reputation_score.saturating_sub(
            AgentProfile::REPUTATION_DECREMENT,
        );
        profile.total_transactions = profile.total_transactions.saturating_add(1);

        // Circuit breaker: increment consecutive failures
        profile.consecutive_failures = profile.consecutive_failures.saturating_add(1);
        if profile.consecutive_failures >= AgentProfile::CIRCUIT_BREAKER_THRESHOLD {
            profile.frozen = true;
            msg!(
                "SentinelAI: ⚠️ CIRCUIT BREAKER TRIPPED — agent {} frozen after {} consecutive failures",
                profile.agent_pubkey,
                profile.consecutive_failures
            );
            emit!(CircuitBreakerTripped {
                agent: profile.agent_pubkey,
                consecutive_failures: profile.consecutive_failures,
                timestamp: Clock::get()?.unix_timestamp,
            });
        }

        msg!(
            "SentinelAI: REJECTED — reputation {} → {} (min required: {})",
            old_score,
            profile.reputation_score,
            policy.min_reputation
        );

        // Emit rejection event
        emit!(TransactionProcessed {
            agent: profile.agent_pubkey,
            status: "rejected".to_string(),
            amount,
            reason: format!("Reputation {} below minimum {}", old_score, policy.min_reputation),
            new_reputation: profile.reputation_score,
            timestamp: Clock::get()?.unix_timestamp,
        });

        return Err(SentinelError::ReputationTooLow.into());
    }

    // ── Step 3: Policy Gate — Amount Check ──────────────────────────────
    // Property 6: If amount > max_amount → reject, no state change
    if amount > policy.max_amount {
        // Circuit breaker: increment consecutive failures
        profile.consecutive_failures = profile.consecutive_failures.saturating_add(1);
        if profile.consecutive_failures >= AgentProfile::CIRCUIT_BREAKER_THRESHOLD {
            profile.frozen = true;
            msg!(
                "SentinelAI: ⚠️ CIRCUIT BREAKER TRIPPED — agent {} frozen after {} consecutive failures",
                profile.agent_pubkey,
                profile.consecutive_failures
            );
            emit!(CircuitBreakerTripped {
                agent: profile.agent_pubkey,
                consecutive_failures: profile.consecutive_failures,
                timestamp: Clock::get()?.unix_timestamp,
            });
        }

        msg!(
            "SentinelAI: REJECTED — amount {} exceeds max {}",
            amount,
            policy.max_amount
        );

        emit!(TransactionProcessed {
            agent: profile.agent_pubkey,
            status: "rejected".to_string(),
            amount,
            reason: format!("Amount {} exceeds max {}", amount, policy.max_amount),
            new_reputation: profile.reputation_score,
            timestamp: Clock::get()?.unix_timestamp,
        });

        return Err(SentinelError::AmountExceedsMax.into());
    }

    // ── Step 4: Policy Gate — Receiver Check ────────────────────────────
    if ctx.accounts.receiver.key() != policy.allowed_receiver {
        // Circuit breaker: increment consecutive failures
        profile.consecutive_failures = profile.consecutive_failures.saturating_add(1);
        if profile.consecutive_failures >= AgentProfile::CIRCUIT_BREAKER_THRESHOLD {
            profile.frozen = true;
            msg!(
                "SentinelAI: ⚠️ CIRCUIT BREAKER TRIPPED — agent {} frozen after {} consecutive failures",
                profile.agent_pubkey,
                profile.consecutive_failures
            );
            emit!(CircuitBreakerTripped {
                agent: profile.agent_pubkey,
                consecutive_failures: profile.consecutive_failures,
                timestamp: Clock::get()?.unix_timestamp,
            });
        }

        msg!(
            "SentinelAI: REJECTED — receiver {} != allowed {}",
            ctx.accounts.receiver.key(),
            policy.allowed_receiver
        );

        emit!(TransactionProcessed {
            agent: profile.agent_pubkey,
            status: "rejected".to_string(),
            amount,
            reason: format!("Receiver mismatch"),
            new_reputation: profile.reputation_score,
            timestamp: Clock::get()?.unix_timestamp,
        });

        return Err(SentinelError::ReceiverNotAllowed.into());
    }

    // ── Step 5: Tiered Policy Gate (Req 22) ─────────────────────────────
    // Property 27: High-value amount + low rep → reject
    if policy.high_value_threshold > 0
        && amount > policy.high_value_threshold
        && profile.reputation_score < policy.high_value_min_reputation
    {
        profile.consecutive_failures = profile.consecutive_failures.saturating_add(1);
        if profile.consecutive_failures >= AgentProfile::CIRCUIT_BREAKER_THRESHOLD {
            profile.frozen = true;
            emit!(CircuitBreakerTripped {
                agent: profile.agent_pubkey,
                consecutive_failures: profile.consecutive_failures,
                timestamp: Clock::get()?.unix_timestamp,
            });
        }

        msg!(
            "SentinelAI: REJECTED — high-value tx ({} lamports) requires reputation >= {}, agent has {}",
            amount,
            policy.high_value_min_reputation,
            profile.reputation_score
        );

        emit!(TransactionProcessed {
            agent: profile.agent_pubkey,
            status: "rejected".to_string(),
            amount,
            reason: format!("High-value transaction requires reputation >= {}", policy.high_value_min_reputation),
            new_reputation: profile.reputation_score,
            timestamp: Clock::get()?.unix_timestamp,
        });

        return Err(SentinelError::HighValueReputationInsufficient.into());
    }

    // ── Step 6: CPI SOL Transfer ────────────────────────────────────────
    // Property 7: Execute the transfer via System Program CPI
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.agent.to_account_info(),
            to: ctx.accounts.receiver.to_account_info(),
        },
    );

    system_program::transfer(cpi_ctx, amount).map_err(|_| SentinelError::TransferFailed)?;

    // ── Step 7: Update Reputation and Counters ──────────────────────────
    // Property 7: Successful tx → reputation += 10, counters += 1
    // Property 22: Reset consecutive_failures on success
    let old_score = profile.reputation_score;
    profile.reputation_score = profile
        .reputation_score
        .saturating_add(AgentProfile::REPUTATION_INCREMENT);
    profile.successful_transactions = profile
        .successful_transactions
        .saturating_add(1);
    profile.total_transactions = profile
        .total_transactions
        .saturating_add(1);

    // Circuit breaker: reset failures on success
    profile.consecutive_failures = 0;

    msg!(
        "SentinelAI: APPROVED — {} lamports sent, reputation {} → {}",
        amount,
        old_score,
        profile.reputation_score
    );

    // ── Step 8: Emit Success Event ──────────────────────────────────────
    emit!(TransactionProcessed {
        agent: profile.agent_pubkey,
        status: "approved".to_string(),
        amount,
        reason: format!("Transaction approved — {} lamports transferred", amount),
        new_reputation: profile.reputation_score,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// ─── Anchor Events (Req 17) ─────────────────────────────────────────────────

/// Emitted after every submit_transaction call, both on approval and rejection.
#[event]
pub struct TransactionProcessed {
    pub agent: Pubkey,
    pub status: String,
    pub amount: u64,
    pub reason: String,
    pub new_reputation: u64,
    pub timestamp: i64,
}

/// Emitted when the circuit breaker trips (agent frozen).
#[event]
pub struct CircuitBreakerTripped {
    pub agent: Pubkey,
    pub consecutive_failures: u8,
    pub timestamp: i64,
}
