'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

/* ─── Lock visual for hero section ──────────────────────────────────────── */
function LockVisual() {
  return (
    <div style={{ position: 'relative', width: 280, height: 280, margin: '0 auto 40px' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,23,0.12) 0%, transparent 70%)' }} />
      <svg viewBox="0 0 200 200" width="280" height="280" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4A017" />
            <stop offset="50%" stopColor="#C5941A" />
            <stop offset="100%" stopColor="#8B7417" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="85" stroke="url(#lockGrad)" strokeWidth="1" fill="none" opacity="0.4" />
        <circle cx="100" cy="100" r="75" stroke="url(#lockGrad)" strokeWidth="0.5" fill="none" opacity="0.2" />
        <rect x="70" y="90" width="60" height="45" rx="6" fill="url(#lockGrad)" opacity="0.9" />
        <path d="M 80 90 L 80 75 C 80 60 120 60 120 75 L 120 90" stroke="url(#lockGrad)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="100" cy="108" r="6" fill="#1a1a1a" />
        <rect x="97" y="112" width="6" height="10" rx="2" fill="#1a1a1a" />
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
          <circle
            key={angle}
            cx={100 + 85 * Math.cos((angle * Math.PI) / 180)}
            cy={100 + 85 * Math.sin((angle * Math.PI) / 180)}
            r="2"
            fill="#D4A017"
            opacity="0.6"
          />
        ))}
      </svg>
      {/* Floating stat badges */}
      <div style={{ position: 'absolute', left: -40, top: '50%', transform: 'translateY(-50%)', background: 'rgba(30,30,30,0.9)', border: '1px solid #2a2a2a', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#D4A017' }}>$42.8B+</div>
      <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(30,30,30,0.9)', border: '1px solid #2a2a2a', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#888' }}>0.00ms</div>
      <div style={{ position: 'absolute', right: -30, top: '50%', transform: 'translateY(-50%)', background: 'rgba(30,30,30,0.9)', border: '1px solid #2a2a2a', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#D4A017' }}>100%</div>
    </div>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState('');

  /* ── Shared inline style tokens ────────────────────────────────────── */
  const gold = '#D4A017';
  const darkBg = '#0d0d0d';
  const cardBg = '#161616';
  const cardBorder = '#2a2a2a';
  const textDim = '#888';

  return (
    <div style={{ background: darkBg, color: '#fff', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* ═══ NAVIGATION ═══════════════════════════════════════════════════ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,13,13,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${cardBorder}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={gold} strokeWidth="1.5">
              <path d="M12 2l8 4v6c0 5.25-3.5 10-8 12C7.5 22 4 17.25 4 12V6l8-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: gold }}>SENTINEL AI</span>
          </div>
          {/* Links */}
          <div style={{ display: 'flex', gap: 24 }}>
            {['PROTOCOL', 'INTELLIGENCE', 'INFRASTRUCTURE', 'GOVERNANCE', 'DOCUMENTATION'].map((t, i) => (
              <a key={t} href={`#${t.toLowerCase()}`} style={{ fontSize: 11, letterSpacing: 1.5, color: i === 0 ? gold : textDim, textDecoration: 'none' }}>{t}</a>
            ))}
          </div>
          {/* CTA */}
          <Link href="/dashboard" style={{ fontSize: 11, letterSpacing: 1.5, background: gold, color: '#000', padding: '8px 18px', borderRadius: 4, textDecoration: 'none', fontWeight: 600 }}>
            LAUNCH TERMINAL
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═════════════════════════════════════════════════════════ */}
      <section style={{ textAlign: 'center', padding: '80px 24px 40px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 20, padding: '6px 16px', fontSize: 10, letterSpacing: 2, color: gold, marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: gold, display: 'inline-block' }} />
            ACTIVE MAINNET PROTOCOL
          </div>
          {/* Title */}
          <h1 style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.2, margin: '0 0 16px' }}>
            The Future of <em style={{ fontStyle: 'italic', color: gold }}>On-Chain Security</em>
          </h1>
          {/* Subtitle */}
          <p style={{ color: textDim, fontSize: 15, lineHeight: 1.6, margin: '0 0 32px' }}>
            Autonomous threat monitoring for institutional-grade digital assets. Sentinel
            AI leverages deep neural auditing to secure billions in protocol liquidity.
          </p>
          {/* Buttons */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <Link href="/dashboard" style={{ background: gold, color: '#000', padding: '12px 28px', borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textDecoration: 'none' }}>
              LAUNCH DASHBOARD
            </Link>
            <a href="#protocol" style={{ background: 'transparent', color: '#ccc', border: `1px solid ${cardBorder}`, padding: '12px 28px', borderRadius: 4, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textDecoration: 'none' }}>
              VIEW PROTOCOL
            </a>
          </div>
        </div>
      </section>

      {/* ═══ STATS + LOCK VISUAL ══════════════════════════════════════════ */}
      <section style={{ padding: '20px 24px 60px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <LockVisual />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 40, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: gold }}>$42.8B+</span>
              <span style={{ fontSize: 11, color: textDim, letterSpacing: 1, textTransform: 'uppercase' }}>Total Value Protected</span>
            </div>
            <div style={{ width: 1, height: 40, background: cardBorder }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: gold }}>0.00ms</span>
              <span style={{ fontSize: 11, color: textDim, letterSpacing: 1, textTransform: 'uppercase' }}>Latency Detection</span>
            </div>
            <div style={{ width: 1, height: 40, background: cardBorder }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: gold }}>100%</span>
              <span style={{ fontSize: 11, color: textDim, letterSpacing: 1, textTransform: 'uppercase' }}>Uptime Guarantee</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═════════════════════════════════════════════════════ */}
      <section style={{ padding: '60px 24px' }} id="intelligence">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 32px' }}>
            <em style={{ fontStyle: 'italic', color: gold }}>Vigilance as a Service</em>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Shield Policies */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 28 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={gold} strokeWidth="1.5" style={{ marginBottom: 16, display: 'block' }}>
                <path d="M12 2l8 4v6c0 5.25-3.5 10-8 12C7.5 22 4 17.25 4 12V6l8-4z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Shield Policies</h3>
              <p style={{ fontSize: 13, color: textDim, lineHeight: 1.6, margin: '0 0 16px' }}>
                Define custom parameters for your protocol. Our AI autonomously flags suspicious
                transactions that deviate from historical behavioral patterns.
              </p>
              <a href="#" style={{ fontSize: 11, color: gold, letterSpacing: 1.5, textDecoration: 'none', fontWeight: 600 }}>GOVERNANCE OVERVIEW →</a>
            </div>

            {/* Real-time Auditing */}
            <div style={{ background: '#1c1c1c', border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 28 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={gold} strokeWidth="1.5" style={{ marginBottom: 16, display: 'block' }}>
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 14l2 2 4-4" />
              </svg>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Real-time Auditing</h3>
              <p style={{ fontSize: 13, color: textDim, lineHeight: 1.6, margin: '0 0 16px' }}>
                Continuous smart contract monitoring. As state changes, Sentinel AI verifies
                invariant conditions every block.
              </p>
              <a href="#" style={{ fontSize: 11, color: gold, letterSpacing: 1.5, textDecoration: 'none', fontWeight: 600 }}>EXPLORE BLOCK ANALYSIS →</a>
            </div>

            {/* Reputation Scores */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 28 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={gold} strokeWidth="1.5" style={{ marginBottom: 16, display: 'block' }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Reputation Scores</h3>
              <p style={{ fontSize: 13, color: textDim, lineHeight: 1.6, margin: 0 }}>
                Instant KYC-less wallet profiling. Evaluate counterparty risk before
                they interact with your pools.
              </p>
            </div>

            {/* Neural Threat Maps */}
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 28, display: 'flex', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={gold} strokeWidth="1.5" style={{ marginBottom: 16, display: 'block' }}>
                  <path d="M3 3v18h18" />
                  <path d="M7 16l4-8 4 4 4-6" />
                </svg>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Neural Threat Maps</h3>
                <p style={{ fontSize: 13, color: textDim, lineHeight: 1.6, margin: '0 0 16px' }}>
                  Visualize contagion risks across the DeFi ecosystem with our proprietary threat mapping engine.
                </p>
                <a href="#" style={{ fontSize: 11, color: gold, letterSpacing: 1.5, textDecoration: 'none', fontWeight: 600 }}>EXPLORE NETWORK MAP →</a>
              </div>
              <div style={{ width: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 3 }}>
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} style={{ width: 12, height: 12, background: gold, borderRadius: 2, opacity: ((i * 7 + 3) % 10) / 12 + 0.2 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA: JOIN THE SOVEREIGN SHIELD ═══════════════════════════════ */}
      <section style={{ padding: '60px 24px' }} id="governance">
        <div style={{ maxWidth: 700, margin: '0 auto', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <span style={{ fontSize: 10, letterSpacing: 2, color: gold, background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 20, padding: '4px 14px' }}>PRIVATE ACCESS</span>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: '20px 0 12px' }}>Join the Sovereign Shield</h2>
          <p style={{ fontSize: 13, color: textDim, lineHeight: 1.6, margin: '0 auto 28px', maxWidth: 500 }}>
            Early access is currently restricted to verified institutional participants and active DeFi
            protocols. Submit your credentials to join the hypervigilant guard.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
            <input
              type="email"
              placeholder="Enter your institutional email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ background: '#1a1a1a', border: `1px solid ${cardBorder}`, borderRadius: 6, padding: '10px 16px', color: '#fff', fontSize: 13, width: 300, outline: 'none' }}
            />
            <button style={{ background: gold, color: '#000', padding: '10px 20px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>GET EARLY ACCESS</button>
          </div>
          <p style={{ fontSize: 10, color: textDim, letterSpacing: 1.5, margin: 0 }}>REQUIRES KYB VERIFICATION</p>
        </div>
      </section>

      {/* ═══ BOTTOM BANNER ════════════════════════════════════════════════ */}
      <section style={{ padding: '0 24px 60px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', background: gold, borderRadius: 12, padding: '40px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#000', margin: '0 0 8px', letterSpacing: 1 }}>READY TO SECURE YOUR PROTOCOL?</h2>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.7)', margin: 0 }}>Deploy institutional-grade security measures in five minutes.</p>
            <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', margin: '4px 0 0' }}>Mainnet epoch.</p>
          </div>
          <Link href="/dashboard" style={{ background: '#000', color: gold, padding: '14px 28px', borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            ENTER THE TERMINAL
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: `1px solid ${cardBorder}`, padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={gold} strokeWidth="1.5">
              <path d="M12 2l8 4v6c0 5.25-3.5 10-8 12C7.5 22 4 17.25 4 12V6l8-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: gold }}>SENTINEL AI</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Security Manifesto', 'Network Status', 'API Access', 'Privacy Vault'].map((l) => (
              <a key={l} href="#" style={{ fontSize: 11, color: textDim, textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
          <p style={{ fontSize: 10, color: textDim, letterSpacing: 1, margin: 0 }}>© 2026 SENTINEL AI PROTOCOL. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
}
