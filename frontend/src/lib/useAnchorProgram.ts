'use client';

/**
 * useAnchorProgram — Hook to get the SentinelAI Anchor program instance.
 *
 * Provides typed access to the on-chain SentinelAI program via the Anchor IDL.
 * Connects through the user's wallet adapter for signing transactions.
 */

import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
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

/**
 * Returns the AnchorProvider configured with the current wallet and connection.
 * Returns null if wallet is not connected.
 */
export function useAnchorProvider(): AnchorProvider | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
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
  }, [connection, wallet]);
}

/**
 * Returns a typed Program instance for the SentinelAI contract.
 * Returns null if the wallet is not connected.
 */
export function useProgram(): Program | null {
  const provider = useAnchorProvider();

  return useMemo(() => {
    if (!provider) return null;
    return new Program(idl as Idl, provider);
  }, [provider]);
}

/**
 * Derive the AgentProfile PDA for a given agent public key.
 */
export function deriveAgentProfilePDA(agentPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent_profile'), agentPubkey.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive the AgentPolicy PDA for a given owner public key.
 */
export function deriveAgentPolicyPDA(ownerPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent_policy'), ownerPubkey.toBuffer()],
    PROGRAM_ID
  );
}
