'use client';

/**
 * PolicyForm — controlled form for setting AgentPolicy fields.
 *
 * Requirements: 11.1, 11.2, 11.3, 15.2, 15.3
 */

import { useState } from 'react';
import { useAgentStore } from '@/store/agentStore';

interface PolicyFormProps {
  walletConnected: boolean;
}

export function PolicyForm({ walletConnected }: PolicyFormProps) {
  const { selectedAgentPubkey, policy, setPolicy } = useAgentStore();

  const [maxAmount, setMaxAmount] = useState(
    policy?.maxAmount?.toString() || '1000000000'
  );
  const [allowedReceiver, setAllowedReceiver] = useState(
    policy?.allowedReceiver || 'GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK'
  );
  const [minReputation, setMinReputation] = useState(
    policy?.minReputation?.toString() || '40'
  );
  const [privateMode, setPrivateMode] = useState(
    policy?.privateMode || false
  );
  const [highValueThreshold, setHighValueThreshold] = useState(
    policy?.highValueThreshold?.toString() || '0'
  );
  const [highValueMinReputation, setHighValueMinReputation] = useState(
    policy?.highValueMinReputation?.toString() || '0'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletConnected || !selectedAgentPubkey) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      // In demo mode, update the local store
      // In production, this would invoke set_policy via wallet-adapter
      const newPolicy = {
        owner: selectedAgentPubkey,
        maxAmount: parseInt(maxAmount),
        allowedReceiver,
        minReputation: parseInt(minReputation),
        privateMode,
        highValueThreshold: parseInt(highValueThreshold),
        highValueMinReputation: parseInt(highValueMinReputation),
      };

      setPolicy(newPolicy);
      setStatusMessage({
        type: 'success',
        text: 'Policy updated successfully!',
      });

      // Clear after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Failed to update policy. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card animate-entrance delay-2">
      <h2 className="text-lg font-semibold mb-5">Policy Configuration</h2>

      {!walletConnected && (
        <div className="absolute inset-0 bg-void/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-text-secondary text-sm font-medium">
              Connect Wallet to Configure
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Max Amount */}
        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">
            Max Amount (lamports)
          </label>
          <input
            type="number"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="sentinel-input"
            disabled={!walletConnected}
            placeholder="1000000000"
            id="policy-max-amount"
          />
        </div>

        {/* Allowed Receiver */}
        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">
            Allowed Receiver
          </label>
          <input
            type="text"
            value={allowedReceiver}
            onChange={(e) => setAllowedReceiver(e.target.value)}
            className="sentinel-input"
            disabled={!walletConnected}
            placeholder="Solana public key..."
            id="policy-allowed-receiver"
          />
        </div>

        {/* Min Reputation */}
        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-1.5">
            Min Reputation
          </label>
          <input
            type="number"
            value={minReputation}
            onChange={(e) => setMinReputation(e.target.value)}
            className="sentinel-input"
            disabled={!walletConnected}
            min={0}
            max={100}
            placeholder="40"
            id="policy-min-reputation"
          />
        </div>

        {/* Private Mode Toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider">
              Private Mode (PER)
            </label>
            <p className="text-[11px] text-text-muted mt-0.5">
              Hide transaction details in logs & feed
            </p>
          </div>
          <button
            type="button"
            onClick={() => walletConnected && setPrivateMode(!privateMode)}
            className={`toggle-track ${privateMode ? 'active' : ''}`}
            disabled={!walletConnected}
            id="policy-private-toggle"
            aria-label="Toggle private mode"
          >
            <div className="toggle-thumb" />
          </button>
        </div>

        {/* Tiered Policy Settings */}
        <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
              High Value Threshold
            </label>
            <input
              type="number"
              value={highValueThreshold}
              onChange={(e) => setHighValueThreshold(e.target.value)}
              className="sentinel-input text-xs py-2"
              disabled={!walletConnected}
              placeholder="0 (disabled)"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
              Required Reputation
            </label>
            <input
              type="number"
              value={highValueMinReputation}
              onChange={(e) => setHighValueMinReputation(e.target.value)}
              className="sentinel-input text-xs py-2"
              disabled={!walletConnected}
              min={0}
              max={100}
              placeholder="0"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary w-full mt-2"
          disabled={!walletConnected || isSubmitting}
          id="policy-submit"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner" /> Updating...
            </span>
          ) : (
            'Update Policy'
          )}
        </button>
      </form>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm ${
            statusMessage.type === 'success'
              ? 'bg-trusted-glow text-trusted'
              : 'bg-blocked-glow text-blocked'
          }`}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}
