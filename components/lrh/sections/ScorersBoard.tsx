'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, mono, display, body, ClubCrest } from '../tokens';
import type { TopScorer } from '@/lib/queries/scorers';

export type { TopScorer };

const CATEGORY_LABEL: Record<TopScorer['category'], string> = {
  U11: 'U11',
  U14: 'U14',
  U17: 'U17',
  U19: 'U19',
  SENIOR: 'Sénior',
  VETERAN: 'Vétéran',
};

function isValidHex(c?: string | null): c is string {
  return typeof c === 'string' && /^#?[0-9a-fA-F]{6}$/.test(c);
}
function normalizeColor(c?: string | null, fallback = LRH.gold): string {
  if (!isValidHex(c)) return fallback;
  return c.startsWith('#') ? c : '#' + c;
}

function initials(s: TopScorer) {
  return `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
}

export function ScorersBoard({
  scorers,
  context,
  mobileVariant = false,
}: {
  scorers: TopScorer[];
  /** Texte de contexte affiché sous le kicker du podium (ex. "D1 Gazon · 2025-2026"). */
  context?: string;
  mobileVariant?: boolean;
}) {
  const ranked = scorers.map((s, i) => ({ ...s, rank: i + 1 }));
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  if (scorers.length === 0) {
    return (
      <div style={{ padding: mobileVariant ? '48px 16px' : '64px 64px', textAlign: 'center', background: LRH.paperWarm }}>
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.mute,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          [ aucun buteur enregistré ]
        </div>
        <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 12, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
          Les statistiques des joueurs sont saisies par les clubs au fil de la saison.
          {context ? ` Aucun but n'a encore été enregistré pour ${context}.` : ' Le classement apparaîtra dès qu\'un premier but sera enregistré.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      {top3.length > 0 && (
        <ScorersPodium top3={top3} context={context} mobileVariant={mobileVariant} />
      )}

      {rest.length > 0 && (
        <div
          style={{
            background: LRH.paperWarm,
            padding: mobileVariant ? '32px 16px 56px' : '48px 64px 72px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <span style={{ width: 22, height: 2, background: LRH.red }} />
            <span
              style={{
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                color: LRH.red,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              Suite du classement · {rest.length}
            </span>
            <span style={{ flex: 1, height: 1, background: LRH.hair }} />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: mobileVariant
                ? 'repeat(auto-fill, minmax(160px, 1fr))'
                : 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: mobileVariant ? 12 : 16,
            }}
          >
            {rest.map((s) => (
              <ScorerCard key={s.id} scorer={s} mobileVariant={mobileVariant} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScorersPodium({
  top3,
  context,
  mobileVariant,
}: {
  top3: (TopScorer & { rank: number })[];
  context?: string;
  mobileVariant: boolean;
}) {
  const ORDER = [2, 1, 3] as const;
  const byRank = new Map<number, TopScorer & { rank: number }>();
  for (const s of top3) byRank.set(s.rank, s);

  return (
    <div
      style={{
        position: 'relative',
        background: LRH.navyDeep,
        color: '#fff',
        padding: mobileVariant ? '40px 16px 36px' : '60px 64px 52px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(95deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 36px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-25%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 760,
          height: 540,
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse, rgba(243,188,28,0.18) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: mobileVariant ? 22 : 30 }}>
          <div
            style={{
              ...mono,
              fontSize: 11,
              fontWeight: 700,
              color: LRH.gold,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            ★ Meilleurs buteurs · Top 3
          </div>
          {context && (
            <div
              style={{
                ...mono,
                fontSize: 10,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginTop: 6,
              }}
            >
              {context}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobileVariant ? '1fr' : 'repeat(3, 1fr)',
            gap: mobileVariant ? 14 : 18,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {(mobileVariant ? top3 : ORDER.map((r) => byRank.get(r))).map((s, i) => (
            <PodiumScorerCard
              key={s ? s.id : `empty-${i}`}
              scorer={s}
              mobileVariant={mobileVariant}
              forceRank={!mobileVariant ? ORDER[i] : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PodiumScorerCard({
  scorer,
  mobileVariant,
  forceRank,
}: {
  scorer: (TopScorer & { rank: number }) | undefined;
  mobileVariant: boolean;
  forceRank?: number;
}) {
  if (!scorer) {
    return <div style={{ visibility: 'hidden' }} />;
  }
  const isLeader = scorer.rank === 1;
  const accent = isLeader ? LRH.gold : '#fff';
  const accentBg = isLeader ? LRH.gold : 'rgba(255,255,255,0.04)';
  const photoHeight = mobileVariant ? 200 : isLeader ? 260 : 220;

  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        color: LRH.ink,
        border: '1px solid ' + (isLeader ? 'transparent' : 'rgba(255,255,255,0.08)'),
        borderTop: `4px solid ${accent}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: isLeader
          ? '0 14px 38px rgba(243,188,28,0.30)'
          : '0 6px 20px rgba(0,0,0,0.18)',
        transform: !mobileVariant && isLeader ? 'translateY(-8px)' : undefined,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          ...display,
          fontWeight: 800,
          fontSize: isLeader ? 28 : 22,
          color: LRH.navy,
          background: accentBg,
          padding: isLeader ? '6px 14px' : '4px 12px',
          lineHeight: 1,
          letterSpacing: '-0.04em',
          zIndex: 2,
          border: isLeader ? 'none' : '1px solid ' + LRH.hairStrong,
          backdropFilter: isLeader ? undefined : 'blur(4px)',
        }}
      >
        #{forceRank ?? scorer.rank}
      </div>

      {isLeader && (
        <div
          style={{
            position: 'absolute',
            right: 12,
            top: 14,
            ...mono,
            fontSize: 9.5,
            fontWeight: 800,
            color: LRH.navy,
            background: LRH.gold,
            padding: '4px 10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            zIndex: 2,
          }}
        >
          ★ MEILLEUR BUTEUR
        </div>
      )}

      <PhotoOrInitials scorer={scorer} height={photoHeight} />

      <div style={{ padding: mobileVariant ? '16px 16px 18px' : '18px 20px 20px' }}>
        <div
          style={{
            ...display,
            fontWeight: 800,
            fontSize: isLeader ? (mobileVariant ? 22 : 26) : mobileVariant ? 19 : 21,
            color: LRH.navy,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
          }}
        >
          {scorer.firstName} {scorer.lastName}
        </div>

        <div
          style={{
            ...mono,
            fontSize: 10,
            fontWeight: 700,
            color: LRH.mute,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginTop: 6,
          }}
        >
          {scorer.position || CATEGORY_LABEL[scorer.category]}
          {scorer.position && (
            <>
              <span style={{ opacity: 0.4 }}> · </span>
              {CATEGORY_LABEL[scorer.category]}
            </>
          )}
        </div>

        <Link
          href={`/clubs/${scorer.club.slug}`}
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px dashed ' + LRH.hair,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <ClubBadge club={scorer.club} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                ...body,
                fontSize: 12.5,
                fontWeight: 700,
                color: LRH.navy,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {scorer.club.name}
            </div>
            {scorer.club.shortCode && (
              <div
                style={{
                  ...mono,
                  fontSize: 9.5,
                  color: LRH.mute,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                {scorer.club.shortCode}
              </div>
            )}
          </div>
        </Link>

        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid ' + LRH.hair,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                ...display,
                fontWeight: 800,
                fontSize: isLeader ? 56 : 44,
                color: isLeader ? LRH.red : LRH.navy,
                letterSpacing: '-0.05em',
                lineHeight: 0.9,
              }}
            >
              {scorer.goalsScored}
            </div>
            <div
              style={{
                ...mono,
                fontSize: 9.5,
                color: LRH.mute,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              Buts
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                ...display,
                fontWeight: 700,
                fontSize: 22,
                color: LRH.ink2,
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {scorer.matchesPlayed}
            </div>
            <div
              style={{
                ...mono,
                fontSize: 9,
                color: LRH.mute,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              Matchs
            </div>
            {scorer.matchesPlayed > 0 && (
              <div
                style={{
                  ...mono,
                  fontSize: 9,
                  color: LRH.gold,
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  marginTop: 6,
                }}
              >
                {(scorer.goalsScored / scorer.matchesPlayed).toFixed(2)} / match
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScorerCard({
  scorer,
  mobileVariant,
}: {
  scorer: TopScorer & { rank: number };
  mobileVariant: boolean;
}) {
  const accent = normalizeColor(scorer.club.primaryColor, LRH.navy);
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderTop: `3px solid ${accent}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 8px 22px rgba(0,34,68,0.10)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ position: 'relative' }}>
        <PhotoOrInitials scorer={scorer} height={mobileVariant ? 160 : 200} />
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 10,
            ...display,
            fontWeight: 800,
            fontSize: mobileVariant ? 16 : 18,
            color: '#fff',
            background: LRH.navy,
            padding: '3px 9px',
            lineHeight: 1,
            letterSpacing: '-0.03em',
          }}
        >
          #{scorer.rank}
        </div>
        <div style={{ position: 'absolute', right: 10, top: 10 }}>
          <ClubBadge club={scorer.club} size={mobileVariant ? 24 : 28} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            background: LRH.red,
            color: '#fff',
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            lineHeight: 1,
          }}
        >
          <span
            style={{
              ...display,
              fontWeight: 800,
              fontSize: mobileVariant ? 18 : 22,
              letterSpacing: '-0.04em',
            }}
          >
            {scorer.goalsScored}
          </span>
          <span
            style={{
              ...mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              opacity: 0.85,
            }}
          >
            buts
          </span>
        </div>
      </div>

      <div style={{ padding: mobileVariant ? '12px 12px 14px' : '14px 14px 16px' }}>
        <div
          style={{
            ...display,
            fontWeight: 700,
            fontSize: mobileVariant ? 14 : 16,
            color: LRH.navy,
            letterSpacing: '-0.015em',
            lineHeight: 1.15,
            minHeight: mobileVariant ? 32 : 36,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {scorer.firstName} {scorer.lastName}
        </div>
        <Link
          href={`/clubs/${scorer.club.slug}`}
          style={{
            ...mono,
            fontSize: 9.5,
            color: LRH.mute,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginTop: 4,
            fontWeight: 700,
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          }}
        >
          {scorer.club.name}
        </Link>

        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px dashed ' + LRH.hair,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: 9,
              fontWeight: 700,
              color: LRH.mute,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            {scorer.position || CATEGORY_LABEL[scorer.category]}
          </div>
          <div
            style={{
              ...mono,
              fontSize: 10,
              fontWeight: 700,
              color: LRH.ink2,
              letterSpacing: '0.08em',
            }}
          >
            {scorer.matchesPlayed} MJ
          </div>
        </div>
      </div>
    </div>
  );
}

function ClubBadge({
  club,
  size = 24,
}: {
  club: TopScorer['club'];
  size?: number;
}) {
  if (club.logo) {
    return (
      <Link
        href={`/clubs/${club.slug}`}
        style={{ display: 'inline-flex', flexShrink: 0 }}
        aria-label={club.name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={club.logo}
          alt={`${club.name} logo`}
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
            background: '#fff',
            padding: 2,
            border: '1px solid ' + LRH.hair,
          }}
        />
      </Link>
    );
  }
  return (
    <ClubCrest
      id={club.shortCode ?? undefined}
      size={size}
      slug={club.slug}
    />
  );
}

function PhotoOrInitials({
  scorer,
  height,
}: {
  scorer: TopScorer;
  height: number;
}) {
  if (scorer.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={scorer.photo}
        alt={`${scorer.firstName} ${scorer.lastName}`}
        style={{
          width: '100%',
          height,
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: '100%',
        height,
        background: 'linear-gradient(135deg, ' + LRH.navy + ' 0%, #001022 100%)',
        color: LRH.gold,
        ...display,
        fontWeight: 800,
        fontSize: Math.max(28, height * 0.4),
        letterSpacing: '-0.04em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(112deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 22px)',
          pointerEvents: 'none',
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{initials(scorer)}</span>
    </div>
  );
}
