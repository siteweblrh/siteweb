'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LRH, mono, body, LrhLockup, CTAButton } from '../tokens';
import { WeatherBadge } from './WeatherBadge';

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
          color: mode === m ? LRH.navy : 'rgba(255,255,255,0.82)',
          background: mode === m ? LRH.gold : 'transparent',
          border: 'none', borderRadius: 999, padding: pad,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          cursor: 'pointer', transition: 'all 0.2s',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: mode === m ? LRH.navy : 'rgba(255,255,255,0.55)',
          }} />
          {m === 'gazon' ? 'Gazon' : 'Salle'}
          <span style={{ ...mono, fontSize: 9, opacity: mode === m ? 0.85 : 0.7, letterSpacing: '0.05em' }}>
            {"'25–'26"}
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
          color: mode === m ? LRH.navy : 'rgba(255,255,255,0.82)',
          background: mode === m ? LRH.gold : 'transparent',
          border: 'none', borderRadius: 999, padding: '10px 0',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: mode === m ? LRH.navy : 'rgba(255,255,255,0.55)' }} />
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
        padding: '6px clamp(20px, 4.5vw, 64px)', ...mono, fontSize: 10.5,
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <WeatherBadge variant="desktop" />
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <span>FR</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <a href="/dashboard" style={{ color: LRH.gold, textDecoration: 'none' }}>Espace Clubs</a>
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px clamp(20px, 4.5vw, 64px)', gap: 32,
      }}>
        <LrhLockup height={64} />
        <SeasonToggle mode={mode} setMode={setMode} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/licence" style={{ textDecoration: 'none' }}>
            <CTAButton variant="red">Prendre une licence</CTAButton>
          </Link>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'clamp(16px, 2vw, 32px)', padding: '0 clamp(20px, 4.5vw, 64px) 14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <NavLink href="/">Accueil</NavLink>
        <NavLink href="/actualites">Actualités</NavLink>
        <NavLink href="/competitions">Calendrier</NavLink>
        <NavLink href="/classements">Classements</NavLink>
        <NavLink href="/clubs">Clubs</NavLink>
        <NavLink href="/arbitrage">Arbitrage</NavLink>
        <NavLink href="/ligue">La Ligue</NavLink>
        <div style={{ flex: 1 }} />
        <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.1em' }}>
          SAISON {mode === 'gazon' ? '2025–2026' : 'INDOOR 2025–2026'}
        </div>
      </div>
    </div>
  );
}

const MOBILE_MENU_LINKS: { href: string; label: string }[] = [
  { href: '/', label: 'Accueil' },
  { href: '/actualites', label: 'Actualités' },
  { href: '/competitions', label: 'Calendrier' },
  { href: '/classements', label: 'Classements' },
  { href: '/clubs', label: 'Clubs' },
  { href: '/arbitrage', label: 'Arbitrage' },
  { href: '/licence', label: 'Prendre une licence' },
  { href: '/ligue', label: 'La Ligue' },
];

export function HeaderMobile({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() ?? '/';

  // Fermer le menu au changement de route + bloquer le scroll body quand ouvert.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen]);

  // z-index 60 : au-dessus de la MobileTabBar (z-30). Sans ça, le drawer
  // burger (qui a z-50 *à l'intérieur* du stacking context de ce conteneur)
  // est plafonné au z-30 global et la tab bar passe par-dessus le bas du
  // drawer (bouton "Mon compte" caché). En remontant ce conteneur, tout le
  // sous-arbre passe au-dessus.
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid ' + LRH.hair, position: 'sticky', top: 0, zIndex: 60 }}>
      <div style={{
        background: LRH.navy, color: 'rgba(255,255,255,0.7)',
        padding: '5px 16px', ...mono, fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase', textAlign: 'center',
      }}>
        <WeatherBadge variant="mobile" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', gap: 12 }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          <LrhLockup height={40} />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
          style={{
            width: 40, height: 40,
            background: LRH.paperWarm,
            border: '1px solid ' + LRH.hairStrong,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 4,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span style={{ width: 18, height: 2, background: LRH.navy }} />
          <span style={{ width: 18, height: 2, background: LRH.navy }} />
          <span style={{ width: 18, height: 2, background: LRH.navy }} />
        </button>
      </div>
      <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'center' }}>
        <MobileSeasonToggle mode={mode} setMode={setMode} />
      </div>

      {menuOpen && (
        <MobileMenuDrawer
          mode={mode}
          setMode={setMode}
          pathname={pathname}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

function MobileMenuDrawer({
  mode,
  setMode,
  pathname,
  onClose,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  pathname: string;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 40,
          animation: 'lrh-fade-in 0.2s ease-out',
        }}
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="Menu de navigation"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(86vw, 360px)',
          background: '#fff',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-12px 0 32px rgba(0,0,0,0.18)',
          animation: 'lrh-slide-in 0.22s ease-out',
        }}
      >
        {/* Header drawer : logo + bouton fermer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px',
            borderBottom: '1px solid ' + LRH.hair,
          }}
        >
          <LrhLockup height={32} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            style={{
              width: 36, height: 36,
              background: 'transparent',
              border: '1px solid ' + LRH.hairStrong,
              ...mono, fontWeight: 700, fontSize: 16,
              color: LRH.navy,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Toggle mode dans le drawer */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid ' + LRH.hair }}>
          <div
            style={{
              ...mono, fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            ◉ Discipline
          </div>
          <MobileSeasonToggle mode={mode} setMode={setMode} />
        </div>

        {/* Liens nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {MOBILE_MENU_LINKS.map((l, i) => {
            const isActive =
              l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  textDecoration: 'none',
                  borderBottom: '1px solid ' + LRH.hair,
                  background: isActive ? LRH.paperWarm : 'transparent',
                }}
              >
                <span
                  style={{
                    ...mono, fontSize: 11,
                    fontWeight: 700,
                    color: isActive ? LRH.red : LRH.mute,
                    letterSpacing: '0.14em',
                    minWidth: 26,
                  }}
                >
                  {(i + 1).toString().padStart(2, '0')}
                </span>
                <span
                  style={{
                    ...body, fontSize: 15,
                    fontWeight: 600,
                    color: isActive ? LRH.navy : LRH.ink,
                    flex: 1,
                  }}
                >
                  {l.label}
                </span>
                {isActive && (
                  <span style={{ width: 18, height: 2, background: LRH.red }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer drawer : CTAs licence + espace pro.
            Padding-bottom = 28px + safe-area pour ne pas coller au bord
            sur iOS (notch / barre home) et laisser une vraie respiration
            au-dessus de la zone tab bar (qui est masquée par le drawer mais
            visible derrière le backdrop côté gauche). */}
        <div
          style={{
            padding: '22px 18px calc(28px + env(safe-area-inset-bottom))',
            marginTop: 12,
            borderTop: '1px solid ' + LRH.hair,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            background: LRH.paperWarm,
          }}
        >
          <Link
            href="/licence"
            onClick={onClose}
            style={{
              ...mono, fontWeight: 700, fontSize: 12,
              padding: '14px 14px',
              minHeight: 48,
              background: LRH.red,
              color: '#fff',
              textDecoration: 'none',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            ▸ Prendre une licence
          </Link>
          <div
            style={{
              ...mono, fontSize: 9.5,
              color: LRH.mute,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 700,
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            Vous êtes club, arbitre ou admin&nbsp;?
          </div>
          <Link
            href="/dashboard"
            onClick={onClose}
            style={{
              ...mono, fontWeight: 700, fontSize: 11,
              padding: '12px 14px',
              minHeight: 44,
              background: 'transparent',
              color: LRH.navy,
              border: '1px solid ' + LRH.hairStrong,
              textDecoration: 'none',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Mon compte →
          </Link>
        </div>
      </aside>

      <style jsx>{`
        @keyframes lrh-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes lrh-slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
