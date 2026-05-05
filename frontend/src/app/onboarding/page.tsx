'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function OnboardingPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [step, setStep] = useState(0); // 0: Auth, 1: Loading sequence, 2: Access Granted
  const [passphrase, setPassphrase] = useState('');
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const gold = '#D4A017';
  const red = '#FF4466';
  const darkBg = '#050505';
  const cardBorder = '#222';
  const textDim = '#666';

  const terminalSteps = [
    'INITIALIZING SECURE ENCLAVE...',
    'CONNECTING TO SOLANA MAINNET NODES...',
    'FETCHING NEURAL THREAT MAP DATA...',
    'SYNCHRONIZING ON-CHAIN POLICY STATE...',
    'VERIFYING AGENT SIGNATURES...',
    'ESTABLISHING ENCRYPTED AUDIT CHANNEL...',
    'ACCESS GRANTED. WELCOME, SENTINEL.'
  ];

  const startSequence = useCallback(() => {
    if (!connected) {
      setLoadingLogs(['[ ERR ] WALLET NOT DETECTED. PLEASE CONNECT TO PROCEED.']);
      return;
    }
    setStep(1);
    let i = 0;
    const interval = setInterval(() => {
      if (i < terminalSteps.length) {
        setLoadingLogs(prev => [...prev, `[ OK ] ${terminalSteps[i]}`]);
        setProgress(((i + 1) / terminalSteps.length) * 100);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setStep(2);
          setTimeout(() => router.push('/dashboard'), 1000);
        }, 800);
      }
    }, 400);
  }, [connected, router, terminalSteps]);

  return (
    <div style={{ background: darkBg, color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", overflow: 'hidden' }}>
      
      {/* Background Grid */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(212,160,23,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      
      <div style={{ position: 'relative', width: '100%', maxWidth: 500, padding: 40, background: 'rgba(10,10,10,0.8)', border: `1px solid ${cardBorder}`, borderRadius: 16, backdropFilter: 'blur(20px)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: gold, marginBottom: 16 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2l8 4v6c0 5.25-3.5 10-8 12C7.5 22 4 17.25 4 12V6l8-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: 4, margin: 0 }}>SENTINEL ACCESS</h1>
          </div>
          <div style={{ fontSize: 10, color: textDim, letterSpacing: 2 }}>LEVEL 4 CLEARANCE REQUIRED</div>
        </div>

        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ fontSize: 10, color: textDim, letterSpacing: 1, marginBottom: 8, display: 'block' }}>IDENTIFICATION METHOD</label>
              <div className="wallet-onboarding" style={{ display: 'flex', justifyContent: 'center' }}>
                 <WalletMultiButton style={{ width: '100%', background: '#1a1a1a', border: `1px solid ${cardBorder}`, borderRadius: 8, height: 48, fontSize: 13 }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 10, color: textDim, letterSpacing: 1, marginBottom: 8, display: 'block' }}>ACCESS PASSPHRASE</label>
              <input 
                type="password" 
                placeholder="••••••••••••" 
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                style={{ width: '100%', background: '#1a1a1a', border: `1px solid ${cardBorder}`, borderRadius: 8, padding: '12px 16px', color: '#fff', fontSize: 13, outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = gold}
                onBlur={(e) => e.target.style.borderColor = cardBorder}
              />
            </div>

            <button 
              onClick={startSequence}
              disabled={!connected}
              style={{ width: '100%', background: connected ? gold : '#333', color: connected ? '#000' : '#666', border: 'none', borderRadius: 8, padding: 16, fontSize: 13, fontWeight: 700, letterSpacing: 2, cursor: connected ? 'pointer' : 'not-allowed', transition: 'all 0.2s', marginTop: 8 }}
            >
              INITIALIZE CONNECTION
            </button>
            
            {!connected && (
              <div style={{ fontSize: 10, color: red, textAlign: 'center' }}>[ WARNING ] WALLET NOT LINKED. SECURE ACCESS BLOCKED.</div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ height: 200, background: '#000', borderRadius: 8, padding: 16, fontSize: 11, color: gold, overflowY: 'auto', marginBottom: 20, border: '1px solid #1a1a1a' }}>
              {loadingLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: 4 }}>{log}</div>
              ))}
            </div>
            <div style={{ width: '100%', height: 4, background: '#111', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: gold, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 10, color: textDim, marginTop: 12, textAlign: 'center', letterSpacing: 1 }}>BOOTING SECURE TERMINAL... {Math.round(progress)}%</div>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>🛡️</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: gold, letterSpacing: 2, margin: '0 0 8px' }}>ACCESS GRANTED</h2>
            <p style={{ fontSize: 12, color: textDim }}>REDIRECTING TO COMMAND CENTER</p>
          </div>
        )}

      </div>

      {/* Decorative corners */}
      <div style={{ position: 'fixed', top: 40, left: 40, width: 20, height: 20, borderTop: `2px solid ${gold}`, borderLeft: `2px solid ${gold}`, opacity: 0.3 }} />
      <div style={{ position: 'fixed', top: 40, right: 40, width: 20, height: 20, borderTop: `2px solid ${gold}`, borderRight: `2px solid ${gold}`, opacity: 0.3 }} />
      <div style={{ position: 'fixed', bottom: 40, left: 40, width: 20, height: 20, borderBottom: `2px solid ${gold}`, borderLeft: `2px solid ${gold}`, opacity: 0.3 }} />
      <div style={{ position: 'fixed', bottom: 40, right: 40, width: 20, height: 20, borderBottom: `2px solid ${gold}`, borderRight: `2px solid ${gold}`, opacity: 0.3 }} />
    </div>
  );
}
