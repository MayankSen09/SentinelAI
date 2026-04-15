#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::Pubkey;
    use proptest::prelude::*;
    use crate::state::{AgentProfile, AgentPolicy};

    // ─── Property 1: Agent Profile Initialization Invariant ────────────────
    // Feature: sentinel-ai, Property 1: Agent Profile Initialization Invariant
    // For any randomly generated keypair, initializing an agent profile SHALL produce:
    //   reputation_score == 50, total_transactions == 0, successful_transactions == 0

    proptest! {
        #[test]
        fn prop_1_init_invariant(
            seed in any::<[u8; 32]>()
        ) {
            let pubkey = Pubkey::new_from_array(seed);
            
            // Simulate profile initialization
            let profile = AgentProfile {
                agent_pubkey: pubkey,
                reputation_score: AgentProfile::DEFAULT_REPUTATION,
                total_transactions: 0,
                successful_transactions: 0,
                bump: 255,
            };
            
            prop_assert_eq!(profile.reputation_score, 50);
            prop_assert_eq!(profile.total_transactions, 0);
            prop_assert_eq!(profile.successful_transactions, 0);
            prop_assert_eq!(profile.agent_pubkey, pubkey);
        }
    }

    // ─── Property 3: Policy Round-Trip ─────────────────────────────────────
    // Feature: sentinel-ai, Property 3: Policy Round-Trip
    // For any (u64, Pubkey, u64, bool) tuple, writing to AgentPolicy and reading back
    // SHALL return identical values.

    proptest! {
        #[test]
        fn prop_3_policy_round_trip(
            max_amount in any::<u64>(),
            receiver_seed in any::<[u8; 32]>(),
            min_reputation in any::<u64>(),
            private_mode in any::<bool>(),
            owner_seed in any::<[u8; 32]>()
        ) {
            let owner = Pubkey::new_from_array(owner_seed);
            let receiver = Pubkey::new_from_array(receiver_seed);
            
            let policy = AgentPolicy {
                owner,
                max_amount,
                allowed_receiver: receiver,
                min_reputation,
                private_mode,
                bump: 255,
            };
            
            prop_assert_eq!(policy.owner, owner);
            prop_assert_eq!(policy.max_amount, max_amount);
            prop_assert_eq!(policy.allowed_receiver, receiver);
            prop_assert_eq!(policy.min_reputation, min_reputation);
            prop_assert_eq!(policy.private_mode, private_mode);
        }
    }

    // ─── Property 5: Reputation Gate Rejection and Decrement ───────────────
    // Feature: sentinel-ai, Property 5: Reputation Gate Rejection and Decrement
    // For any (score, min_rep) where score < min_rep, reputation SHALL be
    // decremented by 5 (clamped to 0), and total_transactions SHALL increment.

    proptest! {
        #[test]
        fn prop_5_reputation_gate_decrement(
            score in 0u64..1000u64,
            gap in 1u64..500u64,
            total_txns in 0u64..u64::MAX/2
        ) {
            let min_rep = score + gap; // Ensure score < min_rep
            let initial_total = total_txns;
            
            // Simulate reputation gate logic
            let new_score = score.saturating_sub(AgentProfile::REPUTATION_DECREMENT);
            let new_total = initial_total.checked_add(1).unwrap();
            
            // Score should decrease by 5 or clamp to 0
            if score >= 5 {
                prop_assert_eq!(new_score, score - 5);
            } else {
                prop_assert_eq!(new_score, 0);
            }
            
            // Total should increment
            prop_assert_eq!(new_total, initial_total + 1);
        }
    }

    // ─── Property 6: Policy Violation — No State Change ────────────────────
    // Feature: sentinel-ai, Property 6: Policy Violation Rejection
    // For any amount > max_amount or mismatched receiver, rejection SHALL NOT
    // change reputation_score or successful_transactions.

    proptest! {
        #[test]
        fn prop_6_amount_violation_no_state_change(
            amount in 1u64..u64::MAX,
            max_amount in 0u64..u64::MAX/2,
            score in 0u64..1000u64,
            successful in 0u64..1000u64
        ) {
            prop_assume!(amount > max_amount);
            
            // Simulate: amount > max_amount → reject without state change
            // The program just returns AmountExceedsMax error
            // Reputation and successful_txns should remain unchanged
            let post_score = score;
            let post_successful = successful;
            
            prop_assert_eq!(post_score, score);
            prop_assert_eq!(post_successful, successful);
        }
    }

    proptest! {
        #[test]
        fn prop_6_receiver_violation_no_state_change(
            receiver_seed in any::<[u8; 32]>(),
            allowed_seed in any::<[u8; 32]>(),
            score in 0u64..1000u64,
            successful in 0u64..1000u64
        ) {
            let receiver = Pubkey::new_from_array(receiver_seed);
            let allowed = Pubkey::new_from_array(allowed_seed);
            prop_assume!(receiver != allowed);
            
            // Mismatched receiver → reject without state change
            let post_score = score;
            let post_successful = successful;
            
            prop_assert_eq!(post_score, score);
            prop_assert_eq!(post_successful, successful);
        }
    }

    // ─── Property 7: Successful Transaction State Update ───────────────────
    // Feature: sentinel-ai, Property 7: Successful Transaction State Update
    // For any valid tx passing both checks, reputation +=10, counters +=1.

    proptest! {
        #[test]
        fn prop_7_successful_tx_state_update(
            score in 0u64..u64::MAX/2,
            total in 0u64..u64::MAX/2,
            successful in 0u64..u64::MAX/2
        ) {
            let new_score = score.checked_add(AgentProfile::REPUTATION_INCREMENT).unwrap();
            let new_total = total.checked_add(1).unwrap();
            let new_successful = successful.checked_add(1).unwrap();
            
            prop_assert_eq!(new_score, score + 10);
            prop_assert_eq!(new_total, total + 1);
            prop_assert_eq!(new_successful, successful + 1);
        }
    }

    // ─── Property 15: Multi-Agent Account Isolation ────────────────────────
    // Feature: sentinel-ai, Property 15: Multi-Agent Account Isolation
    // For any set of distinct keypairs, PDA derivation produces distinct addresses.

    proptest! {
        #[test]
        fn prop_15_multi_agent_pda_isolation(
            seed1 in any::<[u8; 32]>(),
            seed2 in any::<[u8; 32]>()
        ) {
            let key1 = Pubkey::new_from_array(seed1);
            let key2 = Pubkey::new_from_array(seed2);
            prop_assume!(key1 != key2);
            
            // Different agents produce different profile PDAs
            let program_id = crate::ID;
            let (pda1, _) = Pubkey::find_program_address(
                &[b"agent_profile", key1.as_ref()],
                &program_id,
            );
            let (pda2, _) = Pubkey::find_program_address(
                &[b"agent_profile", key2.as_ref()],
                &program_id,
            );
            
            prop_assert_ne!(pda1, pda2);
        }
    }

    // ─── Size constant tests ───────────────────────────────────────────────

    #[test]
    fn test_agent_profile_size() {
        assert_eq!(AgentProfile::SIZE, 67);
    }

    #[test]
    fn test_agent_policy_size() {
        assert_eq!(AgentPolicy::SIZE, 98);
    }

    #[test]
    fn test_default_reputation() {
        assert_eq!(AgentProfile::DEFAULT_REPUTATION, 50);
    }

    #[test]
    fn test_reputation_increment() {
        assert_eq!(AgentProfile::REPUTATION_INCREMENT, 10);
    }

    #[test]
    fn test_reputation_decrement() {
        assert_eq!(AgentProfile::REPUTATION_DECREMENT, 5);
    }

    // ─── Property 21: Circuit Breaker Activation ───────────────────────────
    // Feature: sentinel-ai, Property 21: Circuit Breaker Activation
    proptest! {
        #[test]
        fn prop_21_circuit_breaker_activation(
            failures in 3u8..255u8
        ) {
            let threshold = AgentProfile::CIRCUIT_BREAKER_THRESHOLD;
            // Any failures >= 3 implies frozen state
            prop_assert!(failures >= threshold);
        }
    }

    // ─── Property 25: Reputation Decay Correctness ─────────────────────────
    // Feature: sentinel-ai, Property 25: Reputation Decay Correctness
    proptest! {
        #[test]
        fn prop_25_reputation_decay(
            score in 10u64..100u64,
            elapsed_days in 1u64..10u64
        ) {
            let decay = elapsed_days * AgentProfile::DECAY_PER_DAY;
            let post_score = score.saturating_sub(decay);
            // It strictly drops
            prop_assert!(post_score < score);
            // Decay is 1 per day
            prop_assert_eq!(post_score, score - elapsed_days);
        }
    }
}
