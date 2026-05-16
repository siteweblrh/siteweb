'use client';

import React, { useMemo } from 'react';
import { LRH, mono, display, body } from '../tokens';
import type { BureauMemberRow } from '@/lib/queries/ligue';

// =============================================================================
// Bureau en organigramme hiérarchique.
//
// Le niveau est déduit du champ `role` (texte libre côté admin) :
//   - "Président" (hors "Vice")     → niveau 0  (Présidence)
//   - "Vice-Président"              → niveau 1  (Vice-présidences)
//   - "Secrétaire" / "Trésorier"    → niveau 2  (Direction administrative)
//   - tout autre rôle               → niveau 3  (Membres du bureau)
//
// Pas de schema change. L'admin contrôle l'ordre via le champ `order` déjà
// existant — les rangées sont triées par order croissant dans chaque niveau.
// =============================================================================

type Level = 0 | 1 | 2 | 3;

function levelOf(role: string): Level {
  const r = role.toLowerCase();
  if (r.includes('président') && !r.includes('vice')) return 0;
  if (r.includes('président') && r.includes('vice')) return 1;
  if (r.includes('vice-pré') || r.includes('vice pré')) return 1;
  if (r.includes('secrétaire') || r.includes('secretaire')) return 2;
  if (r.includes('trésor') || r.includes('tresor')) return 2;
  return 3;
}

const LEVEL_META: Record<
  Level,
  { kicker: string; accent: string; badge?: string }
> = {
  0: { kicker: 'Présidence', accent: '#F3BC1C', badge: '★ Présidence' },
  1: { kicker: 'Vice-présidences', accent: '#A8202F' },
  2: { kicker: 'Direction administrative', accent: '#002244' },
  3: { kicker: 'Membres du bureau', accent: '#2c7a3f' },
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function Avatar({
  photo,
  fullName,
  size,
}: {
  photo: string | null;
  fullName: string;
  size: number;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={fullName}
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          flexShrink: 0,
          border: '1px solid ' + LRH.hair,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        background: LRH.navy,
        color: LRH.gold,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...display,
        fontWeight: 800,
        fontSize: size * 0.36,
        letterSpacing: '-0.02em',
        backgroundImage:
          'repeating-linear-gradient(95deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 6px)',
      }}
    >
      {getInitials(fullName)}
    </div>
  );
}

function MemberCard({
  m,
  level,
  mobileVariant,
}: {
  m: BureauMemberRow;
  level: Level;
  mobileVariant: boolean;
}) {
  const meta = LEVEL_META[level];
  const isPresident = level === 0;
  const avatarSize = mobileVariant
    ? isPresident
      ? 80
      : 56
    : isPresident
      ? 112
      : level === 1
        ? 80
        : 68;
  const titleSize = mobileVariant
    ? isPresident
      ? 22
      : 15
    : isPresident
      ? 30
      : level === 1
        ? 20
        : 17;

  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `4px solid ${meta.accent}`,
        padding: mobileVariant
          ? '14px 14px 16px'
          : isPresident
            ? '24px 28px 26px'
            : '16px 18px 18px',
        width: '100%',
        maxWidth: isPresident
          ? mobileVariant
            ? '100%'
            : 560
          : mobileVariant
            ? '100%'
            : level === 1
              ? 380
              : 340,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: mobileVariant ? 12 : isPresident ? 22 : 16,
        boxShadow: isPresident
          ? '0 12px 32px rgba(243,188,28,0.18)'
          : '0 4px 14px rgba(0,34,68,0.05)',
      }}
    >
      {meta.badge && (
        <span
          style={{
            position: 'absolute',
            top: -10,
            left: 18,
            ...mono,
            fontSize: 9.5,
            fontWeight: 800,
            padding: '4px 10px',
            background: meta.accent,
            color: LRH.navy,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          {meta.badge}
        </span>
      )}

      <Avatar photo={m.photo} fullName={m.fullName} size={avatarSize} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...mono,
            fontSize: 10,
            fontWeight: 700,
            color: meta.accent,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {m.role}
        </div>
        <div
          style={{
            ...display,
            fontWeight: 700,
            fontSize: titleSize,
            color: LRH.navy,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
          }}
        >
          {m.fullName}
        </div>

        {m.bio && isPresident && (
          <p
            style={{
              ...body,
              fontSize: 13.5,
              color: LRH.ink2,
              marginTop: 10,
              lineHeight: 1.55,
            }}
          >
            {m.bio}
          </p>
        )}

        {(m.email || m.phone || m.startedAt) && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px dashed ' + LRH.hairStrong,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.06em',
            }}
          >
            {m.email && (
              <a
                href={`mailto:${m.email}`}
                style={{
                  color: LRH.navy,
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span style={{ color: LRH.red }}>✉</span>
                {m.email}
              </a>
            )}
            {m.phone && (
              <a
                href={`tel:${m.phone.replace(/\s+/g, '')}`}
                style={{
                  color: LRH.navy,
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span style={{ color: LRH.red }}>☎</span>
                {m.phone}
              </a>
            )}
            {m.startedAt && (
              <span>
                Depuis{' '}
                {new Date(m.startedAt).toLocaleDateString('fr-FR', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LevelRow({
  level,
  members,
  mobileVariant,
}: {
  level: Level;
  members: BureauMemberRow[];
  mobileVariant: boolean;
}) {
  if (members.length === 0) return null;
  const meta = LEVEL_META[level];
  const isPresident = level === 0;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Level kicker */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: '#fff',
          padding: '6px 14px',
          border: '1px solid ' + LRH.hairStrong,
          borderLeft: `3px solid ${meta.accent}`,
          marginBottom: mobileVariant ? 18 : 26,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <span
          style={{
            ...mono,
            fontSize: 9.5,
            fontWeight: 800,
            color: meta.accent,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          {'· '.repeat(level)}
          {meta.kicker}
        </span>
        <span
          style={{
            ...mono,
            fontSize: 9.5,
            fontWeight: 700,
            color: LRH.mute,
            letterSpacing: '0.14em',
          }}
        >
          {members.length.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Cards row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: mobileVariant ? 14 : 18,
          justifyContent: 'center',
          width: '100%',
          maxWidth: isPresident ? 1100 : '100%',
        }}
      >
        {members.map((m) => (
          <MemberCard
            key={m.id}
            m={m}
            level={level}
            mobileVariant={mobileVariant}
          />
        ))}
      </div>
    </div>
  );
}

function LevelConnector({ mobileVariant }: { mobileVariant: boolean }) {
  // Vertical spine entre deux niveaux : trait pointillé navy + petits points
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: mobileVariant ? '14px 0' : '22px 0',
        gap: 4,
      }}
      aria-hidden
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: LRH.gold,
        }}
      />
      <span
        style={{
          width: 2,
          height: mobileVariant ? 28 : 44,
          background:
            'repeating-linear-gradient(to bottom, ' +
            LRH.navy +
            ' 0 4px, transparent 4px 8px)',
        }}
      />
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: LRH.navy,
        }}
      />
    </div>
  );
}

export function BureauBoard({
  members,
  mobileVariant = false,
}: {
  members: BureauMemberRow[];
  mobileVariant?: boolean;
}) {
  const levels = useMemo(() => {
    const groups: Record<Level, BureauMemberRow[]> = { 0: [], 1: [], 2: [], 3: [] };
    for (const m of members) groups[levelOf(m.role)].push(m);
    for (const lvl of [0, 1, 2, 3] as Level[]) {
      groups[lvl].sort((a, b) => a.order - b.order);
    }
    return groups;
  }, [members]);

  const orderedLevels: Level[] = [0, 1, 2, 3];
  const populated = orderedLevels.filter((l) => levels[l].length > 0);

  return (
    <div
      id="bureau"
      style={{
        background: '#fff',
        padding: mobileVariant ? '40px 16px 48px' : '72px 64px 80px',
        borderTop: '1px solid ' + LRH.hair,
        borderBottom: '1px solid ' + LRH.hair,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 24,
          marginBottom: mobileVariant ? 28 : 44,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                ...mono,
                fontSize: 11,
                fontWeight: 700,
                color: LRH.gold,
                letterSpacing: '0.22em',
              }}
            >
              03
            </span>
            <span
              style={{
                ...mono,
                fontSize: 11,
                fontWeight: 700,
                color: LRH.mute,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Bureau Exécutif · Organigramme
            </span>
          </div>
          <h2
            style={{
              ...display,
              fontWeight: 700,
              fontSize: mobileVariant ? 30 : 44,
              color: LRH.navy,
              margin: 0,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
            }}
          >
            La gouvernance<br />de la Ligue.
          </h2>
        </div>
        <div
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            color: LRH.mute,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {members.length.toString().padStart(2, '0')}{' '}
          {members.length > 1 ? 'membres' : 'membre'}
        </div>
      </div>

      {members.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            background: LRH.paper,
            border: '1px dashed ' + LRH.hairStrong,
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: 11,
              color: LRH.mute,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            [ vide ]
          </div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>
            Bureau non encore publié.
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 1280,
            margin: '0 auto',
          }}
        >
          {populated.map((lvl, idx) => (
            <React.Fragment key={lvl}>
              <LevelRow
                level={lvl}
                members={levels[lvl]}
                mobileVariant={mobileVariant}
              />
              {idx < populated.length - 1 && (
                <LevelConnector mobileVariant={mobileVariant} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
