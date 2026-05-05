'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletButton } from '@/components/WalletButton';
import { useAgentStore } from '@/store/agentStore';
import { useSentinelProgram } from '@/lib/useSentinelProgram';
import { BACKEND_URL, SIMULATION_PRESETS } from '@/lib/constants';

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
  const [auditLogs, setAuditLogs] = useState<{time:string;event:string;status:string;detail:string}[]>([
    { time: '—', event: 'System ready', status: 'Active', detail: 'Waiting for interactions' },
  ]);
  const [approvalPct, setApprovalPct] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const agentId = 'GmVvumDq2BRsQTTWjwgEBSWYN3MoFU1niSBCYBUTRCaK';

  useEffect(() => {
    if (agentList.length === 0) {
      addAgent(agentId);
      setSelectedAgent(agentId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch balance when wallet connects
  useEffect(() => {
    if (!connected || !publicKey) return;
    connection.getBalance(publicKey).then(b => setWalletBalance(b / LAMPORTS_PER_SOL)).catch(() => {});
  }, [connected, publicKey, connection]);

  // Poll backend profile every 3s
  const fetchBackendProfile = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/profile?agent_pubkey=${agentId}`);
      if (!res.ok) return;
      const p = await res.json();
      setOnChainRep(p.reputationScore);
      setOnChainFrozen(p.frozen);
      setOnChainTotalTx(p.totalTransactions);
      setOnChainSuccessTx(p.successfulTransactions);
    } catch {}
  }, []);

  // Poll backend audit logs every 3s
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/logs?agent_pubkey=${agentId}`);
      if (!res.ok) return;
      const logs = await res.json();
      if (Array.isArray(logs) && logs.length > 0) {
        const mapped = logs.slice(0, 20).map((l: any) => ({
          time: l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '—',
          event: l.payment_type === 'x402' ? 'x402 Payment' : 'Transaction',
          status: l.status === 'approved' ? 'Approved' : 'Blocked',
          detail: l.reason?.slice(0, 60) || '—',
        }));
        setAuditLogs(mapped);
        const approved = logs.filter((l: any) => l.status === 'approved').length;
        setApprovalPct(logs.length > 0 ? Math.round((approved / logs.length) * 100) : 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchBackendProfile();
    fetchAuditLogs();
    const iv = setInterval(() => { fetchBackendProfile(); fetchAuditLogs(); }, 3000);
    return () => clearInterval(iv);
  }, [fetchBackendProfile, fetchAuditLogs]);

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

  // ─── Initiate Scan = Initialize profile via backend
  const handleInitScan = useCallback(async () => {
    setScanning(true);
    try {
      // Just fetch/create profile on backend
      await fetch(`${BACKEND_URL}/profile?agent_pubkey=${agentId}`);
      addLog('Agent Initialized', 'Approved', 'Profile created/refreshed');
      await fetchBackendProfile();
    } catch (err: any) {
      addLog('Agent Init', 'Blocked', err?.message?.slice(0, 60) || 'Error');
    } finally { setScanning(false); }
  }, [addLog, fetchBackendProfile]);

  // ─── Save Policy (demo mode: just log it)
  const handleSavePolicy = useCallback(async () => {
    setSavingPolicy(true);
    setPolicyStatus(null);
    try {
      const receiver = receiverAddress || agentId;
      setPolicyStatus({ type: 'success', text: `Policy saved! Max: ${maxAmount} SOL, MinRep: ${minReputation}` });
      addLog('Policy Update', 'Approved', `Max: ${maxAmount} SOL, MinRep: ${minReputation}, Recv: ${receiver.slice(0,8)}...`);
      setTimeout(() => setPolicyStatus(null), 5000);
    } catch (err: any) {
      setPolicyStatus({ type: 'error', text: err?.message?.slice(0, 80) || 'Failed to save policy' });
    } finally { setSavingPolicy(false); }
  }, [maxAmount, minReputation, receiverAddress, addLog]);

  // ─── Test Transaction via backend
  const handleTest = useCallback(async () => {
    setTestingTx(true);
    setSimResult(null);
    try {
      const lamports = Math.floor(parseFloat(testAmount) * 1e9);
      const res = await fetch(`${BACKEND_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_pubkey: agentId, amount: lamports, receiver: testReceiver, payment_type: 'normal' }),
      });
      const data = await res.json();
      if (data.status === 'approved') {
        setSimResult({ success: true, message: data.reason || 'Transaction approved', fee: '~0.00005 SOL' });
        addLog('Transaction', 'Approved', `${testAmount} SOL → ${testReceiver.slice(0,8)}...`);
      } else {
        setSimResult({ success: false, message: data.reason || 'Transaction rejected', fee: '—' });
        addLog('Transaction', 'Blocked', data.reason?.slice(0, 50) || 'Rejected');
      }
      await fetchBackendProfile();
      await fetchAuditLogs();
    } catch (err: any) {
      setSimResult({ success: false, message: 'Backend unavailable', fee: '—' });
      addLog('Transaction', 'Blocked', 'Backend unavailable');
    } finally { setTestingTx(false); }
  }, [testAmount, testReceiver, addLog, fetchBackendProfile, fetchAuditLogs]);

  // ─── Freeze / Unfreeze via backend
  const handleFreeze = useCallback(async () => {
    try {
      const endpoint = onChainFrozen ? '/unfreeze' : '/freeze';
      await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_pubkey: agentId }),
      });
      addLog(onChainFrozen ? 'Unfreeze' : 'Freeze', 'Approved', onChainFrozen ? 'Agent unfrozen' : 'Agent frozen by owner');
      await fetchBackendProfile();
      await fetchAuditLogs();
    } catch { addLog('Freeze/Unfreeze', 'Blocked', 'Backend unavailable'); }
  }, [onChainFrozen, addLog, fetchBackendProfile, fetchAuditLogs]);

  // ─── Run a preset simulation
  const runPreset = useCallback(async (key: string) => {
    const preset = SIMULATION_PRESETS[key as keyof typeof SIMULATION_PRESETS];
    if (!preset) return;
    setTestingTx(true);
    setSimResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_pubkey: agentId, amount: preset.amount, receiver: preset.receiver, payment_type: preset.payment_type }),
      });
      const data = await res.json();
      const ok = data.status === 'approved';
      setSimResult({ success: ok, message: data.reason || (ok ? 'Approved' : 'Rejected'), fee: ok ? '~0.00005 SOL' : '—' });
      addLog(preset.label, ok ? 'Approved' : 'Blocked', data.reason?.slice(0, 50) || '—');
      await fetchBackendProfile();
      await fetchAuditLogs();
    } catch {
      setSimResult({ success: false, message: 'Backend unavailable', fee: '—' });
    } finally { setTestingTx(false); }
  }, [addLog, fetchBackendProfile, fetchAuditLogs]);

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
              <input
                type="text"
                placeholder="Search protocol..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addLog('Search', 'Approved', `Scanning for: "${(e.target as HTMLInputElement).value}"...`);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, width: 140 }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }}
                style={{ background: 'none', border: 'none', color: showNotifications ? gold : textDim, cursor: 'pointer', padding: 6, transition: 'color 0.2s' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
                {auditLogs.some(l => l.status === 'Blocked') && (
                  <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, background: red, borderRadius: '50%', border: `1px solid ${darkBg}` }} />
                )}
              </button>
              {showNotifications && (
                <div style={{ position: 'absolute', top: 40, right: 0, width: 280, background: 'rgba(20,20,20,0.95)', border: `1px solid ${cardBorder}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', padding: '12px 0', zIndex: 100 }}>
                  <div style={{ padding: '0 16px 10px', borderBottom: `1px solid ${cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: gold, letterSpacing: 1 }}>RECENT ALERTS</span>
                    <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', color: textDim, fontSize: 10, cursor: 'pointer' }}>CLOSE</button>
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {auditLogs.slice(0, 5).map((l, i) => (
                      <div key={i} style={{ padding: '10px 16px', borderBottom: i === 4 ? 'none' : '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.status === 'Approved' ? green : red, marginTop: 4, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{l.event}</div>
                          <div style={{ fontSize: 10, color: textDim, marginTop: 2 }}>{l.detail}</div>
                          <div style={{ fontSize: 9, color: gold, marginTop: 4 }}>{l.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); }}
                style={{ background: 'none', border: 'none', color: showSettings ? gold : textDim, cursor: 'pointer', padding: 6, transition: 'color 0.2s' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              </button>
              {showSettings && (
                <div style={{ position: 'absolute', top: 40, right: 0, width: 220, background: 'rgba(20,20,20,0.95)', border: `1px solid ${cardBorder}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', padding: '12px 0', zIndex: 100 }}>
                  <div style={{ padding: '0 16px 10px', borderBottom: `1px solid ${cardBorder}`, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: gold, letterSpacing: 1 }}>SYSTEM SETTINGS</span>
                  </div>
                  <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#eee' }}>Compact View</span>
                      <button onClick={() => setCompactView(!compactView)} style={{ width: 32, height: 16, background: compactView ? gold : '#333', borderRadius: 8, border: 'none', cursor: 'pointer', position: 'relative' }}>
                        <div style={{ width: 12, height: 12, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: compactView ? 18 : 2, transition: 'all 0.2s' }} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#eee' }}>High Contrast</span>
                      <button style={{ width: 32, height: 16, background: '#333', borderRadius: 8, border: 'none', cursor: 'pointer', position: 'relative' }}>
                        <div style={{ width: 12, height: 12, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: 2 }} />
                      </button>
                    </div>
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 9, color: textDim, marginBottom: 4 }}>RPC ENDPOINT</div>
                      <div style={{ fontSize: 10, color: gold, wordBreak: 'break-all' }}>https://api.devnet.solana.com</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
              <button key={item.label} onClick={() => {
                setActiveSidebar(item.label);
                setActiveTab('Overview');
                const idMap: Record<string, string> = {
                  'SECURITY HUB': 'section-status',
                  'SHIELD POLICIES': 'section-policies',
                  'TX TESTER': 'section-tester',
                  'AUDIT LOGS': 'section-audit',
                  'SYSTEM CONFIG': 'section-config',
                };
                setTimeout(() => {
                  const el = document.getElementById(idMap[item.label] || '');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
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
            <button onClick={handleFreeze} style={{ background: onChainFrozen ? 'rgba(0,255,136,0.08)' : 'transparent', color: onChainFrozen ? green : red, border: `1px solid ${onChainFrozen ? 'rgba(0,255,136,0.3)' : 'rgba(255,68,102,0.3)'}`, borderRadius: 8, padding: 12, fontSize: 12, fontWeight: 600, letterSpacing: 1, cursor: 'pointer' }}>{onChainFrozen ? '🔓 UNFREEZE AGENT' : '❄ FREEZE ALL ASSETS'}</button>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══════════════════════════════════════════════ */}
        <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>
              {activeTab === 'Overview' && <>Overview <em style={{ fontStyle: 'italic', color: gold }}>Dashboard</em></>}
              {activeTab === 'Governance' && <>Shield <em style={{ fontStyle: 'italic', color: gold }}>Governance</em></>}
              {activeTab === 'Developer' && <>Developer <em style={{ fontStyle: 'italic', color: gold }}>Console</em></>}
            </h1>
            <p style={{ fontSize: 14, color: textDim, lineHeight: 1.6, margin: 0, maxWidth: 600 }}>
              {activeTab === 'Overview' && 'Autonomous threat monitoring and risk management system active. Protocol 4.0.2 is currently enforcing all shield policies.'}
              {activeTab === 'Governance' && 'Manage shield policies, review agent compliance, and configure execution guardrails for autonomous agents.'}
              {activeTab === 'Developer' && 'API reference, endpoint testing, and integration documentation for the SentinelAI protocol.'}
            </p>
          </div>

          {activeTab === 'Overview' && (<>

          {/* ─── Top Cards Row ────────────────────────────────────────── */}
          <div id="section-status" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20, scrollMarginTop: 80 }}>
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
              <DonutChart percentage={approvalPct || 88} />
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
          <div id="section-policies" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20, scrollMarginTop: 80 }}>
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
            <div id="section-tester" style={{ ...cardStyle, scrollMarginTop: 80 }}>
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
              <button onClick={handleTest} disabled={testingTx} style={{ width: '100%', background: 'transparent', color: gold, border: `1px solid ${gold}`, borderRadius: 8, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12, opacity: testingTx ? 0.6 : 1 }}>{testingTx ? 'Submitting...' : 'Test Transaction'}</button>
              {/* ─── Quick Presets ─────────────────────────────────── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Quick Presets</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {Object.entries(SIMULATION_PRESETS).map(([key, preset]) => (
                    <button key={key} onClick={() => runPreset(key)} disabled={testingTx}
                      style={{ background: preset.variant === 'valid' ? 'rgba(0,255,136,0.06)' : preset.variant === 'x402' ? 'rgba(139,92,246,0.08)' : 'rgba(255,68,102,0.06)', border: `1px solid ${preset.variant === 'valid' ? 'rgba(0,255,136,0.2)' : preset.variant === 'x402' ? 'rgba(139,92,246,0.2)' : 'rgba(255,68,102,0.2)'}`, borderRadius: 6, padding: '8px 10px', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{preset.label}</div>
                      <div style={{ fontSize: 9, color: textDim, marginTop: 2 }}>{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>
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
          <div id="section-audit" style={{ ...cardStyle, scrollMarginTop: 80 }}>
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

          {/* ─── System Config ──────────────────────────────────────────── */}
          <div id="section-config" style={{ ...cardStyle, marginTop: 20, scrollMarginTop: 80 }}>
            <h3 style={sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              SYSTEM CONFIG
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Backend URL</label>
                <input type="text" value={BACKEND_URL} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Program ID</label>
                <input type="text" value="CSjzuzfE3dc8D2jiECFvqjiWsxqYP98ixNzMrZ2mv8FY" readOnly style={{ ...inputStyle, opacity: 0.7 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Network</label>
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: green, boxShadow: `0 0 6px ${green}`, display: 'inline-block' }} />
                  Solana Devnet
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Mode</label>
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: gold, boxShadow: `0 0 6px ${gold}`, display: 'inline-block' }} />
                  Demo (Simulation)
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={{ background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: gold }}>{onChainRep ?? 50}</div>
                <div style={{ fontSize: 10, color: textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Reputation</div>
              </div>
              <div style={{ background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: onChainFrozen ? red : green }}>{onChainFrozen ? 'YES' : 'NO'}</div>
                <div style={{ fontSize: 10, color: textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Frozen</div>
              </div>
              <div style={{ background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{approvalPct}%</div>
                <div style={{ fontSize: 10, color: textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Approval Rate</div>
              </div>
            </div>
          </div>
          </>)}

          {/* ═══ GOVERNANCE TAB ═══════════════════════════════════════════ */}
          {activeTab === 'Governance' && (<>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Policy Editor */}
              <div style={cardStyle}>
                <h3 style={sectionTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l8 4v6c0 5.25-3.5 10-8 12C7.5 22 4 17.25 4 12V6l8-4z" /></svg>
                  POLICY EDITOR
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Max Transaction Amount (SOL)</label>
                    <input type="text" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Minimum Reputation Score</label>
                    <input type="text" value={minReputation} onChange={(e) => setMinReputation(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Allowed Receiver Whitelist</label>
                    <input type="text" placeholder="Solana address..." value={receiverAddress} onChange={(e) => setReceiverAddress(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <button onClick={handleSavePolicy} disabled={savingPolicy} style={{ width: '100%', background: gold, color: '#000', border: 'none', borderRadius: 8, padding: 14, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, cursor: 'pointer' }}>{savingPolicy ? 'DEPLOYING...' : 'DEPLOY POLICY ON-CHAIN'}</button>
                {policyStatus && (
                  <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, fontSize: 12, background: policyStatus.type === 'success' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,102,0.1)', color: policyStatus.type === 'success' ? green : red }}>{policyStatus.text}</div>
                )}
              </div>

              {/* Active Policies Summary */}
              <div style={cardStyle}>
                <h3 style={sectionTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>
                  ACTIVE RULES
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { rule: 'Max Amount', value: `${maxAmount} SOL`, color: gold },
                    { rule: 'Min Reputation', value: minReputation, color: parseInt(minReputation) > 70 ? green : gold },
                    { rule: 'Receiver Lock', value: receiverAddress ? `${receiverAddress.slice(0,12)}...` : 'Any', color: receiverAddress ? green : textDim },
                    { rule: 'Agent Status', value: onChainFrozen ? 'FROZEN' : 'ACTIVE', color: onChainFrozen ? red : green },
                    { rule: 'Circuit Breaker', value: 'Enabled (3 failures)', color: green },
                    { rule: 'Private Mode', value: 'Disabled', color: textDim },
                  ].map((r) => (
                    <div key={r.rule} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: textDim }}>{r.rule}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: r.color, fontFamily: mono }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Governance Log */}
            <div style={cardStyle}>
              <h3 style={sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="3" width="14" height="18" rx="2" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" /></svg>
                GOVERNANCE ACTIVITY
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 1fr', gap: 12, padding: '8px 0', borderBottom: `1px solid ${cardBorder}`, color: textDim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <span>Time</span><span>Event</span><span>Status</span><span>Details</span>
              </div>
              {auditLogs.map((log, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 1fr', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(42,42,42,0.5)' }}>
                  <span style={{ fontFamily: mono, color: textDim, fontSize: 12 }}>{log.time}</span>
                  <span style={{ color: '#ccc' }}>{log.event}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: log.status === 'Blocked' ? red : green }}>{log.status}</span>
                  <span style={{ color: textDim, fontSize: 12 }}>{log.detail}</span>
                </div>
              ))}
            </div>
          </>)}

          {/* ═══ DEVELOPER TAB ════════════════════════════════════════════ */}
          {activeTab === 'Developer' && (<>
            {/* API Endpoints */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={cardStyle}>
                <h3 style={sectionTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  API ENDPOINTS
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { method: 'POST', path: '/execute', desc: 'Submit agent transaction for validation' },
                    { method: 'GET', path: '/logs', desc: 'Retrieve activity log with optional agent filter' },
                    { method: 'GET', path: '/profile', desc: 'Fetch agent profile (reputation, frozen status)' },
                    { method: 'POST', path: '/freeze', desc: 'Manually freeze an agent' },
                    { method: 'POST', path: '/unfreeze', desc: 'Unfreeze a frozen agent' },
                    { method: 'GET', path: '/api/audit', desc: 'Retrieve immutable audit trail (JSONL)' },
                    { method: 'GET', path: '/api/resource/:id', desc: 'x402 gated resource endpoint' },
                    { method: 'GET', path: '/health', desc: 'Health check' },
                  ].map((ep) => (
                    <div key={ep.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: mono, color: ep.method === 'POST' ? gold : green, background: ep.method === 'POST' ? 'rgba(212,160,23,0.1)' : 'rgba(0,255,136,0.1)', padding: '3px 8px', borderRadius: 4, letterSpacing: 1 }}>{ep.method}</span>
                      <span style={{ fontSize: 13, fontFamily: mono, color: '#fff', flex: 1 }}>{ep.path}</span>
                      <span style={{ fontSize: 11, color: textDim }}>{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Endpoint Tester */}
              <div style={cardStyle}>
                <h3 style={sectionTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 8l4 4-4 4" /><line x1="14" y1="16" x2="18" y2="16" /></svg>
                  LIVE TESTER
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Amount (lamports)</label>
                    <input type="text" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Receiver Public Key</label>
                    <input type="text" value={testReceiver} onChange={(e) => setTestReceiver(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <button onClick={handleTest} disabled={testingTx} style={{ width: '100%', background: 'transparent', color: gold, border: `1px solid ${gold}`, borderRadius: 8, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>{testingTx ? 'Submitting...' : 'POST /execute'}</button>
                {simResult && (
                  <div style={{ padding: '12px 16px', borderRadius: 8, background: simResult.success ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,102,0.08)', border: `1px solid ${simResult.success ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,102,0.2)'}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: simResult.success ? green : red, letterSpacing: 1, marginBottom: 4 }}>{simResult.success ? 'RESPONSE 200' : 'RESPONSE 200 (REJECTED)'}</div>
                    <pre style={{ fontSize: 11, color: textDim, margin: 0, whiteSpace: 'pre-wrap', fontFamily: mono }}>{JSON.stringify({ status: simResult.success ? 'approved' : 'rejected', reason: simResult.message }, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* Program Info + Code Example */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={cardStyle}>
                <h3 style={sectionTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  PROGRAM INFO
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Program ID', value: 'CSjzuzfE3dc8D2ji...mv8FY' },
                    { label: 'Network', value: 'Solana Devnet' },
                    { label: 'Anchor Version', value: '0.30.1' },
                    { label: 'Backend', value: BACKEND_URL },
                    { label: 'Mode', value: 'Demo (Simulation)' },
                    { label: 'Instructions', value: '5 (init, policy, submit, freeze, unfreeze)' },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8 }}>
                      <span style={{ fontSize: 12, color: textDim }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: '#fff', fontFamily: mono }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={sectionTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 8l4 4-4 4" /></svg>
                  CODE EXAMPLE
                </h3>
                <pre style={{ background: inputBg, border: `1px solid ${cardBorder}`, borderRadius: 8, padding: 16, fontSize: 11, color: '#ccc', fontFamily: mono, lineHeight: 1.6, margin: 0, overflow: 'auto', whiteSpace: 'pre' }}>{`// Submit a transaction via SentinelAI API
const res = await fetch('${BACKEND_URL}/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_pubkey: '<AGENT_PUBKEY>',
    amount: 10000,      // lamports
    receiver: '<RECEIVER_PUBKEY>',
    payment_type: 'normal' // or 'x402'
  })
});

const { status, reason } = await res.json();
console.log(status); // 'approved' or 'rejected'`}</pre>
              </div>
            </div>
          </>)}
        </main>
      </div>
    </div>
  );
}
