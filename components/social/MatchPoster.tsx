/**
 * Affiche match LRH pour réseaux sociaux. Composant pur (zero hook),
 * destiné à être passé à `ImageResponse` de `next/og` (Satori).
 *
 * Contraintes Satori importantes — respectées scrupuleusement ci-dessous :
 *   - Chaque élément avec ≥2 enfants doit avoir `display: 'flex'`.
 *   - Pas de classes CSS, uniquement inline styles.
 *   - `<img>` doit avoir width + height explicites.
 *   - Pas de `clip-path` natif → effet diagonal simulé via `transform: skewX()`
 *     sur un `<div>` positionné absolu.
 *
 * Z-index stack (du fond vers l'avant) :
 *   0. Background navy + texture (gazon ou parquet selon mode)
 *   1. Bandes obliques colorées (red/gold) en skew
 *   2. Halo radial gold derrière les logos clubs
 *   3. Silhouette hockeyeur en filigrane (opacity ~0.10)
 *   4. Badge LRH en signature
 *   5. Texte info (kicker, noms, date, lieu)
 *   6. Logos clubs avec drop-shadow profonde
 *   7. Bande sponsors en footer
 */

import React from 'react';
import { SOCIAL_COLORS, modeAccent, modeBackgroundTexture } from '@/lib/social/palette';
import {
  publicFileAsDataUri,
  LRH_BADGE_ASPECT,
  clubLogoUrl,
  seasonBackgroundDataUri,
} from '@/lib/social/assets';

type Mode = 'GAZON' | 'SALLE';

export type MatchPosterData = {
  id: string;
  kickoffAt: Date;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | string;
  homeScore: number | null;
  awayScore: number | null;
  matchday: number | null;
  venue: string | null;
  venueRef: { name: string; city: string | null } | null;
  homeClub: {
    shortCode: string | null;
    name: string;
    logo: string | null;
    primaryColor: string | null;
  };
  awayClub: {
    shortCode: string | null;
    name: string;
    logo: string | null;
    primaryColor: string | null;
  };
  competition: {
    name: string;
    season: string;
    mode: Mode;
    category: string | null;
  };
  sponsors: { name: string; logo: string | null }[];
};

export type PosterRatio = 'square' | 'story';

export const POSTER_DIMENSIONS = {
  square: { width: 1200, height: 1200 },
  story: { width: 1080, height: 1920 },
} as const;

export function MatchPoster({
  match,
  ratio,
  badgeUri,
  silhouetteUri,
}: {
  match: MatchPosterData;
  ratio: PosterRatio;
  /** Data URI PNG du badge LRH (rasterisé via sharp avant le rendu). */
  badgeUri: string | null;
  /** Data URI PNG d'une silhouette (rasterisée + colorée blanc). */
  silhouetteUri: string;
}) {
  return ratio === 'square' ? (
    <SquarePoster match={match} badgeUri={badgeUri} silhouetteUri={silhouetteUri} />
  ) : (
    <StoryPoster match={match} badgeUri={badgeUri} silhouetteUri={silhouetteUri} />
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function formatDate(d: Date): string {
  return d
    .toLocaleDateString('fr-FR', {
      timeZone: 'Indian/Reunion',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })
    .toUpperCase();
}

function formatTime(d: Date): string {
  return d
    .toLocaleTimeString('fr-FR', {
      timeZone: 'Indian/Reunion',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(':', 'H');
}

function venueLabel(match: MatchPosterData): string {
  if (match.venueRef) {
    const parts = [match.venueRef.name];
    if (match.venueRef.city) parts.push(match.venueRef.city.toUpperCase());
    return parts.join(', ');
  }
  if (match.venue) return match.venue.toUpperCase();
  return 'LIEU À CONFIRMER';
}

function hasScore(m: MatchPosterData): boolean {
  return m.homeScore != null && m.awayScore != null;
}

/* ─── Sous-composants partagés ──────────────────────────────────────────── */

/** Logo club : si pas de logo → fallback pastille blanche + couleur club + initiales.
 *  Le fond blanc garantit la visibilité sur navy (sinon une club avec primaryColor=
 *  navy disparaîtrait dans le fond du poster). */
function ClubLogo({
  club,
  size,
}: {
  club: MatchPosterData['homeClub'];
  size: number;
}) {
  const url = clubLogoUrl(club.logo);
  if (url) {
    return (
      <img
        src={url}
        width={size}
        height={size}
        alt=""
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.55))',
        }}
      />
    );
  }
  // Fallback : pastille TOUJOURS visible — blanc + initiales en couleur club.
  // Bordure épaisse en couleur club pour la lisibilité.
  const initials = (club.shortCode ?? club.name)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const clubColor = club.primaryColor ?? SOCIAL_COLORS.gold;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: size / 2,
        background: '#fff',
        color: clubColor,
        fontSize: size * 0.36,
        fontWeight: 800,
        fontFamily: 'Anton',
        letterSpacing: '0.04em',
        filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.55))',
        border: `${Math.round(size * 0.04)}px solid ${clubColor}`,
      }}
    >
      {initials}
    </div>
  );
}

/** Bandeau sponsors fixé en bas du poster. Logos en grille uniforme. */
function SponsorsStrip({
  sponsors,
  height,
}: {
  sponsors: MatchPosterData['sponsors'];
  height: number;
}) {
  const withLogo = sponsors.filter((s) => s.logo);
  if (withLogo.length === 0) return null;
  // Limite à 6 sponsors max pour pas tasser l'affichage.
  const items = withLogo.slice(0, 6);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        width: '100%',
        height,
        padding: '0 40px',
        background: 'rgba(255,255,255,0.96)',
      }}
    >
      {items.map((s, i) => (
        <img
          key={i}
          src={clubLogoUrl(s.logo) ?? ''}
          width={120}
          height={height - 32}
          alt=""
          style={{
            maxHeight: height - 32,
            maxWidth: 160,
            objectFit: 'contain',
          }}
        />
      ))}
    </div>
  );
}

/** Badge officiel LRH. `size` est la HAUTEUR — la largeur est calculée
 *  pour respecter l'aspect ratio (~0.51 vertical) sinon le badge serait
 *  étiré ou letterboxé. Le `src` est un PNG rasterisé en amont (sharp). */
function LrhBadge({ size, badgeUri }: { size: number; badgeUri: string | null }) {
  if (!badgeUri) return null;
  const w = Math.round(size * LRH_BADGE_ASPECT);
  return (
    <img
      src={badgeUri}
      width={w}
      height={size}
      alt="LRH"
      style={{
        width: w,
        height: size,
        objectFit: 'contain',
      }}
    />
  );
}

/** Layer 0 + 1 : Background "Diagonal Split" — style Nike/Adidas.
 *
 *  Stack visuel (du fond vers l'avant) :
 *    1. Navy base (#002244)
 *    2. Texture mode très discrète (gazon ou parquet, opacity 0.10)
 *    3. GRANDE bande diagonale mode-color (vert gazon ou rouge salle),
 *       opacity 0.92 — couvre ~55% du poster côté droit, skewX(-15deg)
 *    4. Fine accent gold (4px) sur l'arête de la diagonale — touch premium
 *    5. Gradient vignette top→bottom pour profondeur
 *    6. Subtle stripes LRH sur le tout (sport pattern signature)
 *    7. Si season-background.{png,jpg} présent → injecté en hero opacity 0.45
 *
 *  Bénéfice : visuel bold + identitaire (mode color reconnaissable) +
 *  garde le navy pour le côté gauche où vit la majorité du contenu texte.
 */
function Background({ mode, width, height }: { mode: Mode; width: number; height: number }) {
  const seasonUri = seasonBackgroundDataUri();
  const textureUri = publicFileAsDataUri(modeBackgroundTexture(mode), 'image/png');

  // Couleur de la diagonale selon le mode : vert profond pour GAZON,
  // ambre/red pour SALLE. Alignées avec MODE_COLOR du site.
  const accentColor = mode === 'GAZON' ? '#1d6b3f' : '#C9531A';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        display: 'flex',
        background: SOCIAL_COLORS.navy,
      }}
    >
      {/* 1. Texture mode très discrète sur tout le poster */}
      {textureUri && (
        <img
          src={textureUri}
          width={width}
          height={height}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height,
            objectFit: 'cover',
            opacity: 0.10,
          }}
        />
      )}

      {/* 2. Hero saisonnier optionnel (si présent dans public/social/) */}
      {seasonUri && (
        <img
          src={seasonUri}
          width={width}
          height={height}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height,
            objectFit: 'cover',
            opacity: 0.45,
          }}
        />
      )}

      {/* 3. GRANDE DIAGONALE — coeur du design Nike/Adidas style */}
      <div
        style={{
          position: 'absolute',
          top: -height * 0.15,
          right: -width * 0.12,
          width: width * 0.62,
          height: height * 1.3,
          display: 'flex',
          background: accentColor,
          opacity: 0.92,
          transform: 'skewX(-15deg)',
        }}
      />

      {/* 4. Fine accent line GOLD sur l'arête (4px, vraiment premium) */}
      <div
        style={{
          position: 'absolute',
          top: -height * 0.15,
          right: width * 0.51,
          width: 5,
          height: height * 1.3,
          display: 'flex',
          background: SOCIAL_COLORS.gold,
          transform: 'skewX(-15deg)',
        }}
      />

      {/* 5. Second accent line — encore plus fin, white 0.4 opacity, parallèle */}
      <div
        style={{
          position: 'absolute',
          top: -height * 0.15,
          right: width * 0.48,
          width: 2,
          height: height * 1.3,
          display: 'flex',
          background: '#fff',
          opacity: 0.35,
          transform: 'skewX(-15deg)',
        }}
      />

      {/* 6. Stripes diagonales LRH (pattern signature subtil sur tout) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          display: 'flex',
          backgroundImage: SOCIAL_COLORS.stripesStrong,
        }}
      />

      {/* 7. Vignette top→bottom pour profondeur (clair en haut, plus dense en bas) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          display: 'flex',
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.42) 100%)',
        }}
      />
    </div>
  );
}

/** Layer 2 : halo radial gold centré derrière la zone des logos clubs. */
function HaloGold({ top, height }: { top: number | string; height: number | string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: '10%',
        width: '80%',
        height,
        display: 'flex',
        backgroundImage: SOCIAL_COLORS.haloGold,
      }}
    />
  );
}

/** Layer 3 : silhouette hockeyeur en filigrane.
 *
 *  Le PNG est passé en prop (rasterisé en amont avec fill blanc forcé pour
 *  l'effet filigrane). On ne touche pas à `filter:` qui a un support
 *  partiel/buggué dans Satori (brightness/invert pas dans la liste).
 *
 *  ⚠ Satori refuse `left: 'auto'` → on construit le style conditionnellement.
 */
function SilhouetteWatermark({
  size,
  align,
  silhouetteUri,
}: {
  size: number;
  align: 'right' | 'center';
  silhouetteUri: string;
}) {
  const positionStyle: React.CSSProperties =
    align === 'right'
      ? { right: -size * 0.15 }
      : { left: '50%', marginLeft: -size / 2 };
  return (
    <img
      src={silhouetteUri}
      width={size}
      height={size}
      alt=""
      style={{
        position: 'absolute',
        top: '15%',
        ...positionStyle,
        width: size,
        height: size,
        opacity: 0.18,
      }}
    />
  );
}

/* ─── SQUARE 1200×1200 (Feed Instagram / Post Facebook) ─────────────────── */

function SquarePoster({
  match,
  badgeUri,
  silhouetteUri,
}: {
  match: MatchPosterData;
  badgeUri: string | null;
  silhouetteUri: string;
}) {
  const accent = modeAccent(match.competition.mode);
  const SPONSORS_H = 130;
  return (
    <div
      style={{
        width: 1200,
        height: 1200,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        color: '#fff',
        fontFamily: 'Montserrat',
      }}
    >
      <Background mode={match.competition.mode} width={1200} height={1200} />
      <SilhouetteWatermark size={700} align="right" silhouetteUri={silhouetteUri} />
      <HaloGold top={340} height={460} />

      {/* CONTENU — positionné absolument pour superposer le background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 1200 - SPONSORS_H,
          display: 'flex',
          flexDirection: 'column',
          padding: '54px 64px 24px 64px',
        }}
      >
        {/* HEADER : kicker compétition + badge LRH */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                padding: '6px 14px',
                background: accent.bg,
                color: accent.fg,
                fontSize: 18,
                fontWeight: 800,
                fontFamily: 'Montserrat',
                letterSpacing: '0.22em',
              }}
            >
              {accent.label} · {match.competition.season}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                fontFamily: 'Bebas Neue',
                color: SOCIAL_COLORS.gold,
                letterSpacing: '0.16em',
              }}
            >
              {match.competition.name}
              {match.matchday ? `  ·  JOURNÉE ${match.matchday}` : ''}
            </div>
          </div>
          <LrhBadge size={180} badgeUri={badgeUri} />
        </div>

        {/* CORPS : HOME — VS/SCORE — AWAY */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            paddingTop: 30,
          }}
        >
          {/* HOME */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              gap: 18,
            }}
          >
            <ClubLogo club={match.homeClub} size={240} />
            <div
              style={{
                display: 'flex',
                fontFamily: 'Anton',
                fontSize: 48,
                color: '#fff',
                letterSpacing: '0.02em',
                lineHeight: 0.95,
                textAlign: 'center',
              }}
            >
              {match.homeClub.shortCode ?? match.homeClub.name}
            </div>
          </div>

          {/* VS / SCORE central */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px',
            }}
          >
            {hasScore(match) ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: 'Anton',
                  fontSize: 150,
                  color: SOCIAL_COLORS.goldHot,
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                }}
              >
                <span style={{ display: 'flex' }}>{match.homeScore}</span>
                <span
                  style={{
                    display: 'flex',
                    color: '#fff',
                    margin: '0 16px',
                    fontFamily: 'Anton',
                  }}
                >
                  -
                </span>
                <span style={{ display: 'flex' }}>{match.awayScore}</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Anton',
                  fontSize: 130,
                  color: SOCIAL_COLORS.gold,
                  lineHeight: 1,
                  letterSpacing: '0.04em',
                }}
              >
                VS
              </div>
            )}
            {match.status === 'LIVE' && (
              <div
                style={{
                  display: 'flex',
                  marginTop: 12,
                  padding: '4px 12px',
                  background: SOCIAL_COLORS.red,
                  color: '#fff',
                  fontFamily: 'Bebas Neue',
                  fontSize: 22,
                  letterSpacing: '0.2em',
                }}
              >
                ● LIVE
              </div>
            )}
          </div>

          {/* AWAY */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              gap: 18,
            }}
          >
            <ClubLogo club={match.awayClub} size={240} />
            <div
              style={{
                display: 'flex',
                fontFamily: 'Anton',
                fontSize: 48,
                color: '#fff',
                letterSpacing: '0.02em',
                lineHeight: 0.95,
                textAlign: 'center',
              }}
            >
              {match.awayClub.shortCode ?? match.awayClub.name}
            </div>
          </div>
        </div>

        {/* DATE / HEURE / LIEU */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            paddingBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontFamily: 'Bebas Neue',
              fontSize: 44,
              color: SOCIAL_COLORS.gold,
              letterSpacing: '0.18em',
            }}
          >
            {formatDate(match.kickoffAt)} · {formatTime(match.kickoffAt)}
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Montserrat',
              fontWeight: 700,
              fontSize: 20,
              color: 'rgba(255,255,255,0.78)',
              letterSpacing: '0.14em',
            }}
          >
            {venueLabel(match)}
          </div>
        </div>
      </div>

      {/* FOOTER SPONSORS */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          display: 'flex',
        }}
      >
        <SponsorsStrip sponsors={match.sponsors} height={SPONSORS_H} />
      </div>
    </div>
  );
}

/* ─── STORY 1080×1920 (Story IG/FB / Statut WhatsApp) ───────────────────── */

function StoryPoster({
  match,
  badgeUri,
  silhouetteUri,
}: {
  match: MatchPosterData;
  badgeUri: string | null;
  silhouetteUri: string;
}) {
  const accent = modeAccent(match.competition.mode);
  const SPONSORS_H = 160;
  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        color: '#fff',
        fontFamily: 'Montserrat',
      }}
    >
      <Background mode={match.competition.mode} width={1080} height={1920} />
      <SilhouetteWatermark size={900} align="center" silhouetteUri={silhouetteUri} />
      <HaloGold top={720} height={460} />

      {/* HEADER */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <LrhBadge size={280} badgeUri={badgeUri} />
        <div
          style={{
            display: 'flex',
            padding: '8px 18px',
            background: accent.bg,
            color: accent.fg,
            fontSize: 20,
            fontWeight: 800,
            fontFamily: 'Montserrat',
            letterSpacing: '0.24em',
          }}
        >
          {accent.label} · {match.competition.season}
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Bebas Neue',
            fontSize: 30,
            color: SOCIAL_COLORS.gold,
            letterSpacing: '0.18em',
            textAlign: 'center',
            padding: '0 60px',
          }}
        >
          {match.competition.name.toUpperCase()}
          {match.matchday ? `  ·  J${match.matchday}` : ''}
        </div>
      </div>

      {/* CORPS : HOME (haut) / SCORE-VS (centre) / AWAY (bas) */}
      <div
        style={{
          position: 'absolute',
          top: 480,
          left: 0,
          width: '100%',
          height: 1100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 64px',
        }}
      >
        {/* HOME */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 22,
          }}
        >
          <ClubLogo club={match.homeClub} size={340} />
          <div
            style={{
              display: 'flex',
              fontFamily: 'Anton',
              fontSize: 78,
              color: '#fff',
              letterSpacing: '0.02em',
              lineHeight: 0.95,
              textAlign: 'center',
            }}
          >
            {match.homeClub.shortCode ?? match.homeClub.name}
          </div>
        </div>

        {/* VS / SCORE */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {hasScore(match) ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontFamily: 'Anton',
                fontSize: 180,
                color: SOCIAL_COLORS.goldHot,
                lineHeight: 1,
                letterSpacing: '0.02em',
              }}
            >
              <span style={{ display: 'flex' }}>{match.homeScore}</span>
              <span
                style={{
                  display: 'flex',
                  color: '#fff',
                  margin: '0 22px',
                  fontFamily: 'Anton',
                }}
              >
                -
              </span>
              <span style={{ display: 'flex' }}>{match.awayScore}</span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                fontFamily: 'Anton',
                fontSize: 160,
                color: SOCIAL_COLORS.gold,
                lineHeight: 1,
                letterSpacing: '0.04em',
              }}
            >
              VS
            </div>
          )}
          {match.status === 'LIVE' && (
            <div
              style={{
                display: 'flex',
                marginTop: 14,
                padding: '6px 18px',
                background: SOCIAL_COLORS.red,
                color: '#fff',
                fontFamily: 'Bebas Neue',
                fontSize: 28,
                letterSpacing: '0.22em',
              }}
            >
              ● LIVE
            </div>
          )}
        </div>

        {/* AWAY */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 22,
          }}
        >
          <ClubLogo club={match.awayClub} size={340} />
          <div
            style={{
              display: 'flex',
              fontFamily: 'Anton',
              fontSize: 78,
              color: '#fff',
              letterSpacing: '0.02em',
              lineHeight: 0.95,
              textAlign: 'center',
            }}
          >
            {match.awayClub.shortCode ?? match.awayClub.name}
          </div>
        </div>
      </div>

      {/* DATE / LIEU au-dessus des sponsors */}
      <div
        style={{
          position: 'absolute',
          bottom: SPONSORS_H + 36,
          left: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'Bebas Neue',
            fontSize: 54,
            color: SOCIAL_COLORS.gold,
            letterSpacing: '0.18em',
          }}
        >
          {formatDate(match.kickoffAt)} · {formatTime(match.kickoffAt)}
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Montserrat',
            fontWeight: 700,
            fontSize: 24,
            color: 'rgba(255,255,255,0.82)',
            letterSpacing: '0.14em',
            textAlign: 'center',
            padding: '0 60px',
          }}
        >
          {venueLabel(match)}
        </div>
      </div>

      {/* FOOTER SPONSORS */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          display: 'flex',
        }}
      >
        <SponsorsStrip sponsors={match.sponsors} height={SPONSORS_H} />
      </div>
    </div>
  );
}
