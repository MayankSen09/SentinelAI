'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletButton } from '@/components/WalletButton';
import { useAgentStore } from '@/store/agentStore';
import { useSentinelProgram } from '@/lib/useSentinelProgram';

/* ─── Style tokens ──────────────────────────────────────────────────────── */
const gold = '#D4A017';
const darkBg = '#0d0d0d';
const cardBg = '#161616';
const cardBorder = '#2a2a2a';
const textDim = '#888';
const inputBg = '#1a1a1a';
const green = '#00ff88';
const red = '#ff4466';
const mono = "'JetBrains Mono', 'Fira Code', monospace";
const sans = "'Inter', sans-serif";

/* ─── Donut Chart ───────────────────────────────────────────────────────── */
function DonutChart({ percentage }: { percentage: number }) {
  const c = 2 * Math.PI * 40;
  const off = c - (percentage / 100) * c;
  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" width="140" height="140" style={{ display: 'block' }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#2a2a3e" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={gold} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform="rotate(-90 50 50)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: gold }}>{percentage}%</span>
        <span style={{ fontSize: 9, color: gold, letterSpacing: 1.5, textTransform: 'uppercase' }}>APPROVED</span>
      </div>
    </div>
  );
}

/* ─── Reusable styles ───────────────────────────────────────────────────── */
const cardStyle: React.CSSProperties = { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: 24 };
const inputStyle: React.CSSProperties = { background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, fontFamily: mono, outline: 'none', width: '100%', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: textDim, textTransform: 'uppercase', letterSpacing: 0.5 };
const sectionTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, letterSpacing: 1.5, color: '#fff', margin: '0 0 20px' };

/* ─── Sidebar config ────────────────────────────────────────────────────── */
const sidebarItems = [
  { label: 'SECURITY HUB', d: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z', fill: true },
  { label: 'SHIELD POLICIES', d: 'M12 2l8 4v6c0 5.25-3.5 10-8 12C7.5 22 4 17.25 4 12V6l8-4z', fill: false },
  { label: 'TX TESTER', d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', fill: false },
  { label: 'AUDIT LOGS', d: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM9 8h6M9 12h6M9 16h3', fill: false },
  { label: 'SYSTEM CONFIG', d: 'M12 15a3 3 0 100-6 3 3 0 000 6z', fill: false },
];

export default function DashboardPage() {
  const { addAgent, setSelectedAgent, agentList } = useAgentStore();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const sentinel = useSentinelProgram();
  const [airdropping, setAirdropping] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState('Overview');
  const [activeSidebar, setActiveSidebar] = useState('SECURITY HUB');
  const [maxAmount, setMaxAmount] = useState('500');
  const [minReputation, setMinReputation] = useState('85');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [testAmount, setTestAmount] = useState('0.0001');
  const [testReceiver, setTestReceiver] = useState('GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK');
  const [simResult, setSimResult] = useState<{ success: boolean; message: string; fee: string } | null>(null);
  const [policyStatus, setPolicyStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [testingTx, setTestingTx] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [onChainRep, setOnChainRep] = useState<number | null>(null);
  const [onChainFrozen, setOnChainFrozen] = useState(false);
  const [onChainTotalTx, setOnChainTotalTx] = useState<number | null>(null);
  const [onChainSuccessTx, setOnChainSuccessTx] = useState<number | null>(null);
  const [auditLogs, setAuditLogs] = useState([
    { time: '—', event: 'Waiting for wallet connection', status: 'Pending', detail: 'Connect wallet to interact' },
  ]);

  useEffect(() => {
    if (agentList.length === 0) {
      const demo = 'GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK';
      addAgent(demo);
      setSelectedAgent(demo);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch on-chain profile + balance when wallet connects
  useEffect(() => {
    if (!connected || !publicKey) return;
    connection.getBalance(publicKey).then(b => setWalletBalance(b / LAMPORTS_PER_SOL)).catch(() => {});
    if (!sentinel.program) return;
    (async () => {
      try {
        const profile = await sentinel.fetchAgentProfile(publicKey);
        if (profile) {
          setOnChainRep(Number(profile.reputationScore));
          setOnChainFrozen(profile.frozen);
          setOnChainTotalTx(Number(profile.totalTransactions));
          setOnChainSuccessTx(Number(profile.successfulTransactions));
        }
      } catch { /* profile may not exist yet */ }
    })();
  }, [connected, publicKey, sentinel.program]); // eslint-disable-line react-hooks/exhaustive-deps

  const addLog = useCallback((event: string, status: string, detail: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    setAuditLogs(prev => [{ time, event, status, detail }, ...prev].slice(0, 20));
  }, []);

  // ─── Devnet Airdrop
  const handleAirdrop = useCallback(async () => {
    if (!publicKey) { alert('Connect your wallet first'); return; }
    setAirdropping(true);
    try {
      const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      const bal = await connection.getBalance(publicKey);
      setWalletBalance(bal / LAMPORTS_PER_SOL);
      addLog('Devnet Airdrop', 'Approved', '+1 SOL received');
    } catch (err: any) {
      addLog('Devnet Airdrop', 'Blocked', err?.message?.slice(0, 50) || 'Airdrop failed');
    } finally { setAirdropping(false); }
  }, [publicKey, connection, addLog]);

  // ─── Initiate Scan = Initialize Agent Profile on-chain
  const handleInitScan = useCallback(async () => {
    if (!connected || !publicKey) { alert('Connect your wallet first'); return; }
    setScanning(true);
    try {
      const tx = await sentinel.initializeAgentProfile(publicKey);
      addLog('Agent Initialized', 'Approved', `TX: ${tx.slice(0, 8)}...`);
      // Refresh profile
      const profile = await sentinel.fetchAgentProfile(publicKey);
      if (profile) {
        setOnChainRep(Number(profile.reputationScore));
        setOnChainFrozen(profile.frozen);
      }
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      if (msg.includes('already in use')) {
        addLog('Agent Init', 'Active', 'Profile already exists');
      } else {
        addLog('Agent Init', 'Blocked', msg.slice(0, 60));
      }
    } finally { setScanning(false); }
  }, [connected, publicKey, sentinel, addLog]);

  // ─── Save Policy on-chain
  const handleSavePolicy = useCallback(async () => {
    if (!connected || !publicKey) { alert('Connect your wallet first'); return; }
    setSavingPolicy(true);
    setPolicyStatus(null);
    try {
      const receiver = receiverAddress || 'GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK';
      // Validate pubkey
      try { new PublicKey(receiver); } catch { setPolicyStatus({ type: 'error', text: 'Invalid receiver address' }); setSavingPolicy(false); return; }
      const lamports = Math.floor(parseFloat(maxAmount) * 1e9); // SOL to lamports
      const tx = await sentinel.setPolicy({
        maxAmount: lamports,
        allowedReceiver: receiver,
        minReputation: parseInt(minReputation) || 0,
        privateMode: false,
        highValueThreshold: 0,
        highValueMinReputation: 0,
      });
      setPolicyStatus({ type: 'success', text: `Policy saved! TX: ${tx.slice(0, 12)}...` });
      addLog('Policy Update', 'Applied', `Max: ${maxAmount} SOL, MinRep: ${minReputation}`);
      setTimeout(() => setPolicyStatus(null), 5000);
    } catch (err: any) {
      setPolicyStatus({ type: 'error', text: err?.message?.slice(0, 80) || 'Failed to save policy' });
      addLog('Policy Update', 'Blocked', err?.message?.slice(0, 40) || 'Error');
    } finally { setSavingPolicy(false); }
  }, [connected, publicKey, sentinel, maxAmount, minReputation, receiverAddress, addLog]);

  // ─── Test Transaction on-chain
  const handleTest = useCallback(async () => {
    if (!connected || !publicKey) { alert('Connect your wallet first'); return; }
    setTestingTx(true);
    setSimResult(null);
    try {
      // Validate receiver
      let recv = testReceiver;
      try { new PublicKey(recv); } catch { setSimResult({ success: false, message: 'Invalid receiver address', fee: '—' }); setTestingTx(false); return; }
      const lamports = Math.floor(parseFloat(testAmount) * 1e9);
      const tx = await sentinel.submitTransaction({ amount: lamports, receiverPubkey: recv });
      setSimResult({ success: true, message: `TX approved! Sig: ${tx.slice(0, 16)}...`, fee: '~0.00005 SOL' });
      addLog('Transaction Scan', 'Approved', `${testAmount} SOL → ${recv.slice(0,8)}...`);
      // Refresh profile
      const profile = await sentinel.fetchAgentProfile(publicKey);
      if (profile) {
        setOnChainRep(Number(profile.reputationScore));
        setOnChainTotalTx(Number(profile.totalTransactions));
        setOnChainSuccessTx(Number(profile.successfulTransactions));
        setOnChainFrozen(profile.frozen);
      }
    } catch (err: any) {
      const msg = err?.message || 'Transaction rejected';
      setSimResult({ success: false, message: msg.slice(0, 100), fee: '—' });
      addLog('Transaction Scan', 'Blocked', msg.slice(0, 50));
    } finally { setTestingTx(false); }
  }, [connected, publicKey, sentinel, testAmount, testReceiver, addLog]);

  return (
    <div style={{ background: darkBg, color: '#fff', minHeight: '100vh', fontFamily: sans }}>

      {/* ═══ TOP NAV ══════════════════════════════════════════════════════ */}
      <nav style={{ background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${cardBorder}`, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56 }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, color: gold }}>SENTINEL AI</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Overview', 'Governance', 'Developer'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ background: 'none', border: 'none', color: activeTab === tab ? gold : textDim, fontSize: 13, padding: '8px 16px', cursor: 'pointer', position: 'relative', borderBottom: activeTab === tab ? `2px solid ${gold}` : '2px solid transparent', marginBottom: -1 }}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, padding: '6px 14px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textDim} strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input type="text" placeholder="Search protocol..." style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, width: 140 }} />
            </div>
            <button style={{ background: 'none', border: 'none', color: textDim, cursor: 'pointer', padding: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
            </button>
            <button style={{ background: 'none', border: 'none', color: textDim, cursor: 'pointer', padding: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            </button>
            <WalletButton />
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>

        {/* ═══ SIDEBAR ════════════════════════════════════════════════════ */}
        <aside style={{ width: 220, background: darkBg, borderRight: `1px solid ${cardBorder}`, display: 'flex', flexDirection: 'column', padding: '20px 12px', flexShrink: 0 }}>
          {/* Protocol badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: 12, marginBottom: 24 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="1.5"><path d="M12 2l8 4v6c0 5.25-3.5 10-8 12C7.5 22 4 17.25 4 12V6l8-4z" /></svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: gold, letterSpacing: 1 }}>SENTINEL</div>
              <div style={{ fontSize: 10, color: textDim }}>Protocol V4.0.2</div>
            </div>
          </div>
          {/* Nav items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {sidebarItems.map((item) => (
              <button key={item.label} onClick={() => setActiveSidebar(item.label)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: activeSidebar === item.label ? 'rgba(212,160,23,0.08)' : 'none', border: 'none', color: activeSidebar === item.label ? gold : textDim, fontSize: 12, letterSpacing: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={item.fill ? 'currentColor' : 'none'} stroke={item.fill ? 'none' : 'currentColor'} strokeWidth="1.5"><path d={item.d} /></svg>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
            {walletBalance !== null && (
              <div style={{ textAlign: 'center', fontSize: 11, color: textDim, padding: '4px 0' }}>Balance: <span style={{ color: gold, fontWeight: 600 }}>{walletBalance.toFixed(4)} SOL</span> (devnet)</div>
            )}
            <button onClick={handleAirdrop} disabled={airdropping || !connected} style={{ background: 'transparent', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: (airdropping || !connected) ? 0.5 : 1 }}>{airdropping ? 'Airdropping...' : '💧 Airdrop 1 SOL (devnet)'}</button>
            <button onClick={handleInitScan} disabled={scanning} style={{ background: gold, color: '#000', border: 'none', borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: scanning ? 0.6 : 1 }}>{scanning ? 'Scanning...' : 'Initiate Scan'}</button>
            <button onClick={() => { if (onChainFrozen && publicKey) { sentinel.unfreezeAgent(publicKey).then(() => { setOnChainFrozen(false); addLog('Unfreeze', 'Approved', 'Agent unfrozen'); }).catch(() => {}); }}} style={{ background: 'transparent', color: red, border: `1px solid rgba(255,68,102,0.3)`, borderRadius: 8, padding: 12, fontSize: 12, fontWeight: 600, letterSpacing: 1, cursor: 'pointer' }}>{onChainFrozen ? '🔓 UNFREEZE AGENT' : '❄ FREEZE ALL ASSETS'}</button>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══════════════════════════════════════════════ */}
        <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>Overview <em style={{ fontStyle: 'italic', color: gold }}>Dashboard</em></h1>
            <p style={{ fontSize: 14, color: textDim, lineHeight: 1.6, margin: 0, maxWidth: 600 }}>
              Autonomous threat monitoring and risk management system active. Protocol 4.0.2 is currently enforcing all shield policies across connected nodes.
            </p>
          </div>

          {/* ─── Top Cards Row ────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Security Node Status */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: gold }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.5" fill="currentColor" /><circle cx="15" cy="9" r="1.5" fill="currentColor" /><circle cx="9" cy="15" r="1.5" fill="currentColor" /><circle cx="15" cy="15" r="1.5" fill="currentColor" /></svg>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>Security Node Status</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: onChainFrozen ? red : (connected ? green : textDim), boxShadow: `0 0 8px ${onChainFrozen ? red : (connected ? green : 'transparent')}`, display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: onChainFrozen ? red : (connected ? green : textDim) }}>{onChainFrozen ? 'Agent Frozen' : (connected ? 'Agent Active' : 'Not Connected')}</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, color: textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Reputation Score</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <span style={{ fontSize: 42, fontWeight: 700, color: gold, lineHeight: 1 }}>{onChainRep ?? '—'}</span>
                    <span style={{ fontSize: 16, color: textDim }}>/100</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assets Monitored</span>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>{onChainTotalTx != null ? onChainTotalTx : '—'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Successful TXs</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: gold }}>{onChainSuccessTx != null ? onChainSuccessTx : '—'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, color: textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: onChainFrozen ? red : green }}>{onChainFrozen ? 'FROZEN' : (connected ? 'LIVE' : '—')}</span>
                </div>
              </div>
            </div>

            {/* Approval Rate */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: textDim, textAlign: 'center', margin: '0 0 16px', letterSpacing: 1, textTransform: 'uppercase' }}>Approval Rate Distribution</h3>
              <DonutChart percentage={88} />
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textDim }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: gold, display: 'inline-block' }} />Approved
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textDim }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#555', display: 'inline-block' }} />Rejected
                </div>
              </div>
            </div>
          </div>

          {/* ─── Bottom Cards Row ─────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Shield Policies */}
            <div style={cardStyle}>
              <h3 style={sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l8 4v6c0 5.25-3.5 10-8 12C7.5 22 4 17.25 4 12V6l8-4z" /><circle cx="12" cy="11" r="3" /></svg>
                SHIELD POLICIES
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Max Amount (SOL)</label>
                  <input type="text" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Min Reputation Score</label>
                  <input type="text" value={minReputation} onChange={(e) => setMinReputation(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                <label style={labelStyle}>Allowed Receiver Address</label>
                <input type="text" placeholder="Enter wallet address..." value={receiverAddress} onChange={(e) => setReceiverAddress(e.target.value)} style={inputStyle} />
              </div>
              <button onClick={handleSavePolicy} disabled={savingPolicy} style={{ width: '100%', background: gold, color: '#000', border: 'none', borderRadius: 8, padding: 14, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, cursor: 'pointer', opacity: savingPolicy ? 0.6 : 1 }}>{savingPolicy ? 'SAVING...' : 'SAVE POLICY'}</button>
              {policyStatus && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, fontSize: 12, background: policyStatus.type === 'success' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,102,0.1)', color: policyStatus.type === 'success' ? green : red }}>{policyStatus.text}</div>
              )}
            </div>

            {/* TX Tester */}
            <div style={cardStyle}>
              <h3 style={sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                TX TESTER
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Test Amount</label>
                  <input type="text" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Receiver</label>
                  <input type="text" value={testReceiver} onChange={(e) => setTestReceiver(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <button onClick={handleTest} disabled={testingTx} style={{ width: '100%', background: 'transparent', color: gold, border: `1px solid ${gold}`, borderRadius: 8, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, opacity: testingTx ? 0.6 : 1 }}>{testingTx ? 'Submitting...' : 'Test Transaction'}</button>
              {simResult && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: simResult.success ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,102,0.08)', border: `1px solid ${simResult.success ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,102,0.2)'}`, borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={simResult.success ? green : red} strokeWidth="2"><circle cx="12" cy="12" r="10" />{simResult.success ? <path d="M9 12l2 2 4-4" /> : <path d="M15 9l-6 6M9 9l6 6" />}</svg>
                    <div>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: simResult.success ? green : red, letterSpacing: 1 }}>{simResult.success ? 'TX APPROVED' : 'TX REJECTED'}</span>
                      <span style={{ display: 'block', fontSize: 11, color: textDim, marginTop: 2 }}>{simResult.message}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: 10, color: textDim }}>Est. Fee</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{simResult.fee}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── Audit Logs ───────────────────────────────────────────── */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="3" width="14" height="18" rx="2" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="12" y2="16" /></svg>
                AUDIT LOGS
              </h3>
              <a href="#" style={{ fontSize: 12, color: textDim, textDecoration: 'none' }}>View Full History →</a>
            </div>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 1fr', gap: 12, padding: '8px 0', borderBottom: `1px solid ${cardBorder}`, color: textDim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <span>Timestamp</span><span>Event</span><span>Status</span><span>Details</span>
            </div>
            {/* Rows */}
            {auditLogs.map((log, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 1fr', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(42,42,42,0.5)' }}>
                <span style={{ fontFamily: mono, color: textDim, fontSize: 12 }}>{log.time}</span>
                <span style={{ color: '#ccc' }}>{log.event}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: log.status === 'Blocked' ? red : green }}>{log.status}</span>
                <span style={{ color: textDim, fontSize: 12 }}>{log.detail}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
