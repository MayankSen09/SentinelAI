'use client';

/**
 * SentinelAI Dashboard — Main page (/).
 *
 * Assembles all components:
 *  - Header: Logo + AgentSelector + WalletButton
 *  - Grid: AgentStatus | PolicyForm
 *           SimPanel   | ActivityFeed
 *
 * Requirements: 10, 11, 12, 13, 14, 15
 */

import { useEffect } from 'react';
import { AgentSelector } from '@/components/AgentSelector';
import { AgentStatus } from '@/components/AgentStatus';
import { PolicyForm } from '@/components/PolicyForm';
import { SimulationPanel } from '@/components/SimulationPanel';
import { ActivityFeed } from '@/components/ActivityFeed';
import { WalletButton } from '@/components/WalletButton';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { AuditTrail } from '@/components/AuditTrail';
import { useAgentStore } from '@/store/agentStore';
import { useWallet } from '@solana/wallet-adapter-react';

function DashboardContent() {
  const { selectedAgentPubkey, addAgent, setSelectedAgent, agentList } =
    useAgentStore();

  // Auto-register a demo agent on first load
  useEffect(() => {
    if (agentList.length === 0) {
      const demoAgent = 'GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK';
      addAgent(demoAgent);
      setSelectedAgent(demoAgent);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { connected } = useWallet();
  const walletConnected = connected;

  return (
    <div className="min-h-screen relative z-10">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <header className="border-b border-border/50 bg-void/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-lg">🛡️</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Sentinel<span className="text-accent">AI</span>
              </h1>
              <p className="text-[10px] text-text-muted uppercase tracking-widest">
                Execution Control Layer
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center lg:justify-end gap-3">
            <ConnectionStatus />
            <AgentSelector />
          </div>

          <WalletButton />
        </div>
      </header>

      {/* ─── Dashboard Grid ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top row */}
          <AgentStatus />
          <PolicyForm walletConnected={walletConnected} />

          {/* Bottom row */}
          <SimulationPanel />
          <ActivityFeed maxEntries={20} />

          {/* Bottom full width */}
          <div className="col-span-1 lg:col-span-2">
            <AuditTrail />
          </div>
        </div>

        {/* ─── Footer ──────────────────────────────────────────────── */}
        <footer className="mt-12 pb-8 text-center">
          <p className="text-xs text-text-muted">
            SentinelAI — Colosseum Frontier Hackathon 2026
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
              Main Colosseum
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-private-glow text-private border border-private/20">
              MagicBlock Privacy
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-x402-glow text-x402 border border-x402/20">
              x402 Payments
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
              100xDevs
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
