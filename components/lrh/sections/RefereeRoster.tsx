'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, mono, display, body, clubSrc, CLUBS } from '../tokens';
import type { PublicRefereeRow } from '@/lib/queries/referee';

type Level = NonNullable<PublicRefereeRow['level']>;

const LEVEL_LABEL: Record<Level | 'UNCLASSIFIED', string> = {
  NATIONAL: 'National · Fédéral',
  REGIONAL: 'Régional',
  JEUNE: 'Jeune arbitre',
  CANDIDAT: 'Candidat',
  UNCLASSIFIED: 'Non classés',
};

const LEVEL_KICKER: Record<Level | 'UNCLASSIFIED', string> = {
  NATIONAL: '01 · Élite',
  REGIONAL: '02 · Niveau régional',
  JEUNE: '03 · Jeunes arbitres',
  CANDIDAT: '04 · En formation',
  UNCLASSIFIED: '05 · Officiels',
};

const LEVEL_ORDER: (Level | 'UNCLASSIFIED')[] = [
  'NATIONAL',
  'REGIONAL',
  'JEUNE',
  'CANDIDAT',
  'UNCLASSIFIED',
];

function levelStyles(level: Level | 'UNCLASSIFIED') {
  switch (level) {
    case 'NATIONAL':
      return { bg: LRH.navy, fg: LRH.gold, accent: LRH.gold };
    case 'REGIONAL':
      return { bg: LRH.navy, fg: '#fff', accent: LRH.navy };
    case 'JEUNE':
      return { bg: LRH.red, fg: '#fff', accent: LRH.red };
    case 'CANDIDAT':
      return { bg: LRH.paperWarm, fg: LRH.navy, accent: LRH.hairStrong };
    default:
      return { bg: '#fff', fg: LRH.ink2, accent: LRH.hairStrong };
  }
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function resolveClubLogo(club: NonNullable<PublicRefereeRow['club']>): string | null {
  if (club.logo) return club.logo;
  if (club.shortCode && club.shortCode in CLUBS) {
    const src = clubSrc(club.shortCode);
    if (src) return src;
  }
  return null;
}

export function RefereeRoster({
  referees,
  mobileVariant = false,
}: {
  referees: PublicRefereeRow[];
  mobileVariant?: boolean;
}) {
  if (referees.length === 0) {
    return (
      <div
        style={{
          background: LRH.paper,
          padding: mobileVariant ? '24px 16px' : 'clamp(24px, 3.00vw, 40px) clamp(20px, 4.5vw, 64px)',
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px dashed ' + LRH.hairStrong,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            [ Effectif en cours de constitution ]
          </div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2 }}>
            Le registre des arbitres officiels sera publié prochainement.
          </div>
        </div>
      </div>
    );
  }

  const grouped = LEVEL_ORDER.map((lv) => ({
    key: lv,
    items:
      lv === 'UNCLASSIFIED'
        ? referees.filter((r) => r.level === null)
        : referees.filter((r) => r.level === lv),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      style={{
        background: LRH.paper,
        padding: mobileVariant
          ? '24px 16px'
          : 'clamp(28px, 4vw, 56px) clamp(24px, 5vw, 64px)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: mobileVariant ? 28 : 40 }}>
        {grouped.map((g) => (
          <RosterGroup
            key={g.key}
            level={g.key}
            referees={g.items}
            mobileVariant={mobileVariant}
          />
        ))}
      </div>
    </div>
  );
}

function RosterGroup({
  level,
  referees,
  mobileVariant,
}: {
  level: Level | 'UNCLASSIFIED';
  referees: PublicRefereeRow[];
  mobileVariant: boolean;
}) {
  const styles = levelStyles(level);
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <span style={{ width: 28, height: 2, background: styles.accent }} />
        <span
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            color: styles.accent === LRH.navy ? LRH.navy : styles.accent,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          {LEVEL_KICKER[level]}
        </span>
        <span style={{ flex: 1, height: 1, background: LRH.hair }} />
        <span
          style={{
            ...mono,
            fontSize: 10,
            color: LRH.mute,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {referees.length.toString().padStart(2, '0')} arbitre{referees.length > 1 ? 's' : ''}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobileVariant
            ? 'repeat(auto-fill, minmax(140px, 1fr))'
            : 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: mobileVariant ? 10 : 16,
        }}
      >
        {referees.map((r) => (
          <RefereeCard key={r.id} referee={r} level={level} mobileVariant={mobileVariant} />
        ))}
      </div>
    </section>
  );
}

function RefereeCard({
  referee,
  level,
  mobileVariant,
}: {
  referee: PublicRefereeRow;
  level: Level | 'UNCLASSIFIED';
  mobileVariant: boolean;
}) {
  const styles = levelStyles(level);
  const photoSize = mobileVariant ? 64 : 84;

  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${styles.accent}`,
        padding: mobileVariant ? 12 : 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {referee.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={referee.photo}
            alt={referee.fullName}
            style={{
              width: photoSize,
              height: photoSize,
              objectFit: 'cover',
              border: '2px solid ' + styles.accent,
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: photoSize,
              height: photoSize,
              background: LRH.navy,
              color: LRH.gold,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...display,
              fontWeight: 800,
              fontSize: photoSize * 0.32,
              letterSpacing: '-0.03em',
              flexShrink: 0,
              border: '2px solid ' + styles.accent,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'repeating-linear-gradient(112deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 16px)',
                pointerEvents: 'none',
              }}
            />
            <span style={{ position: 'relative' }}>{getInitials(referee.fullName)}</span>
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              ...display,
              fontWeight: 800,
              fontSize: mobileVariant ? 14 : 16,
              color: LRH.navy,
              letterSpacing: '-0.015em',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {referee.fullName}
          </div>
          {referee.license && (
            <div
              style={{
                ...mono,
                fontSize: 9.5,
                color: LRH.mute,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginTop: 3,
                fontWeight: 700,
              }}
            >
              LIC {referee.license}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Pill niveau */}
        <span
          style={{
            ...mono,
            fontSize: 9.5,
            fontWeight: 800,
            color: styles.fg,
            background: styles.bg,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            padding: '4px 8px',
            border: level === 'CANDIDAT' ? `1px solid ${LRH.hairStrong}` : 'none',
            alignSelf: 'flex-start',
          }}
        >
          {LEVEL_LABEL[level]}
        </span>

        {/* Club d'affiliation */}
        {referee.club ? (
          <Link
            href={`/clubs/${referee.club.slug}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              background: LRH.paperWarm,
              border: '1px solid ' + LRH.hair,
              textDecoration: 'none',
              color: LRH.navy,
              alignSelf: 'flex-start',
              maxWidth: '100%',
              overflow: 'hidden',
            }}
            aria-label={`Club d'affiliation : ${referee.club.name}`}
          >
            <ClubBadge club={referee.club} />
            <span
              style={{
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {referee.club.shortCode ?? referee.club.name}
            </span>
          </Link>
        ) : (
          <span
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Indépendant
          </span>
        )}

        {/* Compteur matchs sifflés */}
        <div
          style={{
            ...mono,
            fontSize: 9.5,
            color: LRH.ink2,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginTop: 2,
          }}
        >
          {referee._count.matches} match{referee._count.matches > 1 ? 's' : ''} sifflé
          {referee._count.matches > 1 ? 's' : ''}
        </div>
      </div>
    </article>
  );
}

function ClubBadge({ club }: { club: NonNullable<PublicRefereeRow['club']> }) {
  const logo = resolveClubLogo(club);
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logo}
        alt={club.name}
        style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }}
      />
    );
  }
  return (
    <span
      style={{
        width: 16,
        height: 16,
        background: club.primaryColor ?? LRH.navy,
        flexShrink: 0,
      }}
    />
  );
}
