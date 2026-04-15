import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

// @ts-ignore - IDL types will resolve automatically once `anchor build` finishes in the background
import type { SentinelAi } from "../target/types/sentinel_ai";

describe("sentinel_ai", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Temporarily cast to any so the IDE stops flagging methods/accounts as undefined before the IDL is generated
  const program = anchor.workspace.SentinelAi as any;

  // Helper: derive AgentProfile PDA
  const deriveProfilePDA = (agentPubkey: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("agent_profile"), agentPubkey.toBuffer()],
      program.programId
    );

  // Helper: derive AgentPolicy PDA
  const derivePolicyPDA = (ownerPubkey: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("agent_policy"), ownerPubkey.toBuffer()],
      program.programId
    );

  // Helper: airdrop SOL to a keypair
  const airdrop = async (pubkey: PublicKey, sol: number = 2) => {
    const sig = await provider.connection.requestAirdrop(
      pubkey,
      sol * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
  };

  // ─── Property 1: Agent Profile Initialization Invariant ─────────────────

  describe("Property 1: Agent Profile Initialization Invariant", () => {
    it("initializes profile with reputation=50, counters=0", async () => {
      const agent = Keypair.generate();
      await airdrop(agent.publicKey);

      const [profilePDA] = deriveProfilePDA(agent.publicKey);

      await program.methods
        .initializeAgentProfile()
        .accounts({
          agentProfile: profilePDA,
          agent: agent.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const profile = await program.account.agentProfile.fetch(profilePDA);

      expect(profile.agentPubkey.toBase58()).to.equal(agent.publicKey.toBase58());
      expect(profile.reputationScore.toNumber()).to.equal(50);
      expect(profile.totalTransactions.toNumber()).to.equal(0);
      expect(profile.successfulTransactions.toNumber()).to.equal(0);
    });
  });

  // ─── Property 2: Double Initialization Rejection ────────────────────────

  describe("Property 2: Double Initialization Rejection", () => {
    it("rejects second init for the same agent", async () => {
      const agent = Keypair.generate();
      await airdrop(agent.publicKey);

      const [profilePDA] = deriveProfilePDA(agent.publicKey);

      // First init should succeed
      await program.methods
        .initializeAgentProfile()
        .accounts({
          agentProfile: profilePDA,
          agent: agent.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Second init should fail (Anchor `init` constraint)
      try {
        await program.methods
          .initializeAgentProfile()
          .accounts({
            agentProfile: profilePDA,
            agent: agent.publicKey,
            payer: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        // Anchor will throw because account already exists
        expect(err).to.exist;
      }
    });
  });

  // ─── Property 3: Policy Round-Trip ──────────────────────────────────────

  describe("Property 3: Policy Round-Trip", () => {
    it("stores and reads back identical policy values", async () => {
      const owner = Keypair.generate();
      await airdrop(owner.publicKey);

      const [policyPDA] = derivePolicyPDA(owner.publicKey);
      const receiver = Keypair.generate().publicKey;
      const maxAmount = new anchor.BN(5_000_000_000);
      const minReputation = new anchor.BN(60);

      await program.methods
        .setPolicy(maxAmount, receiver, minReputation, true)
        .accounts({
          agentPolicy: policyPDA,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const policy = await program.account.agentPolicy.fetch(policyPDA);

      expect(policy.owner.toBase58()).to.equal(owner.publicKey.toBase58());
      expect(policy.maxAmount.toNumber()).to.equal(5_000_000_000);
      expect(policy.allowedReceiver.toBase58()).to.equal(receiver.toBase58());
      expect(policy.minReputation.toNumber()).to.equal(60);
      expect(policy.privateMode).to.equal(true);
    });

    it("updates policy on second call by same owner", async () => {
      const owner = Keypair.generate();
      await airdrop(owner.publicKey);

      const [policyPDA] = derivePolicyPDA(owner.publicKey);
      const receiver1 = Keypair.generate().publicKey;
      const receiver2 = Keypair.generate().publicKey;

      // First set
      await program.methods
        .setPolicy(new anchor.BN(1000), receiver1, new anchor.BN(40), false)
        .accounts({
          agentPolicy: policyPDA,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      // Second set (update)
      await program.methods
        .setPolicy(new anchor.BN(2000), receiver2, new anchor.BN(50), true)
        .accounts({
          agentPolicy: policyPDA,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const policy = await program.account.agentPolicy.fetch(policyPDA);
      expect(policy.maxAmount.toNumber()).to.equal(2000);
      expect(policy.allowedReceiver.toBase58()).to.equal(receiver2.toBase58());
      expect(policy.minReputation.toNumber()).to.equal(50);
      expect(policy.privateMode).to.equal(true);
    });
  });

  // ─── Property 5: Reputation Gate Rejection + Decrement ──────────────────

  describe("Property 5: Reputation Gate Rejection and Decrement", () => {
    it("rejects when reputation < min_reputation and decrements score", async () => {
      const agent = Keypair.generate();
      await airdrop(agent.publicKey, 5);

      const receiver = Keypair.generate();
      const [profilePDA] = deriveProfilePDA(agent.publicKey);
      const [policyPDA] = derivePolicyPDA(agent.publicKey);

      // Init profile (reputation starts at 50)
      await program.methods
        .initializeAgentProfile()
        .accounts({
          agentProfile: profilePDA,
          agent: agent.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Set policy with min_reputation = 100 (agent has 50, will fail)
      await program.methods
        .setPolicy(
          new anchor.BN(LAMPORTS_PER_SOL),
          receiver.publicKey,
          new anchor.BN(100), // min reputation
          false
        )
        .accounts({
          agentPolicy: policyPDA,
          owner: agent.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();

      // Submit transaction — should fail reputation gate
      try {
        await program.methods
          .submitTransaction(new anchor.BN(10_000))
          .accounts({
            agentProfile: profilePDA,
            agentPolicy: policyPDA,
            agent: agent.publicKey,
            receiver: receiver.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([agent])
          .rpc();
        expect.fail("Should have thrown ReputationTooLow");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.message).to.contain(
          "ReputationTooLow"
        );
      }

      // Verify reputation was decremented (50 - 5 = 45)
      const profile = await program.account.agentProfile.fetch(profilePDA);
      expect(profile.reputationScore.toNumber()).to.equal(45);
      expect(profile.totalTransactions.toNumber()).to.equal(1);
      expect(profile.successfulTransactions.toNumber()).to.equal(0);
    });
  });

  // ─── Property 6: Policy Violation Rejection ─────────────────────────────

  describe("Property 6: Policy Violation Rejection", () => {
    it("rejects when amount exceeds max_amount — no rep change", async () => {
      const agent = Keypair.generate();
      await airdrop(agent.publicKey, 5);

      const receiver = Keypair.generate();
      const [profilePDA] = deriveProfilePDA(agent.publicKey);
      const [policyPDA] = derivePolicyPDA(agent.publicKey);

      await program.methods
        .initializeAgentProfile()
        .accounts({
          agentProfile: profilePDA,
          agent: agent.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Set policy with max_amount = 1000 lamports
      await program.methods
        .setPolicy(
          new anchor.BN(1000), // max amount
          receiver.publicKey,
          new anchor.BN(40), // min reputation (agent has 50, passes)
          false
        )
        .accounts({
          agentPolicy: policyPDA,
          owner: agent.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();

      // Submit with amount = 5000 (exceeds max)
      try {
        await program.methods
          .submitTransaction(new anchor.BN(5000))
          .accounts({
            agentProfile: profilePDA,
            agentPolicy: policyPDA,
            agent: agent.publicKey,
            receiver: receiver.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([agent])
          .rpc();
        expect.fail("Should have thrown AmountExceedsMax");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.message).to.contain(
          "AmountExceedsMax"
        );
      }

      // Verify NO reputation change (policy violation doesn't affect rep)
      const profile = await program.account.agentProfile.fetch(profilePDA);
      expect(profile.reputationScore.toNumber()).to.equal(50);
      expect(profile.totalTransactions.toNumber()).to.equal(0);
      expect(profile.successfulTransactions.toNumber()).to.equal(0);
    });

    it("rejects when receiver doesn't match policy — no rep change", async () => {
      const agent = Keypair.generate();
      await airdrop(agent.publicKey, 5);

      const allowedReceiver = Keypair.generate();
      const wrongReceiver = Keypair.generate();
      const [profilePDA] = deriveProfilePDA(agent.publicKey);
      const [policyPDA] = derivePolicyPDA(agent.publicKey);

      await program.methods
        .initializeAgentProfile()
        .accounts({
          agentProfile: profilePDA,
          agent: agent.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .setPolicy(
          new anchor.BN(LAMPORTS_PER_SOL),
          allowedReceiver.publicKey,
          new anchor.BN(40),
          false
        )
        .accounts({
          agentPolicy: policyPDA,
          owner: agent.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();

      // Submit with wrong receiver
      try {
        await program.methods
          .submitTransaction(new anchor.BN(10_000))
          .accounts({
            agentProfile: profilePDA,
            agentPolicy: policyPDA,
            agent: agent.publicKey,
            receiver: wrongReceiver.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([agent])
          .rpc();
        expect.fail("Should have thrown ReceiverNotAllowed");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.message).to.contain(
          "ReceiverNotAllowed"
        );
      }

      // Verify NO reputation change
      const profile = await program.account.agentProfile.fetch(profilePDA);
      expect(profile.reputationScore.toNumber()).to.equal(50);
    });
  });

  // ─── Property 7: Successful Transaction State Update ────────────────────

  describe("Property 7: Successful Transaction State Update", () => {
    it("approves valid transaction and updates rep+counters", async () => {
      const agent = Keypair.generate();
      await airdrop(agent.publicKey, 5);

      const receiver = Keypair.generate();
      const [profilePDA] = deriveProfilePDA(agent.publicKey);
      const [policyPDA] = derivePolicyPDA(agent.publicKey);

      await program.methods
        .initializeAgentProfile()
        .accounts({
          agentProfile: profilePDA,
          agent: agent.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .setPolicy(
          new anchor.BN(LAMPORTS_PER_SOL),
          receiver.publicKey,
          new anchor.BN(40),
          false
        )
        .accounts({
          agentPolicy: policyPDA,
          owner: agent.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();

      const transferAmount = 50_000; // 0.00005 SOL

      // Check receiver balance before
      const receiverBalanceBefore =
        await provider.connection.getBalance(receiver.publicKey);

      await program.methods
        .submitTransaction(new anchor.BN(transferAmount))
        .accounts({
          agentProfile: profilePDA,
          agentPolicy: policyPDA,
          agent: agent.publicKey,
          receiver: receiver.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();

      // Verify profile updates
      const profile = await program.account.agentProfile.fetch(profilePDA);
      expect(profile.reputationScore.toNumber()).to.equal(60); // 50 + 10
      expect(profile.totalTransactions.toNumber()).to.equal(1);
      expect(profile.successfulTransactions.toNumber()).to.equal(1);

      // Verify SOL was transferred
      const receiverBalanceAfter =
        await provider.connection.getBalance(receiver.publicKey);
      expect(receiverBalanceAfter - receiverBalanceBefore).to.equal(transferAmount);
    });
  });

  // ─── Property 15: Multi-Agent Account Isolation ─────────────────────────

  describe("Property 15: Multi-Agent Account Isolation", () => {
    it("different agents have separate profiles that don't interfere", async () => {
      const agent1 = Keypair.generate();
      const agent2 = Keypair.generate();
      await airdrop(agent1.publicKey, 5);
      await airdrop(agent2.publicKey, 5);

      const [profile1PDA] = deriveProfilePDA(agent1.publicKey);
      const [profile2PDA] = deriveProfilePDA(agent2.publicKey);

      // Init both profiles
      await program.methods
        .initializeAgentProfile()
        .accounts({
          agentProfile: profile1PDA,
          agent: agent1.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .initializeAgentProfile()
        .accounts({
          agentProfile: profile2PDA,
          agent: agent2.publicKey,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Setup policy + submit tx for agent1 only
      const receiver = Keypair.generate();
      const [policy1PDA] = derivePolicyPDA(agent1.publicKey);

      await program.methods
        .setPolicy(
          new anchor.BN(LAMPORTS_PER_SOL),
          receiver.publicKey,
          new anchor.BN(40),
          false
        )
        .accounts({
          agentPolicy: policy1PDA,
          owner: agent1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent1])
        .rpc();

      await program.methods
        .submitTransaction(new anchor.BN(10_000))
        .accounts({
          agentProfile: profile1PDA,
          agentPolicy: policy1PDA,
          agent: agent1.publicKey,
          receiver: receiver.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent1])
        .rpc();

      // Verify agent1 was updated
      const profile1 = await program.account.agentProfile.fetch(profile1PDA);
      expect(profile1.reputationScore.toNumber()).to.equal(60);
      expect(profile1.totalTransactions.toNumber()).to.equal(1);

      // Verify agent2 was NOT affected
      const profile2 = await program.account.agentProfile.fetch(profile2PDA);
      expect(profile2.reputationScore.toNumber()).to.equal(50);
      expect(profile2.totalTransactions.toNumber()).to.equal(0);
      expect(profile2.successfulTransactions.toNumber()).to.equal(0);
    });
  });
});
