'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, mono, body, LrhLockup, CTAButton } from '../tokens';

export type Mode = 'gazon' | 'salle';

export function NavLink({ children, href, active = false, white = false }: {
  children: React.ReactNode;
  href?: string;
  active?: boolean;
  white?: boolean;
}) {
  const style: React.CSSProperties = {
    ...body, fontSize: 13, fontWeight: 600,
    color: active ? (white ? '#fff' : LRH.navy) : (white ? 'rgba(255,255,255,0.7)' : LRH.ink2),
    cursor: 'pointer', position: 'relative', padding: '6px 0',
    letterSpacing: '0.01em',
    textDecoration: 'none',
    display: 'inline-block',
  };
  const inner = (
    <>
      {children}
      {active && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: 2, background: LRH.red,
        }} />
      )}
    </>
  );
  return href ? <Link href={href} style={style}>{inner}</Link> : <div style={style}>{inner}</div>;
}

export function SeasonToggle({ mode, setMode, size = 'md' }: {
  mode: Mode;
  setMode: (m: Mode) => void;
  size?: 'md' | 'lg';
}) {
  const isLg = size === 'lg';
  const pad = isLg ? '10px 22px' : '7px 16px';
  const fs = isLg ? 13 : 12;
  return (
    <div style={{
      display: 'inline-flex', padding: 4, borderRadius: 999,
      background: LRH.navy,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.06)',
    }}>
      {(['gazon', 'salle'] as const).map((m) => (
        <button key={m} onClick={() => setMode(m)} style={{
          ...body, fontWeight: 700, fontSize: fs,
          color: mode === m ? LRH.navy : 'rgba(255,255,255,0.65)',
          background: mode === m ? LRH.gold : 'transparent',
          border: 'none', borderRadius: 999, padding: pad,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          cursor: 'pointer', transition: 'all 0.2s',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: mode === m ? LRH.navy : 'rgba(255,255,255,0.3)',
          }} />
          {m === 'gazon' ? 'Gazon' : 'Salle'}
          <span style={{ ...mono, fontSize: 9, opacity: mode === m ? 0.55 : 0.35, letterSpacing: '0.05em' }}>
            {m === 'gazon' ? "'25–'26" : "'26"}
          </span>
        </button>
      ))}
    </div>
  );
}

export function MobileSeasonToggle({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div style={{
      display: 'inline-flex', padding: 4, borderRadius: 999, background: LRH.navy, width: '100%',
    }}>
      {(['gazon', 'salle'] as const).map((m) => (
        <button key={m} onClick={() => setMode(m)} style={{
          flex: 1, ...body, fontWeight: 700, fontSize: 12,
          color: mode === m ? LRH.navy : 'rgba(255,255,255,0.65)',
          background: mode === m ? LRH.gold : 'transparent',
          border: 'none', borderRadius: 999, padding: '10px 0',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: mode === m ? LRH.navy : 'rgba(255,255,255,0.3)' }} />
          {m === 'gazon' ? 'Gazon' : 'Salle'}
        </button>
      ))}
    </div>
  );
}

export function HeaderDesktop({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid ' + LRH.hair }}>
      <div style={{
        background: LRH.navy, color: 'rgba(255,255,255,0.7)',
        display: 'flex', justifyContent: 'space-between',
        padding: '6px 64px', ...mono, fontSize: 10.5,
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <span>● Saint-Denis · 27°C</span>
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>J–04 Coupe de la Réunion 2026</span>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <span>FR</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <a href="/dashboard" style={{ color: LRH.gold, textDecoration: 'none' }}>Espace Clubs</a>
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 64px', gap: 32,
      }}>
        <LrhLockup height={64} />
        <SeasonToggle mode={mode} setMode={setMode} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ ...body, fontSize: 12.5, color: LRH.ink2, fontWeight: 600, cursor: 'pointer' }}>Se connecter</div>
          <CTAButton variant="red">Prendre une licence</CTAButton>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 32, padding: '0 64px 14px', alignItems: 'center' }}>
        <NavLink href="/actualites">Actualités</NavLink>
        <NavLink href="/competitions">Compétitions</NavLink>
        <NavLink href="/classements">Classements</NavLink>
        <NavLink href="/clubs">Clubs</NavLink>
        <NavLink>Arbitrage</NavLink>
        <NavLink href="/ligue">La Ligue</NavLink>
        <div style={{ flex: 1 }} />
        <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.1em' }}>
          SAISON {mode === 'gazon' ? '2025–2026' : 'INDOOR 2026'}
        </div>
      </div>
    </div>
  );
}

export function HeaderMobile({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid ' + LRH.hair, position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{
        background: LRH.navy, color: 'rgba(255,255,255,0.7)',
        padding: '5px 16px', ...mono, fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase', textAlign: 'center',
      }}>
        ● Saint-Denis · 27°C — J–04 Coupe de la Réunion
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
        <LrhLockup height={44} />
        <a href="/dashboard" style={{
          width: 36, height: 36, borderRadius: 8, background: LRH.paperWarm,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...mono, fontWeight: 800, fontSize: 14, color: LRH.navy,
          textDecoration: 'none'
        }}>≡</a>
      </div>
      <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'center' }}>
        <MobileSeasonToggle mode={mode} setMode={setMode} />
      </div>
    </div>
  );
}
