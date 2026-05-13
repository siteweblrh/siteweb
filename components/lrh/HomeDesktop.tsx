'use client';

import React from 'react';
import Link from 'next/link';
import {
  LRH, mono, display, body, heroPlaceholderStyle, LrhLockup,
  ClubCrest, ImageSlot, clubName, CTAButton, Card, CardHeader, CardHeaderDark, Stat
} from './tokens';
import { getCategoryMeta } from '@/lib/blog/categories';
import { generateExcerpt, getReadingTimeMinutes } from '@/lib/utils/excerpt';
import type { HomeNewsItem, ModeData } from '@/lib/queries/home';
import { formatMatchDay, formatMatchTime, formatStatus } from '@/lib/utils/match-format';

const CATEGORY_TONE: Record<string, 'sun' | 'turf' | 'indoor' | 'paper' | 'navy'> = {
  ACTUALITE: 'sun',
  RESULTAT: 'turf',
  EVENEMENT: 'indoor',
  COMMUNIQUE: 'paper',
};

function NavLink({ children, href, active = false, white = false }: { children: React.ReactNode, href?: string, active?: boolean, white?: boolean }) {
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
      {active && <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: 2, background: LRH.red,
      }} />}
    </>
  );
  return href ? (
    <Link href={href} style={style}>{inner}</Link>
  ) : (
    <div style={style}>{inner}</div>
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
        <LrhLockup height={64} />
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
        <NavLink href="/actualites">Actualités</NavLink>
        <NavLink>Compétitions</NavLink>
        <NavLink>Classements</NavLink>
        <NavLink href="/clubs">Clubs</NavLink>
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
function DesktopHero({ mode, featured }: { mode: 'gazon' | 'salle', featured: ModeData['featured'] }) {
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
          {featured && <MatchChocGlass match={featured} />}
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

function MatchChocGlass({ match }: { match: NonNullable<ModeData['featured']> }) {
  const home = match.homeClub;
  const away = match.awayClub;
  const hs = match.homeScore;
  const as = match.awayScore;
  const homeWinning = hs != null && as != null && hs > as;
  const awayWinning = hs != null && as != null && as > hs;
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
        <span>★ Match Choc{match.matchday ? ` · J${match.matchday}` : ''}</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>{formatMatchDay(match.kickoffAt)} {formatMatchTime(match.kickoffAt)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ClubCrest id={home.shortCode ?? undefined} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: 15 }}>{home.name}</div>
          <div style={{ ...mono, fontSize: 10, opacity: 0.55, letterSpacing: '0.06em' }}>Domicile</div>
        </div>
        <div style={{ ...display, fontWeight: 800, fontSize: 38, lineHeight: 1, letterSpacing: '-0.04em', color: homeWinning ? LRH.gold : '#fff' }}>
          {hs ?? '—'}
        </div>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '14px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ClubCrest id={away.shortCode ?? undefined} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: 15 }}>{away.name}</div>
          <div style={{ ...mono, fontSize: 10, opacity: 0.55, letterSpacing: '0.06em' }}>Visiteur</div>
        </div>
        <div style={{ ...display, fontWeight: 800, fontSize: 38, lineHeight: 1, letterSpacing: '-0.04em', color: awayWinning ? LRH.gold : '#fff' }}>
          {as ?? '—'}
        </div>
      </div>
      <div style={{
        marginTop: 16, padding: '10px 12px', borderRadius: 10,
        background: 'rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ ...mono, fontSize: 10, opacity: 0.7, letterSpacing: '0.08em' }}>
          {formatStatus(match.status, hs, as)}
        </div>
        {match.venue && (
          <div style={{ ...mono, fontSize: 10, opacity: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {match.venue.split('·')[0]}
          </div>
        )}
      </div>
    </div>
  );
}

// ── BENTO GRID ─────────────────────────────────────────────────
function BentoSection({ mode, lastResult, standingsTop }: { mode: 'gazon' | 'salle', lastResult: ModeData['lastResult'], standingsTop: ModeData['standingsTop'] }) {
  return (
    <div style={{ padding: '64px 64px 32px' }}>
      <SectionHeading kicker="01 · La semaine" title="Résultats, classement &amp; figures fortes" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1.1fr',
        gap: 20, marginTop: 28,
      }}>
        <LastResultCard mode={mode} match={lastResult} />
        <StandingsCard mode={mode} standingsTop={standingsTop} />
        <PlayerOfMonthCard />
      </div>
    </div>
  );
}

function SectionHeading({ kicker, title, action, actionHref }: { kicker: string, title: string, action?: string, actionHref?: string }) {
  const actionStyle: React.CSSProperties = {
    ...body, fontSize: 13, fontWeight: 700, color: LRH.navy, cursor: 'pointer', textDecoration: 'none',
  };
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
      {action && (
        actionHref ? (
          <Link href={actionHref} style={actionStyle}>
            {action} <span style={{ ...mono, fontSize: 12 }}>→</span>
          </Link>
        ) : (
          <div style={actionStyle}>
            {action} <span style={{ ...mono, fontSize: 12 }}>→</span>
          </div>
        )
      )}
    </div>
  );
}

function LastResultCard({ mode, match }: { mode: 'gazon' | 'salle', match: ModeData['lastResult'] }) {
  if (!match) {
    return (
      <Card>
        <CardHeader kicker="Dernier résultat" meta={mode === 'gazon' ? 'D1 GAZON' : 'D1 SALLE'} />
        <p style={{ ...body, fontSize: 13, color: LRH.mute, marginTop: 20 }}>Aucun résultat à afficher.</p>
      </Card>
    );
  }
  const home = match.homeClub;
  const away = match.awayClub;
  const hs = match.homeScore ?? 0;
  const as = match.awayScore ?? 0;
  const matchDuration = mode === 'gazon' ? 90 : 80;
  return (
    <Card>
      <CardHeader kicker="Dernier résultat" meta={`${match.matchday ? `J${match.matchday}` : ''}${match.venue ? ` · ${match.venue.split('·')[0].trim()}` : ''}`} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 28 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
          <ClubCrest id={home.shortCode ?? undefined} size={56} />
          <div>
            <div style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy }}>{home.name}</div>
            <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.06em' }}>Domicile</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, ...display, fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', color: LRH.navy, lineHeight: 1 }}>
          <span style={{ color: hs > as ? LRH.navy : LRH.mute }}>{hs}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: LRH.mute, ...mono, letterSpacing: '0.06em' }}>—</span>
          <span style={{ color: as > hs ? LRH.red : LRH.mute }}>{as}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse', textAlign: 'right' }}>
          <ClubCrest id={away.shortCode ?? undefined} size={56} />
          <div>
            <div style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy }}>{away.name}</div>
            <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.06em' }}>Visiteur</div>
          </div>
        </div>
      </div>

      {match.goals.length > 0 && (
        <div style={{ marginTop: 28, padding: '14px 16px', background: LRH.paperWarm, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>0'</span>
          <div style={{ flex: 1, height: 6, background: '#fff', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
            {match.goals.map((g, i) => (
              <div key={i} title={`${g.minute}' ${g.scorerName ?? ''}`} style={{
                position: 'absolute', left: (g.minute / matchDuration * 100) + '%', top: -2,
                width: 3, height: 10, background: g.scoringClubId === home.id ? LRH.navy : LRH.red,
              }} />
            ))}
          </div>
          <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>{matchDuration}'</span>
        </div>
      )}

      {match.sponsor && (
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
            }}>{match.sponsor.name.toUpperCase()}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

function StandingsCard({ mode, standingsTop }: { mode: 'gazon' | 'salle', standingsTop: ModeData['standingsTop'] }) {
  return (
    <Card dark>
      <CardHeaderDark kicker="Top 3 Classement" meta={mode === 'gazon' ? 'D1 GAZON' : 'D1 SALLE'} />
      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {standingsTop.length === 0 ? (
          <div style={{ ...body, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Aucun classement.</div>
        ) : standingsTop.map((s) => {
          const gd = s.goalsFor - s.goalsAgainst;
          const gdLabel = (gd > 0 ? '+' : '') + gd;
          return (
            <div key={s.club.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                ...display, fontWeight: 800, fontSize: 28, color: s.rank === 1 ? LRH.gold : 'rgba(255,255,255,0.85)',
                minWidth: 30, letterSpacing: '-0.03em',
              }}>{s.rank.toString().padStart(2, '0')}</div>
              <ClubCrest id={s.club.shortCode ?? undefined} size={36} />
              <div style={{ flex: 1, ...display, fontWeight: 600, fontSize: 14 }}>{s.club.name}</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...display, fontWeight: 700, fontSize: 18 }}>{s.points}</div>
                <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>{gdLabel}</div>
              </div>
            </div>
          );
        })}
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
function NewsSection({ news }: { news: HomeNewsItem[] }) {
  if (news.length === 0) {
    return (
      <div style={{ padding: '32px 64px 80px', background: LRH.paper }}>
        <SectionHeading kicker="02 · L'actualité" title="Le terrain raconte<br/>plus que le score." action="Toute l'actualité" actionHref="/actualites" />
        <div style={{ marginTop: 32, padding: 48, textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px solid ' + LRH.hair }}>
          <p style={{ ...body, fontSize: 14, color: LRH.mute, margin: 0 }}>Aucune actualité publiée pour le moment.</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: '32px 64px 80px', background: LRH.paper }}>
      <SectionHeading kicker="02 · L'actualité" title="Le terrain raconte<br/>plus que le score." action="Toute l'actualité" actionHref="/actualites" />
      <div style={{
        display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr',
        gap: 20, marginTop: 32,
      }}>
        {news.map((item, i) => <NewsCard key={item.id} item={item} big={i === 0} />)}
      </div>
    </div>
  );
}

function NewsCard({ item, big }: { item: HomeNewsItem, big?: boolean }) {
  const cat = getCategoryMeta(item.category);
  const tone = CATEGORY_TONE[item.category] ?? 'sun';
  const excerpt = item.excerpt ?? generateExcerpt(item.content, big ? 180 : 110);
  const minutes = getReadingTimeMinutes(item.content);
  return (
    <Link href={`/actualites/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
        {item.coverImage ? (
          <div style={{ height: big ? 320 : 200, background: `url(${item.coverImage}) center / cover no-repeat` }} />
        ) : (
          <ImageSlot label={`${cat.label}`} height={big ? 320 : 200} tone={tone} radius={0} />
        )}
        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{
              padding: '4px 10px', borderRadius: 4, background: cat.bg, color: cat.fg,
              ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
            }}>{cat.label}</div>
            <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.08em' }}>● {minutes.toString().padStart(2, '0')} min de lecture</div>
          </div>
          <h3 style={{
            ...display, fontWeight: 700, fontSize: big ? 32 : 22, color: LRH.navy,
            margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1, textWrap: 'balance',
          }}>{item.title}</h3>
          <div style={{ ...body, fontSize: 13.5, color: LRH.ink2, marginTop: 12, lineHeight: 1.55 }}>{excerpt}</div>
          <div style={{ flex: 1 }} />
          {item.club && (
            <div style={{
              marginTop: 20, paddingTop: 14, borderTop: '1px dashed ' + LRH.hairStrong,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Publié par
              </span>
              <span style={{ ...display, fontWeight: 800, fontSize: 12, color: LRH.navy, letterSpacing: '0.04em' }}>
                {item.club.name}
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

// ── COMPETITIONS STRIP ─────────────────────────────────────────
function CompetitionsStrip({ mode, upcoming }: { mode: 'gazon' | 'salle', upcoming: ModeData['upcoming'] }) {
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
      {upcoming.length === 0 ? (
        <div style={{ padding: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
          <p style={{ ...body, fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Aucun match programmé pour le moment.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
        }}>
          {upcoming.map((m) => (
            <div key={m.id} style={{
              padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 10.5, color: LRH.gold, letterSpacing: '0.12em', marginBottom: 16 }}>
                <span>{formatMatchDay(m.kickoffAt)}</span><span>{formatMatchTime(m.kickoffAt)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <ClubCrest id={m.homeClub.shortCode ?? undefined} size={32} />
                <span style={{ ...display, fontSize: 14, fontWeight: 600 }}>{m.homeClub.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ClubCrest id={m.awayClub.shortCode ?? undefined} size={32} />
                <span style={{ ...display, fontSize: 14, fontWeight: 600 }}>{m.awayClub.name}</span>
              </div>
              {m.venue && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', ...mono, fontSize: 9.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {m.venue}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
export function HomeDesktop({ mode, setMode, news, modeData }: { mode: 'gazon' | 'salle', setMode: (m: 'gazon' | 'salle') => void, news: HomeNewsItem[], modeData: ModeData }) {
  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink }}>
      <DesktopHeader mode={mode} setMode={setMode} />
      <DesktopHero mode={mode} featured={modeData.featured} />
      <BentoSection mode={mode} lastResult={modeData.lastResult} standingsTop={modeData.standingsTop} />
      <CompetitionsStrip mode={mode} upcoming={modeData.upcoming} />
      <NewsSection news={news} />
      <DesktopFooter />
    </div>
  );
}
