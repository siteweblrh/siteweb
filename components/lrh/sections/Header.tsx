'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LRH, mono, body, display, LrhLockup, CTAButton } from '../tokens';
import { WeatherBadge } from './WeatherBadge';

export type Mode = 'gazon' | 'salle';

/**
 * Logo officiel + nom de la ligue, en lockup horizontal. Le nom est posé à
 * droite du logo, séparé par un filet d'accent dégradé (red → gold) vertical.
 * Tout est dimensionné depuis `logoHeight` pour rester proportionné aux trois
 * tailles d'en-tête (desktop 64, mobile 40, drawer 32).
 */
export function BrandLockup({ logoHeight }: { logoHeight: number }) {
  const titleSize = Math.round(logoHeight * 0.32);
  const kickerSize = Math.max(7.5, logoHeight * 0.135);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(logoHeight * 0.2) }}>
      <LrhLockup height={logoHeight} />
      <span
        aria-hidden
        style={{
          alignSelf: 'stretch',
          width: 2,
          margin: `${Math.round(logoHeight * 0.08)}px 0`,
          borderRadius: 2,
          background: `linear-gradient(to bottom, ${LRH.red}, ${LRH.gold})`,
        }}
      />
      <span style={{ display: 'inline-flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span
          style={{
            ...mono,
            fontSize: kickerSize,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: LRH.red,
            marginBottom: Math.round(logoHeight * 0.07),
          }}
        >
          Réunion · 974
        </span>
        <span
          style={{
            ...display,
            fontWeight: 800,
            fontSize: titleSize,
            lineHeight: 0.96,
            letterSpacing: '-0.02em',
            color: LRH.navy,
            whiteSpace: 'nowrap',
          }}
        >
          Ligue Régionale
          <br />
          de Hockey
        </span>
      </span>
    </span>
  );
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Structure de navigation — source unique pour desktop (dropdowns) et mobile
// (sections groupées du drawer).
// ─────────────────────────────────────────────────────────────────────────────

type NavChild = { href: string; label: string; desc?: string };
type NavGroup = { label: string; children: NavChild[] };
type NavItem = { type: 'link'; href: string; label: string } | { type: 'group'; label: string; children: NavChild[] };

const NAV_DESKTOP: NavItem[] = [
  { type: 'link', href: '/', label: 'Accueil' },
  {
    type: 'group',
    label: 'Compétitions',
    children: [
      { href: '/competitions', label: 'Calendrier', desc: 'Tous les matchs de la saison, gazon & salle.' },
      { href: '/classements', label: 'Classements', desc: 'Tableau officiel, points et forme récente.' },
      { href: '/jeunes', label: 'Championnat Jeunes', desc: 'Du U11 au U19 — compétitions et détection.' },
    ],
  },
  { type: 'link', href: '/clubs', label: 'Clubs' },
  {
    type: 'group',
    label: "S'engager",
    children: [
      { href: '/licence', label: 'Prendre une licence', desc: 'Trouver le club le plus proche.' },
      { href: '/formation', label: 'Formation fédérale', desc: 'DF1, DF2, DF3 — Académie fédérale.' },
      { href: '/arbitrage', label: 'Arbitrage', desc: 'Corps arbitral, désignations, devenir arbitre.' },
      { href: '/pratique', label: 'Activités diverses', desc: 'Loisir, sport-santé, sport adapté.' },
    ],
  },
  { type: 'link', href: '/actualites', label: 'Actualités' },
  { type: 'link', href: '/ligue', label: 'La Ligue' },
];

// Sections du drawer mobile : reflète la hiérarchie desktop mais en plat
// (les "groupes" desktop deviennent des sections avec un kicker mono).
type MobileSection = { kicker: string; items: { href: string; label: string }[] };
const MOBILE_SECTIONS: MobileSection[] = [
  {
    kicker: '01 · ESSENTIEL',
    items: [
      { href: '/', label: 'Accueil' },
      { href: '/actualites', label: 'Actualités' },
    ],
  },
  {
    kicker: '02 · COMPÉTITIONS',
    items: [
      { href: '/competitions', label: 'Calendrier' },
      { href: '/classements', label: 'Classements' },
      { href: '/jeunes', label: 'Championnat Jeunes' },
    ],
  },
  {
    kicker: "03 · S'ENGAGER",
    items: [
      { href: '/clubs', label: 'Annuaire des clubs' },
      { href: '/licence', label: 'Prendre une licence' },
      { href: '/formation', label: 'Formation fédérale' },
      { href: '/arbitrage', label: 'Arbitrage' },
      { href: '/pratique', label: 'Activités diverses' },
    ],
  },
  {
    kicker: '04 · INSTITUTION',
    items: [{ href: '/ligue', label: 'La Ligue' }],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown desktop — apparition au hover/focus, fermeture click-outside / Escape.
// ─────────────────────────────────────────────────────────────────────────────

function NavGroupTrigger({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = group.children.some((c) => pathname.startsWith(c.href));

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Petit délai de fermeture pour permettre de glisser le curseur vers le panneau
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          ...body,
          fontSize: 13,
          fontWeight: 600,
          color: isActive ? LRH.navy : LRH.ink2,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 0',
          letterSpacing: '0.01em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          position: 'relative',
        }}
      >
        {group.label}
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `4px solid ${isActive ? LRH.red : LRH.mute}`,
            transition: 'transform 0.18s',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
        {isActive && (
          <span
            style={{
              position: 'absolute',
              left: 0,
              right: 14,
              bottom: 0,
              height: 2,
              background: LRH.red,
            }}
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: -16,
            minWidth: 320,
            background: '#fff',
            border: '1px solid ' + LRH.hairStrong,
            borderTop: `3px solid ${LRH.red}`,
            boxShadow: '0 18px 40px rgba(0,0,0,0.12)',
            zIndex: 50,
            padding: '8px 0',
            animation: 'lrh-fade-down 0.16s ease-out',
          }}
        >
          <span
            style={{
              ...mono,
              fontSize: 9.5,
              color: LRH.mute,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 700,
              padding: '6px 18px 8px',
              display: 'block',
            }}
          >
            ◉ {group.label}
          </span>
          {group.children.map((c) => {
            const active = pathname.startsWith(c.href);
            return (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  padding: '10px 18px',
                  textDecoration: 'none',
                  borderLeft: `3px solid ${active ? LRH.red : 'transparent'}`,
                  background: active ? LRH.paperWarm : 'transparent',
                }}
              >
                <span
                  style={{
                    ...body,
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: active ? LRH.navy : LRH.ink,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {c.label}
                </span>
                {c.desc && (
                  <span
                    style={{
                      ...body,
                      fontSize: 11.5,
                      color: LRH.mute,
                      lineHeight: 1.45,
                    }}
                  >
                    {c.desc}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
      <style jsx>{`
        @keyframes lrh-fade-down {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export function HeaderDesktop({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const pathname = usePathname() ?? '/';
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
        <BrandLockup logoHeight={64} />
        <SeasonToggle mode={mode} setMode={setMode} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/licence" style={{ textDecoration: 'none' }}>
            <CTAButton variant="red">Prendre une licence</CTAButton>
          </Link>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'clamp(18px, 2.4vw, 36px)', padding: '0 clamp(20px, 4.5vw, 64px) 14px', alignItems: 'center', flexWrap: 'wrap' }}>
        {NAV_DESKTOP.map((item) => {
          if (item.type === 'link') {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <NavLink key={item.href} href={item.href} active={isActive}>
                {item.label}
              </NavLink>
            );
          }
          return <NavGroupTrigger key={item.label} group={item} pathname={pathname} />;
        })}
        <div style={{ flex: 1 }} />
        <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.1em' }}>
          SAISON {mode === 'gazon' ? '2025–2026' : 'INDOOR 2025–2026'}
        </div>
      </div>
    </div>
  );
}

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
          <BrandLockup logoHeight={40} />
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
          <BrandLockup logoHeight={32} />
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

        {/* Sections nav groupées */}
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {MOBILE_SECTIONS.map((section) => (
            <div key={section.kicker} style={{ borderBottom: '1px solid ' + LRH.hair }}>
              <div
                style={{
                  ...mono,
                  fontSize: 10,
                  color: LRH.red,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  padding: '14px 18px 6px',
                  background: LRH.paperWarm,
                }}
              >
                {section.kicker}
              </div>
              {section.items.map((l) => {
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
                      gap: 12,
                      padding: '13px 18px 13px 22px',
                      textDecoration: 'none',
                      borderLeft: `3px solid ${isActive ? LRH.red : 'transparent'}`,
                      background: isActive ? LRH.paperWarm : '#fff',
                    }}
                  >
                    <span
                      style={{
                        ...body,
                        fontSize: 14.5,
                        fontWeight: isActive ? 700 : 600,
                        color: isActive ? LRH.navy : LRH.ink,
                        flex: 1,
                      }}
                    >
                      {l.label}
                    </span>
                    {isActive && (
                      <span style={{ width: 16, height: 2, background: LRH.red }} />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
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
