'use client';

import React from 'react';
import Link from 'next/link';
import {
  LRH, mono, display, body, heroPlaceholderStyle, ClubCrest, CTAButton,
} from '../tokens';
import type { ModeData } from '@/lib/queries/home';
import { formatMatchDay, formatMatchTime, formatStatus } from '@/lib/utils/match-format';
import { optimizeImageUrl } from '@/lib/utils/image-url';
import type { Mode } from './Header';

// Le MatchChocGlass affiche soit le featured (avec goals), soit un upcoming
// (sans goals). Les champs réellement consommés (homeClub, awayClub, scores,
// kickoff, matchday, status, venue) sont présents dans les deux types, donc
// on accepte l'union.
type Featured =
  | NonNullable<ModeData['featured']>
  | ModeData['upcoming'][number];

export function MatchChocGlass({
  match,
  size = 'lg',
  kicker,
}: {
  match: Featured;
  size?: 'lg' | 'sm';
  kicker?: string;
}) {
  const home = match.homeClub;
  const away = match.awayClub;
  const hs = match.homeScore;
  const as = match.awayScore;
  const homeWinning = hs != null && as != null && hs > as;
  const awayWinning = hs != null && as != null && as > hs;
  const isLg = size === 'lg';
  const crestSize = isLg ? 48 : 32;
  const nameFs = isLg ? 15 : 13;
  const scoreFs = isLg ? 38 : 26;
  const padding = isLg ? 22 : 16;

  return (
    <div style={{
      width: isLg ? 380 : '100%', padding,
      background: 'rgba(15,25,45,0.42)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      borderRadius: isLg ? 20 : 16,
      border: '1px solid rgba(255,255,255,0.14)',
      boxShadow: isLg ? '0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
      color: '#fff',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        ...mono, fontSize: isLg ? 10 : 9, letterSpacing: isLg ? '0.18em' : '0.16em',
        color: LRH.gold, textTransform: 'uppercase', marginBottom: isLg ? 14 : 12,
      }}>
        <span>{kicker ? `▸ ${kicker}` : '★ Match Choc'}{match.matchday ? ` · J${match.matchday}` : ''}</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>
          {formatMatchDay(match.kickoffAt)} {formatMatchTime(match.kickoffAt)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: isLg ? 14 : 10 }}>
        <ClubCrest id={home.shortCode ?? undefined} size={crestSize} />
        <div style={{ flex: 1 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: nameFs }}>{home.name}</div>
          {isLg && <div style={{ ...mono, fontSize: 10, opacity: 0.55, letterSpacing: '0.06em' }}>Domicile</div>}
        </div>
        <div style={{
          ...display, fontWeight: 800, fontSize: scoreFs, lineHeight: 1, letterSpacing: '-0.04em',
          color: homeWinning ? LRH.gold : '#fff',
        }}>
          {hs ?? '—'}
        </div>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: isLg ? '14px 0' : '10px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: isLg ? 14 : 10 }}>
        <ClubCrest id={away.shortCode ?? undefined} size={crestSize} />
        <div style={{ flex: 1 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: nameFs }}>{away.name}</div>
          {isLg && <div style={{ ...mono, fontSize: 10, opacity: 0.55, letterSpacing: '0.06em' }}>Visiteur</div>}
        </div>
        <div style={{
          ...display, fontWeight: 800, fontSize: scoreFs, lineHeight: 1, letterSpacing: '-0.04em',
          color: awayWinning ? LRH.gold : '#fff',
        }}>
          {as ?? '—'}
        </div>
      </div>
      {isLg && (
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
      )}
    </div>
  );
}

/** Si une URL d'image est fournie, retourne un fond image avec overlay
 *  sombre (lisibilité du texte blanc). Sinon, retourne le gradient procédural.
 *
 *  Pour Cloudinary on injecte `f_auto,q_auto,w_*` afin de servir AVIF/WebP
 *  redimensionnés — gros gain LCP sur l'image hero. `width` est passé selon
 *  le breakpoint pour éviter de télécharger une image desktop sur mobile. */
function heroBackground(mode: Mode, imageUrl?: string, width = 1600): React.CSSProperties {
  if (imageUrl && imageUrl.length > 0) {
    const optimized = optimizeImageUrl(imageUrl, width);
    return {
      backgroundColor: '#0e1a25',
      backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.62)), url(${optimized})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return heroPlaceholderStyle({ tone: mode });
}

export function HeroDesktop({
  mode,
  modeData,
  season,
  headline,
  subtitle,
  backgroundImage,
}: {
  mode: Mode;
  modeData: ModeData;
  season?: string | null;
  headline?: string;
  subtitle?: string;
  backgroundImage?: string;
}) {
  const resolvedHeadline =
    headline ?? (mode === 'gazon' ? 'LE HOCKEY PEÏ,\nNIVEAU SUPÉRIEUR.' : 'LA SALLE\nÉLECTRIQUE.');
  const resolvedSubtitle =
    subtitle ??
    "Suivez les matchs, classements et licences de la Ligue Réunionnaise de Hockey en temps réel — gazon & salle, du Port au Tampon, partout dans l'île.";
  const { featured, standingsTop, topScorer, upcoming } = modeData;
  const fallbackMatch = featured ?? upcoming[0] ?? null;
  const leader = standingsTop[0] ?? null;
  const currentMatchday =
    featured?.matchday ?? upcoming.find((m) => m.matchday != null)?.matchday ?? null;
  const seasonLabel = formatSeasonLabel(season);
  return (
    <div style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4.5vw, 64px) 0' }}>
      <div style={{
        position: 'relative',
        minHeight: 'clamp(480px, 60vw, 640px)',
        borderRadius: 24, overflow: 'hidden',
        ...heroBackground(mode, backgroundImage, 1600),
      }}>
        <div style={{
          position: 'absolute', left: 'clamp(20px, 3vw, 40px)', bottom: 'clamp(20px, 3vw, 40px)', right: 'clamp(20px, 3vw, 40px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'clamp(16px, 2.5vw, 32px)',
          flexWrap: 'wrap',
        }}>
          <div style={{ maxWidth: 760, minWidth: 0, flex: '1 1 380px' }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.gold,
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14,
            }}>
              ● Saison {mode === 'gazon' ? 'Gazon' : 'Indoor'}{seasonLabel ? ` ${seasonLabel}` : ''}
              {currentMatchday ? ` — Journée ${currentMatchday}` : ''}
            </div>
            <h1 style={{
              ...display, fontWeight: 800,
              fontSize: 'clamp(44px, 7vw, 88px)',
              lineHeight: 0.95, color: '#fff', margin: 0,
              letterSpacing: '-0.03em', whiteSpace: 'pre-line',
              textShadow: '0 2px 30px rgba(0,0,0,0.3)',
            }}>{resolvedHeadline}</h1>
            <div style={{
              marginTop: 24, ...body, fontSize: 15, color: 'rgba(255,255,255,0.78)',
              maxWidth: 480, lineHeight: 1.55,
              whiteSpace: 'pre-line',
            }}>
              {resolvedSubtitle}
            </div>

            <HeroStatsStrip
              leader={leader}
              topScorer={topScorer}
              matchday={currentMatchday}
              upcomingCount={upcoming.length}
            />

            <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <Link href="/competitions" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                <CTAButton variant="gold" size="lg">Calendrier complet</CTAButton>
              </Link>
              <Link href="/classements" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                <CTAButton variant="ghost" size="lg">
                  <span style={{ color: '#fff' }}>Voir les classements</span>
                </CTAButton>
              </Link>
            </div>
          </div>

          {fallbackMatch && (
            <MatchChocGlass match={fallbackMatch} size="lg" kicker={featured ? undefined : 'Prochain match'} />
          )}
        </div>
      </div>
    </div>
  );
}

export function HeroMobile({
  mode,
  featured,
  season,
  headline,
  backgroundImage,
}: {
  mode: Mode;
  featured: ModeData['featured'];
  season?: string | null;
  headline?: string;
  backgroundImage?: string;
}) {
  const resolvedHeadline =
    headline ?? (mode === 'gazon' ? 'LE HOCKEY\nPEÏ,\nNIVEAU\nSUPÉRIEUR.' : 'LA SALLE\nÉLECTRIQUE.');
  const seasonLabelShort = formatSeasonLabelShort(season);
  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div style={{
        position: 'relative',
        minHeight: 'clamp(420px, 110vw, 540px)',
        borderRadius: 18, overflow: 'hidden',
        ...heroBackground(mode, backgroundImage, 800),
      }}>
        <div style={{
          position: 'absolute', left: 16, top: 24, right: 16,
        }}>
          <div style={{
            ...mono, fontSize: 9, color: LRH.gold,
            letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            ● Saison {mode === 'gazon' ? '' : 'Indoor '}{seasonLabelShort}{featured?.matchday ? ` — J${featured.matchday}` : ''}
          </div>
          <h1 style={{
            ...display, fontWeight: 800,
            fontSize: 'clamp(36px, 11vw, 52px)',
            lineHeight: 0.92, color: '#fff', margin: 0,
            letterSpacing: '-0.035em', whiteSpace: 'pre-line',
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}>{resolvedHeadline}</h1>
        </div>
        {featured && (
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
            <MatchChocGlass match={featured} size="sm" />
          </div>
        )}
      </div>
      <div style={{ marginTop: 14, marginBottom: 28, display: 'flex', gap: 8 }}>
        <Link href="/licence" style={{ textDecoration: 'none', flex: 1 }}>
          <CTAButton variant="red" size="lg">Prendre une licence</CTAButton>
        </Link>
        <Link href="/classements" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <button style={{
            ...body, fontWeight: 700, fontSize: 13, color: LRH.navy,
            background: '#fff', border: '1px solid ' + LRH.hairStrong,
            borderRadius: 8, padding: '14px 16px',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>Classements</button>
        </Link>
      </div>
    </div>
  );
}

/** "2025-2026" → "2025–2026" (en-dash typographique). */
function formatSeasonLabel(season: string | null | undefined): string | null {
  if (!season) return null;
  return season.replace(/-/g, '–');
}

/** "2025-2026" → "'25–'26". */
function formatSeasonLabelShort(season: string | null | undefined): string {
  if (!season) return '';
  const parts = season.split('-');
  if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
    return `'${parts[0].slice(-2)}–'${parts[1].slice(-2)}`;
  }
  return season.replace(/-/g, '–');
}

type Leader = NonNullable<ModeData['standingsTop']>[number];
type TopScorerLite = NonNullable<ModeData['topScorer']>;

function HeroStatsStrip({
  leader,
  topScorer,
  matchday,
  upcomingCount,
}: {
  leader: Leader | null;
  topScorer: TopScorerLite | null;
  matchday: number | null;
  upcomingCount: number;
}) {
  // 3 cellules glassy. Si une donnée manque, on remplace par un placeholder
  // discret plutôt que de la cacher (le strip garde son rythme visuel).
  const cells: { kicker: string; primary: string; secondary: string }[] = [
    {
      kicker: '◆ Leader',
      primary: leader?.club.shortCode ?? leader?.club.name ?? '—',
      secondary: leader ? `${leader.points} pts` : 'À venir',
    },
    {
      kicker: '◉ Top buteur',
      primary: topScorer
        ? `${topScorer.member.firstName[0]}. ${topScorer.member.lastName}`
        : '—',
      secondary: topScorer
        ? `${topScorer.goals} but${topScorer.goals > 1 ? 's' : ''}`
        : 'À venir',
    },
    {
      kicker: '▸ Calendrier',
      primary: matchday ? `Journée ${matchday}` : 'Pré-saison',
      secondary: upcomingCount
        ? `${upcomingCount} match${upcomingCount > 1 ? 's' : ''} à venir`
        : 'Aucun match programmé',
    },
  ];

  return (
    <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 580 }}>
      {cells.map((c, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            minWidth: 150,
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderLeft: `3px solid ${LRH.gold}`,
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: 9,
              fontWeight: 800,
              color: LRH.gold,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            {c.kicker}
          </div>
          <div
            style={{
              ...display,
              fontWeight: 800,
              fontSize: 18,
              color: '#fff',
              letterSpacing: '-0.02em',
              marginTop: 4,
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {c.primary}
          </div>
          <div
            style={{
              ...mono,
              fontSize: 10,
              color: 'rgba(255,255,255,0.62)',
              letterSpacing: '0.06em',
              marginTop: 2,
            }}
          >
            {c.secondary}
          </div>
        </div>
      ))}
    </div>
  );
}
