'use client';

import React from 'react';
import Link from 'next/link';
import {
  LRH, mono, display, body, heroPlaceholderStyle, ClubCrest, CTAButton,
} from '../tokens';
import type { ModeData } from '@/lib/queries/home';
import { formatMatchDay, formatMatchTime, formatStatus } from '@/lib/utils/match-format';
import { optimizeImageUrl } from '@/lib/utils/image-url';
import { compactClubLabel } from '@/lib/utils/club-label';
import { formatSeasonLabel, formatSeasonLabelShort } from '@/lib/utils/season';
import { useSeason } from '../SeasonProvider';
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
  const hasScore = hs != null && as != null;
  const isLg = size === 'lg';
  const crestSize = isLg ? 48 : 32;
  const nameFs = isLg ? 15 : 13;
  const scoreFs = isLg ? 38 : 26;
  const padding = isLg ? 22 : 16;
  // Filet de sécurité imposé par la convention `compactClubLabel` : même
  // abrégé, un libellé sans `shortCode` peut dépasser. À coupler avec le
  // `minWidth: 0` du conteneur, sans quoi un flex enfant refuse de rétrécir.
  const nameClamp = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const;

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
        <span>
          {kicker
            ? `▸ ${kicker}`
            : hasScore
              ? '◆ Dernier résultat'
              : '▸ Prochain match'}
          {match.matchday ? ` · J${match.matchday}` : ''}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>
          {formatMatchDay(match.kickoffAt)} {formatMatchTime(match.kickoffAt)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: isLg ? 14 : 10 }}>
        <ClubCrest id={home?.shortCode ?? undefined} size={crestSize} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: nameFs, ...nameClamp }} title={home?.name}>
            {isLg ? home?.name : compactClubLabel(home)}
          </div>
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
        <ClubCrest id={away?.shortCode ?? undefined} size={crestSize} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: nameFs, ...nameClamp }} title={away?.name}>
            {isLg ? away?.name : compactClubLabel(away)}
          </div>
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

/** Image de fond du héro, en **vrai élément du DOM** (pas une background-image
 *  CSS). C'est l'élément LCP : un `<img fetchpriority="high">` est découvert par
 *  le preload scanner dès le parse du HTML et part en tête de file, là où une
 *  background-image n'est connue qu'après téléchargement + parsing du CSS et
 *  part en priorité basse. Un `<link rel=preload>` corrigeait la découverte
 *  mais pas la priorité — d'où la volatilité du LCP simulé (99/98/70/80).
 *
 *  `<picture>` conserve le choix de variante par breakpoint (w_800 mobile /
 *  w_1600 desktop) que faisait `.lrh-hero-bg` : le navigateur ne télécharge
 *  que celle du breakpoint courant, sans JS.
 *
 *  L'overlay sombre (lisibilité du texte blanc) devient un calque frère plutôt
 *  qu'un gradient empilé dans `background-image`.
 *
 *  Pas de CLS : le calque est en `position:absolute; inset:0` — hors flux, donc
 *  il ne peut pas décaler quoi que ce soit. La hauteur vient du `minHeight` du
 *  conteneur. */
function HeroBackdrop({ imageUrl }: { imageUrl?: string }) {
  if (!imageUrl || imageUrl.length === 0) return null;
  // Le hero est l'élément LCP (mesuré : 607 000 px² contre 288 000 px² pour le
  // <h1>, donc c'est lui qui l'emporte en surface).
  //
  // - Format explicite, car `f_auto` ne négocie pas sur ce compte Cloudinary
  //   (mesuré : JPEG servi malgré `Accept: image/avif,image/webp`).
  // - **WebP et pas AVIF.** À w_640/eco : JPEG 36,1 Ko · WebP 33,7 Ko · AVIF
  //   29,4 Ko. L'AVIF n'économise que 4,3 Ko de plus mais décode beaucoup plus
  //   lentement — un coût CPU que le throttling ×4 de Lighthouse amplifie, et
  //   qui se paie sur de vrais téléphones d'entrée de gamme. On ne propose donc
  //   AUCUNE source AVIF : en offrir une suffirait à ce que le navigateur la
  //   préfère et reprenne le coût de décodage.
  // - `q_auto:eco` : l'image est sous un overlay à 45-62 % de noir, la
  //   compression agressive n'y est pas perceptible.
  // - w_640 en mobile plutôt que w_800 : couvre le viewport de référence
  //   (412 px CSS) et divise le poids par deux. C'est là qu'était le vrai gain,
  //   pas dans le format.
  const MOBILE_MQ = '(max-width: 1023.98px)';
  const DESKTOP_MQ = '(min-width: 1024px)';
  const webp = (w: number) => optimizeImageUrl(imageUrl, w, 'eco', 'webp');
  const fallback = (w: number) => optimizeImageUrl(imageUrl, w, 'eco');
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <picture>
        <source type="image/webp" media={MOBILE_MQ} srcSet={webp(640)} />
        <source type="image/webp" media={DESKTOP_MQ} srcSet={webp(1600)} />
        <source media={MOBILE_MQ} srcSet={fallback(640)} />
        <source media={DESKTOP_MQ} srcSet={fallback(1600)} />
        <img
          src={fallback(1600)}
          alt=""
          fetchPriority="high"
          decoding="async"
          loading="eager"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
        />
      </picture>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.62))',
      }} />
    </div>
  );
}

/** Fond du conteneur héro : couleur d'attente sous l'image pendant son
 *  chargement, ou gradient procédural quand aucune image n'est configurée. */
function heroBackground(mode: Mode, imageUrl?: string): React.CSSProperties {
  if (imageUrl && imageUrl.length > 0) return { backgroundColor: '#0e1a25' };
  return heroPlaceholderStyle({ tone: mode });
}

export function HeroDesktop({
  mode,
  modeData,
  headline,
  subtitle,
  backgroundImage,
}: {
  mode: Mode;
  modeData: ModeData;
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
  const seasonLabel = formatSeasonLabel(useSeason());
  return (
    <div style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4.5vw, 64px) 0' }}>
      <div style={{
        position: 'relative',
        minHeight: 'clamp(480px, 60vw, 640px)',
        borderRadius: 24, overflow: 'hidden',
        ...heroBackground(mode, backgroundImage),
      }}>
        <HeroBackdrop imageUrl={backgroundImage} />
        <div style={{
          position: 'absolute', zIndex: 1,
          left: 'clamp(20px, 3vw, 40px)', bottom: 'clamp(20px, 3vw, 40px)', right: 'clamp(20px, 3vw, 40px)',
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
  headline,
  backgroundImage,
}: {
  mode: Mode;
  featured: ModeData['featured'];
  headline?: string;
  backgroundImage?: string;
}) {
  const resolvedHeadline =
    headline ?? (mode === 'gazon' ? 'LE HOCKEY\nPEÏ,\nNIVEAU\nSUPÉRIEUR.' : 'LA SALLE\nÉLECTRIQUE.');
  const seasonLabelShort = formatSeasonLabelShort(useSeason());
  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div style={{
        position: 'relative',
        minHeight: 'clamp(400px, 102vw, 500px)',
        borderRadius: 18, overflow: 'hidden',
        ...heroBackground(mode, backgroundImage),
      }}>
        <HeroBackdrop imageUrl={backgroundImage} />
        <div style={{
          position: 'absolute', zIndex: 1, left: 16, top: 24, right: 16,
        }}>
          <div style={{
            ...mono, fontSize: 9, color: LRH.gold,
            letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            ● Saison {mode === 'gazon' ? '' : 'Indoor '}{seasonLabelShort}{featured?.matchday ? ` — J${featured.matchday}` : ''}
          </div>
          <h1 style={{
            ...display, fontWeight: 800,
            fontSize: 'clamp(32px, 9.8vw, 46px)',
            lineHeight: 0.94, color: '#fff', margin: 0,
            letterSpacing: '-0.035em', whiteSpace: 'pre-line',
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}>{resolvedHeadline}</h1>
        </div>
        {featured && (
          <div style={{ position: 'absolute', zIndex: 1, left: 14, right: 14, bottom: 14 }}>
            <MatchChocGlass match={featured} size="sm" />
          </div>
        )}
      </div>
      <div style={{ marginTop: 14, marginBottom: 28, display: 'flex', gap: 8 }}>
        <Link href="/licence" style={{ textDecoration: 'none', flex: 1, display: 'inline-flex' }}>
          <CTAButton variant="red" size="lg">Prendre une licence</CTAButton>
        </Link>
        <Link href="/clubs" style={{ textDecoration: 'none', flexShrink: 0, display: 'inline-flex' }}>
          <button style={{
            ...body, fontWeight: 700, fontSize: 13, color: LRH.navy,
            background: '#fff', border: '1px solid ' + LRH.hairStrong,
            borderRadius: 8, padding: '14px 18px',
            minHeight: 48,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>Trouver un club</button>
        </Link>
      </div>
    </div>
  );
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
