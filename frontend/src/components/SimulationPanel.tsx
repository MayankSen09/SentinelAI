'use client';

/**
 * SimulationPanel — 5 buttons to trigger pre-configured test scenarios.
 *
 * Requirements: 13.1, 13.2, 13.3
 * Property 20: Simulation Panel Backend Calls
 */

import { useState } from 'react';
import { useAgentStore } from '@/store/agentStore';
import { BACKEND_URL, SIMULATION_PRESETS } from '@/lib/constants';

interface SimResult {
  status: 'approved' | 'rejected';
  reason: string;
}

export function SimulationPanel() {
  const { selectedAgentPubkey } = useAgentStore();
  const [results, setResults] = useState<Record<string, SimResult | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const runSimulation = async (key: string) => {
    if (!selectedAgentPubkey) return;

    const preset =
      SIMULATION_PRESETS[key as keyof typeof SIMULATION_PRESETS];
    if (!preset) return;

    setLoading((prev) => ({ ...prev, [key]: true }));
    setResults((prev) => ({ ...prev, [key]: null }));

    try {
      const res = await fetch(`${BACKEND_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_pubkey: selectedAgentPubkey,
          amount: preset.amount,
          receiver: preset.receiver,
          payment_type: preset.payment_type,
        }),
      });

      const data: SimResult = await res.json();
      setResults((prev) => ({ ...prev, [key]: data }));
    } catch {
      setResults((prev) => ({
        ...prev,
        [key]: {
          status: 'rejected',
          reason: 'Backend unavailable',
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const runX402HttpFlow = async () => {
    if (!selectedAgentPubkey) return;
    const key = 'x402_http';
    setLoading((prev) => ({ ...prev, [key]: true }));
    setResults((prev) => ({ ...prev, [key]: null }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/resource/weather-data`);
      if (res.status === 402) {
        const challenge = await res.json();
        
        // Mocking the payment execution via /execute
        const payRes = await fetch(`${BACKEND_URL}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_pubkey: selectedAgentPubkey,
            amount: challenge.payment_request.amount,
            receiver: challenge.payment_request.receiver,
            payment_type: 'x402',
          }),
        });
        const payData = await payRes.json();
        if (payData.status === 'approved') {
          const finalRes = await fetch(`${BACKEND_URL}/api/resource/weather-data`, {
            headers: { 'x-payment-signature': payData.txSignature || 'mock_sig_123' }
          });
          const finalData = await finalRes.json();
          setResults((prev) => ({
            ...prev,
            [key]: { status: 'approved', reason: `402 Challenge completed. Data unlocked: "${finalData.data}"` },
          }));
        } else {
          setResults((prev) => ({
            ...prev,
            [key]: { status: 'rejected', reason: `Payment failed during challenge: ${payData.reason}` },
          }));
        }
      } else {
        setResults((prev) => ({
          ...prev,
          [key]: { status: 'rejected', reason: 'Expected 402 but got ' + res.status },
        }));
      }
    } catch {
      setResults((prev) => ({
        ...prev,
        [key]: { status: 'rejected', reason: 'HTTP 402 Flow Failed' },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const simEntries = Object.entries(SIMULATION_PRESETS);

  return (
    <div className="glass-card animate-entrance delay-3">
      <h2 className="text-lg font-semibold mb-4">Simulation Panel</h2>

      {!selectedAgentPubkey ? (
        <p className="text-text-muted text-sm py-4 text-center">
          Select an agent to run simulations.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
          {simEntries.map(([key, preset]) => {
            const variantClass =
              preset.variant === 'valid'
                ? 'sim-btn-valid'
                : preset.variant === 'invalid'
                ? 'sim-btn-invalid'
                : preset.variant === 'risky'
                ? 'sim-btn-risky'
                : 'sim-btn-x402';

            return (
              <div key={key}>
                <button
                  onClick={() => runSimulation(key)}
                  disabled={loading[key]}
                  className={`sim-btn ${variantClass} w-full`}
                  id={`sim-${key}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-text-primary">
                        {preset.label}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        {preset.description}
                      </div>
                    </div>
                    {loading[key] && <span className="spinner" />}
                  </div>
                </button>

                {/* Inline result */}
                {results[key] && (
                  <div
                    className={`mt-2 p-3 rounded-lg text-xs animate-entrance ${
                      results[key]!.status === 'approved'
                        ? 'bg-trusted-glow/30 border border-trusted/20'
                        : 'bg-blocked-glow/30 border border-blocked/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`status-dot ${
                          results[key]!.status === 'approved'
                            ? 'status-dot-approved'
                            : 'status-dot-rejected'
                        }`}
                      />
                      <span
                        className={`font-semibold uppercase ${
                          results[key]!.status === 'approved'
                            ? 'text-trusted'
                            : 'text-blocked'
                        }`}
                      >
                        {results[key]!.status}
                      </span>
                    </div>
                    <p className="text-text-secondary leading-relaxed">
                      {results[key]!.reason}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedAgentPubkey && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <button
            onClick={runX402HttpFlow}
            disabled={loading['x402_http']}
            className={`sim-btn sim-btn-x402 w-full`}
            id={`sim-x402-http`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-text-primary">
                  HTTP 402 Resource Purchase
                </div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  Full 402 → Sign Transaction → 200 Flow Simulation
                </div>
              </div>
              {loading['x402_http'] && <span className="spinner" />}
            </div>
          </button>

          {/* Inline result for 402 Flow */}
          {results['x402_http'] && (
            <div
              className={`mt-2 p-3 rounded-lg text-xs animate-entrance ${
                results['x402_http']!.status === 'approved'
                  ? 'bg-trusted-glow/30 border border-trusted/20'
                  : 'bg-blocked-glow/30 border border-blocked/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`status-dot ${
                    results['x402_http']!.status === 'approved'
                      ? 'status-dot-approved'
                      : 'status-dot-rejected'
                  }`}
                />
                <span
                  className={`font-semibold uppercase ${
                    results['x402_http']!.status === 'approved'
                      ? 'text-trusted'
                      : 'text-blocked'
                  }`}
                >
                  {results['x402_http']!.status}
                </span>
              </div>
              <p className="text-text-secondary leading-relaxed">
                {results['x402_http']!.reason}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
