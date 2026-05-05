'use client';

/**
 * useSentinelProgram — Hook for interacting with the SentinelAI on-chain program.
 *
 * Provides typed methods for all 4 instructions:
 * - initializeAgentProfile
 * - setPolicy
 * - submitTransaction
 * - unfreezeAgent
 *
 * Plus read methods:
 * - fetchAgentProfile
 * - fetchAgentPolicy
 */

import { useCallback, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import idl from '@/lib/sentinel_ai_idl.json';

export const PROGRAM_ID = (() => {
  try {
    const envVal = process.env.NEXT_PUBLIC_PROGRAM_ID?.trim();
    if (envVal) {
      return new PublicKey(envVal);
    }
  } catch (err) {
    console.warn("Invalid NEXT_PUBLIC_PROGRAM_ID, falling back to default.");
  }
  return new PublicKey('4ytqEfZTGXUiDo1HXciUFDeTVqGT5AabLLFpTMysJLbH');
})();

/* ─── PDA derivation helpers ──────────────────────────────────────────── */

export function deriveAgentProfilePDA(agentPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent_profile'), agentPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveAgentPolicyPDA(ownerPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent_policy'), ownerPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/* ─── Types matching on-chain accounts ────────────────────────────────── */

export interface OnChainAgentProfile {
  agentPubkey: PublicKey;
  owner: PublicKey;
  reputationScore: BN;
  totalTransactions: BN;
  successfulTransactions: BN;
  bump: number;
  consecutiveFailures: number;
  frozen: boolean;
  lastTransactionSlot: BN;
}

export interface OnChainAgentPolicy {
  owner: PublicKey;
  maxAmount: BN;
  allowedReceiver: PublicKey;
  minReputation: BN;
  privateMode: boolean;
  bump: number;
  highValueThreshold: BN;
  highValueMinReputation: BN;
}

/* ─── Main hook ───────────────────────────────────────────────────────── */

export function useSentinelProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Build provider and program
  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null;
    }
    return new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      },
      { commitment: 'confirmed' }
    );
  }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idl as Idl, provider);
  }, [provider]);

  /* ─── Read: Fetch Agent Profile ─────────────────────────────────────── */
  const fetchAgentProfile = useCallback(async (agentPubkey: PublicKey): Promise<OnChainAgentProfile | null> => {
    try {
      const [profilePDA] = deriveAgentProfilePDA(agentPubkey);
      const accountInfo = await connection.getAccountInfo(profilePDA);
      if (!accountInfo) return null;

      // Use program to decode if available, otherwise use raw connection
      if (program) {
        const account = await (program.account as any).agentProfile.fetch(profilePDA);
        return account as OnChainAgentProfile;
      }
      return null;
    } catch {
      return null;
    }
  }, [connection, program]);

  /* ─── Read: Fetch Agent Policy ──────────────────────────────────────── */
  const fetchAgentPolicy = useCallback(async (ownerPubkey: PublicKey): Promise<OnChainAgentPolicy | null> => {
    try {
      const [policyPDA] = deriveAgentPolicyPDA(ownerPubkey);
      const accountInfo = await connection.getAccountInfo(policyPDA);
      if (!accountInfo) return null;

      if (program) {
        const account = await (program.account as any).agentPolicy.fetch(policyPDA);
        return account as OnChainAgentPolicy;
      }
      return null;
    } catch {
      return null;
    }
  }, [connection, program]);

  /* ─── Write: Initialize Agent Profile ───────────────────────────────── */
  const initializeAgentProfile = useCallback(async (agentPubkey: PublicKey): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');

    const [profilePDA] = deriveAgentProfilePDA(agentPubkey);

    const tx = await (program.methods as any)
      .initializeAgentProfile()
      .accounts({
        agentProfile: profilePDA,
        agent: agentPubkey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }, [program, wallet.publicKey]);

  /* ─── Write: Set Policy ─────────────────────────────────────────────── */
  const setPolicy = useCallback(async (params: {
    maxAmount: number;
    allowedReceiver: string;
    minReputation: number;
    privateMode: boolean;
    highValueThreshold: number;
    highValueMinReputation: number;
  }): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');

    const [policyPDA] = deriveAgentPolicyPDA(wallet.publicKey);
    const receiverPubkey = new PublicKey(params.allowedReceiver);

    const tx = await (program.methods as any)
      .setPolicy(
        new BN(params.maxAmount),
        receiverPubkey,
        new BN(params.minReputation),
        params.privateMode,
        new BN(params.highValueThreshold),
        new BN(params.highValueMinReputation),
      )
      .accounts({
        agentPolicy: policyPDA,
        owner: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }, [program, wallet.publicKey]);

  /* ─── Write: Submit Transaction ─────────────────────────────────────── */
  const submitTransaction = useCallback(async (params: {
    amount: number;
    receiverPubkey: string;
  }): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');

    const agentPubkey = wallet.publicKey;
    const [profilePDA] = deriveAgentProfilePDA(agentPubkey);
    const [policyPDA] = deriveAgentPolicyPDA(agentPubkey);
    const receiver = new PublicKey(params.receiverPubkey);

    const tx = await (program.methods as any)
      .submitTransaction(new BN(params.amount))
      .accounts({
        agentProfile: profilePDA,
        agentPolicy: policyPDA,
        agent: agentPubkey,
        receiver: receiver,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }, [program, wallet.publicKey]);

  /* ─── Write: Unfreeze Agent ─────────────────────────────────────────── */
  const unfreezeAgent = useCallback(async (agentPubkey: PublicKey): Promise<string> => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');

    const [profilePDA] = deriveAgentProfilePDA(agentPubkey);

    const tx = await (program.methods as any)
      .unfreezeAgent()
      .accounts({
        agentProfile: profilePDA,
        agent: agentPubkey,
        owner: wallet.publicKey,
      })
      .rpc();

    return tx;
  }, [program, wallet.publicKey]);

  return {
    program,
    provider,
    connected: wallet.connected,
    publicKey: wallet.publicKey,
    // Read
    fetchAgentProfile,
    fetchAgentPolicy,
    // Write
    initializeAgentProfile,
    setPolicy,
    submitTransaction,
    unfreezeAgent,
    // Helpers
    deriveAgentProfilePDA,
    deriveAgentPolicyPDA,
  };
}
