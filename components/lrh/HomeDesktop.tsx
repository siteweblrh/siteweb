'use client';

import React from 'react';
import {
  LRH, mono, display, body, heroPlaceholderStyle, LrhLockup,
  ClubCrest, ImageSlot, clubName, CTAButton, Card, CardHeader, CardHeaderDark, Stat
} from './tokens';

function NavLink({ children, active = false, white = false }: { children: React.ReactNode, active?: boolean, white?: boolean }) {
  return (
    <div style={{
      ...body, fontSize: 13, fontWeight: 600,
      color: active ? (white ? '#fff' : LRH.navy) : (white ? 'rgba(255,255,255,0.7)' : LRH.ink2),
      cursor: 'pointer', position: 'relative', padding: '6px 0',
      letterSpacing: '0.01em',
    }}>
      {children}
      {active && <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: 2, background: LRH.red,
      }} />}
    </div>
  );
}

function SeasonToggle({ mode, setMode, size = 'md' }: { mode: 'gazon' | 'salle', setMode: (m: 'gazon' | 'salle') => void, size?: 'md' | 'lg' }) {
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

// ── HEADER ─────────────────────────────────────────────────────
function DesktopHeader({ mode, setMode }: { mode: 'gazon' | 'salle', setMode: (m: 'gazon' | 'salle') => void }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid ' + LRH.hair }}>
      {/* Top utility strip */}
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
      {/* Main row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 64px', gap: 32,
      }}>
        <LrhLockup height={42} />
        <SeasonToggle mode={mode} setMode={setMode} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ ...body, fontSize: 12.5, color: LRH.ink2, fontWeight: 600, cursor: 'pointer' }}>Se connecter</div>
          <CTAButton variant="red">Prendre une licence</CTAButton>
        </div>
      </div>
      {/* Secondary nav */}
      <div style={{
        display: 'flex', gap: 32, padding: '0 64px 14px', alignItems: 'center',
      }}>
        <NavLink active>Actualités</NavLink>
        <NavLink>Compétitions</NavLink>
        <NavLink>Classements</NavLink>
        <NavLink>Clubs</NavLink>
        <NavLink>Équipes de la Réunion</NavLink>
        <NavLink>Arbitrage</NavLink>
        <NavLink>La Ligue</NavLink>
        <div style={{ flex: 1 }} />
        <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.1em' }}>SAISON {mode === 'gazon' ? '2025–2026' : 'INDOOR 2026'}</div>
      </div>
    </div>
  );
}

// ── HERO ──────────────────────────────────────────────────────
function DesktopHero({ mode }: { mode: 'gazon' | 'salle' }) {
  const headline = mode === 'gazon' ? 'LE HOCKEY PEÏ,\nNIVEAU SUPÉRIEUR.' : 'LA SALLE\nÉLECTRIQUE.';
  return (
    <div style={{ padding: '32px 64px 0' }}>
      <div style={{
        position: 'relative', height: 640, borderRadius: 24, overflow: 'hidden',
        ...heroPlaceholderStyle({ tone: mode }),
      }}>
        {/* placeholder corner tag */}
        <div style={{
          position: 'absolute', top: 20, left: 24,
          ...mono, fontSize: 10.5, color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          [&nbsp;HD&nbsp;VIDEO&nbsp;·&nbsp;{mode === 'gazon' ? 'STADE MANÈS · LE PORT' : 'GYMNASE CASABONA · LE TAMPON'}&nbsp;] — drop a 16:9 still or loop here
        </div>
        <div style={{
          position: 'absolute', top: 20, right: 24,
          display: 'flex', gap: 10, alignItems: 'center',
          ...mono, fontSize: 10.5, color: 'rgba(255,255,255,0.7)',
          letterSpacing: '0.12em',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: LRH.red,
            boxShadow: '0 0 0 4px rgba(168,32,47,0.25)',
          }} />
          LIVE
        </div>

        {/* Big headline — bottom left */}
        <div style={{
          position: 'absolute', left: 40, bottom: 40, right: 40,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32,
        }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.gold,
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14,
            }}>
              ● Saison {mode === 'gazon' ? 'Gazon 2025–2026' : 'Indoor 2026'} — Journée 14
            </div>
            <h1 style={{
              ...display, fontWeight: 800, fontSize: 88,
              lineHeight: 0.95, color: '#fff', margin: 0,
              letterSpacing: '-0.03em', whiteSpace: 'pre-line',
              textShadow: '0 2px 30px rgba(0,0,0,0.3)',
            }}>{headline}</h1>
            <div style={{
              marginTop: 24, ...body, fontSize: 15, color: 'rgba(255,255,255,0.78)',
              maxWidth: 480, lineHeight: 1.55,
            }}>
              Suivez les matchs, classements et licences de la Ligue Réunionnaise de Hockey en temps réel — gazon &amp; salle, du Port au Tampon, partout dans l'île.
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <CTAButton variant="gold" size="lg">Voir le live</CTAButton>
              <CTAButton variant="ghost" size="lg" >
                <span style={{ color: '#fff' }}>Calendrier complet</span>
              </CTAButton>
            </div>
          </div>

          {/* Glass score widget */}
          <MatchChocGlass mode={mode} />
        </div>

        {/* Bottom strip — partners ticker */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '0 40px', height: 0,
        }} />
      </div>
    </div>
  );
}

function MatchChocGlass({ mode }: { mode: 'gazon' | 'salle' }) {
  return (
    <div style={{
      width: 380, padding: 22,
      background: 'rgba(15,25,45,0.42)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.14)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
      color: '#fff',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        ...mono, fontSize: 10, letterSpacing: '0.18em',
        color: LRH.gold, textTransform: 'uppercase', marginBottom: 14,
      }}>
        <span>★ Match Choc · J14</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>{mode === 'gazon' ? 'DIM 14:00' : 'SAM 19:30'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ClubCrest id="USPG" size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: 15 }}>USPG Le Port</div>
          <div style={{ ...mono, fontSize: 10, opacity: 0.55, letterSpacing: '0.06em' }}>Domicile · 5V 1N 2D</div>
        </div>
        <div style={{ ...display, fontWeight: 800, fontSize: 38, lineHeight: 1, letterSpacing: '-0.04em' }}>
          3
        </div>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '14px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ClubCrest id="SDHC" size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: 15 }}>Saint-Denis HC</div>
          <div style={{ ...mono, fontSize: 10, opacity: 0.55, letterSpacing: '0.06em' }}>Visiteur · 7V 1N 1D</div>
        </div>
        <div style={{ ...display, fontWeight: 800, fontSize: 38, lineHeight: 1, letterSpacing: '-0.04em', color: LRH.gold }}>
          4
        </div>
      </div>
      <div style={{
        marginTop: 16, padding: '10px 12px', borderRadius: 10,
        background: 'rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ ...mono, fontSize: 10, opacity: 0.7, letterSpacing: '0.08em' }}>
          MI-TEMPS — TERMINÉ
        </div>
        <div style={{ ...body, fontSize: 12, fontWeight: 700, color: LRH.gold, display: 'flex', alignItems: 'center', gap: 6 }}>
          Feuille de match <span style={{ ...mono, fontSize: 11 }}>→</span>
        </div>
      </div>
    </div>
  );
}

// ── BENTO GRID ─────────────────────────────────────────────────
function BentoSection({ mode }: { mode: 'gazon' | 'salle' }) {
  return (
    <div style={{ padding: '64px 64px 32px' }}>
      <SectionHeading kicker="01 · La semaine" title="Résultats, classement &amp; figures fortes" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1.1fr',
        gap: 20, marginTop: 28,
      }}>
        <LastResultCard mode={mode} />
        <StandingsCard mode={mode} />
        <PlayerOfMonthCard />
      </div>
    </div>
  );
}

function SectionHeading({ kicker, title, action }: { kicker: string, title: string, action?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
      <div>
        <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
          {kicker}
        </div>
        <h2 dangerouslySetInnerHTML={{ __html: title }} style={{
          ...display, fontWeight: 700, fontSize: 44,
          lineHeight: 1.05, color: LRH.navy, margin: 0,
          letterSpacing: '-0.03em', maxWidth: 720,
        }} />
      </div>
      {action && <div style={{ ...body, fontSize: 13, fontWeight: 700, color: LRH.navy, cursor: 'pointer' }}>
        {action} <span style={{ ...mono, fontSize: 12 }}>→</span>
      </div>}
    </div>
  );
}

function LastResultCard({ mode }: { mode: 'gazon' | 'salle' }) {
  return (
    <Card>
      <CardHeader kicker="Dernier résultat" meta={mode === 'gazon' ? 'J13 · Stade de la Palmeraie' : 'J6 · Champ-Fleuri'} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 28 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
          <ClubCrest id="HCO" size={56} />
          <div>
            <div style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy }}>HC de l'Ouest</div>
            <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.06em' }}>3<sup>e</sup> · 20 PTS</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, ...display, fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', color: LRH.navy, lineHeight: 1 }}>
          <span>2</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: LRH.mute, ...mono, letterSpacing: '0.06em' }}>—</span>
          <span style={{ color: LRH.red }}>5</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse', textAlign: 'right' }}>
          <ClubCrest id="HHS" size={56} />
          <div>
            <div style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy }}>Hockey Horizon Sud</div>
            <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.06em' }}>2<sup>e</sup> · 22 PTS</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28, padding: '14px 16px', background: LRH.paperWarm, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>0'</span>
        <div style={{ flex: 1, height: 6, background: '#fff', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
          {[12, 28, 41, 55, 67, 78, 84].map((m, i) => (
            <div key={i} style={{
              position: 'absolute', left: (m / 90 * 100) + '%', top: -2,
              width: 3, height: 10, background: i === 0 ? LRH.navy : (i % 2 ? LRH.red : LRH.navy),
            }} />
          ))}
        </div>
        <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>90'</span>
      </div>

      <div style={{
        marginTop: 16, paddingTop: 14, borderTop: '1px dashed ' + LRH.hairStrong,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Présenté par
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            padding: '4px 10px', borderRadius: 4, background: LRH.navy, color: LRH.gold,
            ...display, fontWeight: 800, fontSize: 11, letterSpacing: '0.04em',
          }}>RUN MARKET</div>
          <span style={{ ...body, fontSize: 11, color: LRH.ink2, fontWeight: 600 }}>
            Sponsor officiel de la D1
          </span>
        </div>
      </div>
    </Card>
  );
}

function StandingsCard({ mode }: { mode: 'gazon' | 'salle' }) {
  const rows = mode === 'gazon' ? [
    { rank: 1, club: 'Saint-Denis HC',     id: 'SDHC', pts: 28, gd: '+14' },
    { rank: 2, club: 'Hockey Horizon Sud', id: 'HHS',  pts: 22, gd: '+9' },
    { rank: 3, club: "HC de l'Ouest",      id: 'HCO',  pts: 20, gd: '+6' },
  ] : [
    { rank: 1, club: 'Saint-Denis HC',     id: 'SDHC', pts: 18, gd: '+11' },
    { rank: 2, club: 'USPG Le Port',       id: 'USPG', pts: 15, gd: '+7' },
    { rank: 3, club: 'HC La Possession',   id: 'HCP',  pts: 13, gd: '+4' },
  ];
  return (
    <Card dark>
      <CardHeaderDark kicker="Top 3 Classement" meta={mode === 'gazon' ? 'D1 GAZON' : 'D1 SALLE'} />
      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((r) => (
          <div key={r.rank} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              ...display, fontWeight: 800, fontSize: 28, color: r.rank === 1 ? LRH.gold : 'rgba(255,255,255,0.85)',
              minWidth: 30, letterSpacing: '-0.03em',
            }}>{r.rank.toString().padStart(2, '0')}</div>
            <ClubCrest id={r.id} size={36} />
            <div style={{ flex: 1, ...display, fontWeight: 600, fontSize: 14 }}>{r.club}</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...display, fontWeight: 700, fontSize: 18 }}>{r.pts}</div>
              <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>{r.gd}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, padding: '12px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...body, fontSize: 12, fontWeight: 600, color: LRH.gold }}>Classement complet (8 clubs)</div>
        <span style={{ ...mono, fontSize: 12, color: LRH.gold }}>→</span>
      </div>
    </Card>
  );
}

function PlayerOfMonthCard() {
  return (
    <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: 220 }}>
        <ImageSlot label="Portrait — Loïc Payet, milieu offensif USPG" height={220} tone="navy" radius={0} />
        <div style={{
          position: 'absolute', top: 16, left: 16,
          padding: '6px 10px', borderRadius: 999,
          background: 'rgba(255,255,255,0.92)',
          display: 'flex', alignItems: 'center', gap: 8,
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            présenté par
          </span>
          <span style={{ ...display, fontWeight: 800, fontSize: 11, color: LRH.navy, letterSpacing: '0.04em' }}>
            CRÉDIT&nbsp;PEÏ
          </span>
        </div>
        <div style={{
          position: 'absolute', top: 16, right: 16,
          padding: '6px 10px', borderRadius: 4,
          background: LRH.gold, color: LRH.navy,
          ...display, fontWeight: 800, fontSize: 10, letterSpacing: '0.1em',
        }}>★ MVP</div>
      </div>
      <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...mono, fontSize: 10.5, color: LRH.red, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
          Joueur du mois
        </div>
        <h3 style={{ ...display, fontWeight: 700, fontSize: 28, color: LRH.navy, margin: '10px 0 4px', letterSpacing: '-0.02em', lineHeight: 1 }}>
          Loïc Payet
        </h3>
        <div style={{ ...body, fontSize: 13, color: LRH.mute }}>
          USPG Le Port · #11 · Milieu
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 16, borderTop: '1px solid ' + LRH.hair }}>
          <Stat n="9" l="Buts" />
          <Stat n="6" l="Passes" />
          <Stat n="2.4" l="xG/match" />
        </div>
      </div>
    </Card>
  );
}

// ── NEWS ──────────────────────────────────────────────────────
function NewsSection({ mode }: { mode: 'gazon' | 'salle' }) {
  const items = [
    { tag: 'Reportage', kicker: '03 min', title: 'Au cœur de la 7<sup>ème</sup> nuit du hockey péï', desc: 'Trois cents licenciés réunis à Saint-Paul pour célébrer une saison Gazon qui défie les pronostics.', tone: 'sun' as const, sponsor: null, big: true },
    { tag: 'Tactique',  kicker: '06 min', title: 'Pourquoi le pressing haut de Tampon casse les défenses du Nord', desc: 'Décryptage du système 1-4-3 qui a propulsé les rouges en tête.', tone: 'turf' as const, sponsor: 'OUEST TV' },
    { tag: 'Formation', kicker: '04 min', title: 'Nouvelle académie U15 — les inscriptions sont ouvertes', desc: '24 places, 4 sites, gratuité pour les licenciés.', tone: 'paper' as const, sponsor: null },
  ];
  return (
    <div style={{ padding: '32px 64px 80px', background: LRH.paper }}>
      <SectionHeading kicker="02 · L'actualité" title="Le terrain raconte<br/>plus que le score." action="Toute l'actualité" />
      <div style={{
        display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr',
        gap: 20, marginTop: 32,
      }}>
        {items.map((it, i) => <NewsCard key={i} {...it} />)}
      </div>
    </div>
  );
}

function NewsCard({ tag, kicker, title, desc, tone, sponsor, big }: { tag: string, kicker: string, title: string, desc: string, tone: 'sun' | 'turf' | 'indoor' | 'paper' | 'navy', sponsor: string | null, big?: boolean }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <ImageSlot label={`Editorial photo — ${tag}`} height={big ? 320 : 200} tone={tone} radius={0} />
      <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{
            padding: '4px 10px', borderRadius: 4, background: LRH.navy, color: '#fff',
            ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
          }}>{tag}</div>
          <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.08em' }}>● {kicker} de lecture</div>
        </div>
        <h3 dangerouslySetInnerHTML={{ __html: title }} style={{
          ...display, fontWeight: 700, fontSize: big ? 32 : 22, color: LRH.navy,
          margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1, textWrap: 'balance',
        }} />
        <div style={{ ...body, fontSize: 13.5, color: LRH.ink2, marginTop: 12, lineHeight: 1.55 }}>{desc}</div>
        <div style={{ flex: 1 }} />
        {sponsor && (
          <div style={{
            marginTop: 20, paddingTop: 14, borderTop: '1px dashed ' + LRH.hairStrong,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Partenaire de la rubrique
            </span>
            <span style={{ ...display, fontWeight: 800, fontSize: 12, color: LRH.navy, letterSpacing: '0.04em' }}>
              {sponsor}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── COMPETITIONS STRIP ─────────────────────────────────────────
function CompetitionsStrip({ mode }: { mode: 'gazon' | 'salle' }) {
  return (
    <div style={{ padding: '48px 64px', background: LRH.navy, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div style={{ ...mono, fontSize: 11, color: LRH.gold, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
            03 · Calendrier
          </div>
          <h2 style={{ ...display, fontWeight: 700, fontSize: 40, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            Les prochaines journées.
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ChipDark active>D1 {mode === 'gazon' ? 'Gazon' : 'Salle'}</ChipDark>
          <ChipDark>D2</ChipDark>
          <ChipDark>U18</ChipDark>
          <ChipDark>Féminines</ChipDark>
          <ChipDark>Coupe</ChipDark>
        </div>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
      }}>
        {[
          { d: 'SAM 21', h: '15:00', home: 'USPG', away: 'SDHC', venue: 'Stade Manès · Le Port' },
          { d: 'SAM 21', h: '17:30', home: 'HHS',  away: 'HCO',  venue: 'Casabona · Le Tampon' },
          { d: 'DIM 22', h: '10:00', home: 'HCP',  away: 'SDHC', venue: 'Stade du Ravine à Malheur · La Possession' },
          { d: 'DIM 22', h: '14:00', home: 'HCO',  away: 'USPG', venue: 'Stade de la Palmeraie · Saint-Paul' },
        ].map((m, i) => (
          <div key={i} style={{
            padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 10.5, color: LRH.gold, letterSpacing: '0.12em', marginBottom: 16 }}>
              <span>{m.d}</span><span>{m.h}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <ClubCrest id={m.home} size={32} />
              <span style={{ ...display, fontSize: 14, fontWeight: 600 }}>{clubName(m.home)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ClubCrest id={m.away} size={32} />
              <span style={{ ...display, fontSize: 14, fontWeight: 600 }}>{clubName(m.away)}</span>
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', ...mono, fontSize: 9.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {m.venue}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChipDark({ children, active = false }: { children: React.ReactNode, active?: boolean }) {
  return (
    <div style={{
      padding: '8px 14px', borderRadius: 999,
      background: active ? LRH.gold : 'rgba(255,255,255,0.06)',
      color: active ? LRH.navy : 'rgba(255,255,255,0.78)',
      ...body, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
      border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
      cursor: 'pointer',
    }}>{children}</div>
  );
}

// ── FOOTER ────────────────────────────────────────────────────
function DesktopFooter() {
  return (
    <div style={{ background: LRH.navyDeep, color: 'rgba(255,255,255,0.7)', padding: '56px 64px 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 40 }}>
        <div>
          <LrhLockup height={42} white />
          <p style={{ ...body, fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)', marginTop: 18, maxWidth: 280 }}>
            La fédération du hockey sur gazon et en salle à La Réunion. Affiliée à la FFH.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            {['IG', 'FB', 'YT', 'TT'].map((s) => (
              <div key={s} style={{
                width: 32, height: 32, borderRadius: 6,
                background: 'rgba(255,255,255,0.06)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
              }}>{s}</div>
            ))}
          </div>
        </div>
        {[
          { t: 'Compétitions', l: ['D1 Gazon', 'D1 Salle', 'Coupe de la Réunion', 'Tournois U18', 'Féminines'] },
          { t: 'Pratiquer',    l: ['Trouver un club', 'Prendre une licence', 'Hockey scolaire', 'Para-hockey'] },
          { t: 'La Ligue',     l: ['Bureau', 'Commissions', 'Arbitrage', 'Documents officiels'] },
          { t: 'Partenaires',  l: ['Région Réunion', 'Crédit Peï', 'Run Market', 'Ouest TV'] },
        ].map((col) => (
          <div key={col.t}>
            <div style={{ ...mono, fontSize: 10, color: LRH.gold, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>
              {col.t}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.l.map((i) => <div key={i} style={{ ...body, fontSize: 13, fontWeight: 500 }}>{i}</div>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 48, paddingTop: 22, borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        ...mono, fontSize: 10.5, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)',
      }}>
        <div>© 2026 LIGUE RÉUNIONNAISE DE HOCKEY · SIRET 000 000 000</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <span>Mentions légales</span>
          <span>RGPD</span>
          <span>Plan du site</span>
        </div>
      </div>
    </div>
  );
}

// ── ASSEMBLY ───────────────────────────────────────────────────
export function HomeDesktop({ mode, setMode }: { mode: 'gazon' | 'salle', setMode: (m: 'gazon' | 'salle') => void }) {
  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink }}>
      <DesktopHeader mode={mode} setMode={setMode} />
      <DesktopHero mode={mode} />
      <BentoSection mode={mode} />
      <CompetitionsStrip mode={mode} />
      <NewsSection mode={mode} />
      <DesktopFooter />
    </div>
  );
}
