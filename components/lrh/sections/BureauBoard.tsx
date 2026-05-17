'use client';

import React, { useMemo } from 'react';
import { LRH, mono, display, body } from '../tokens';
import type { BureauMemberRow } from '@/lib/queries/ligue';

// =============================================================================
// Bureau en organigramme hiérarchique avec paires titulaire/adjoint.
//
// Détection du rôle (champ `role` texte libre côté admin) :
//   - "Président" (hors "Vice" et "adjoint")  → PRESIDENT
//   - "Vice-Président"                          → VICE_PRESIDENT
//   - "Trésorier" + "adjoint"                   → TRESORIER_ADJ
//   - "Trésorier"                               → TRESORIER
//   - "Secrétaire" + "adjoint"                  → SECRETAIRE_ADJ
//   - "Secrétaire"                              → SECRETAIRE
//   - tout autre                                → AUTRE
//
// Disposition :
//
//   [PRÉSIDENT]
//        |
//   [VICE-PRÉSIDENT]
//      /        \
//   [TRÉSORIER]      [SECRÉTAIRE]
//        |                  |
//   [Adjoint]          [Adjoint]
//
//   [Autres membres] (grille en bas, optionnel)
// =============================================================================

type Slot =
  | 'PRESIDENT'
  | 'VICE_PRESIDENT'
  | 'TRESORIER'
  | 'TRESORIER_ADJ'
  | 'SECRETAIRE'
  | 'SECRETAIRE_ADJ'
  | 'AUTRE';

function slotOf(role: string): Slot {
  const r = role.toLowerCase();
  const isAdjoint = r.includes('adjoint') || r.includes('adjt');
  if (r.includes('trésor') || r.includes('tresor')) {
    return isAdjoint ? 'TRESORIER_ADJ' : 'TRESORIER';
  }
  if (r.includes('secrétaire') || r.includes('secretaire')) {
    return isAdjoint ? 'SECRETAIRE_ADJ' : 'SECRETAIRE';
  }
  if (r.includes('vice')) return 'VICE_PRESIDENT';
  if (r.includes('président') || r.includes('president')) return 'PRESIDENT';
  return 'AUTRE';
}

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

type CardVariant = 'president' | 'vice' | 'titulaire' | 'adjoint' | 'autre';

const CARD_META: Record<CardVariant, { accent: string; badge?: string }> = {
  president: { accent: '#F3BC1C', badge: '★ Présidence' },
  vice: { accent: '#A8202F' },
  titulaire: { accent: '#002244' },
  adjoint: { accent: '#6b7c93' },
  autre: { accent: '#2c7a3f' },
};

function MemberCard({
  m,
  variant,
  mobileVariant,
}: {
  m: BureauMemberRow;
  variant: CardVariant;
  mobileVariant: boolean;
}) {
  const meta = CARD_META[variant];
  const isPresident = variant === 'president';
  const isVice = variant === 'vice';
  const isAdjoint = variant === 'adjoint';

  const avatarSize = mobileVariant
    ? isPresident
      ? 76
      : isVice
        ? 60
        : isAdjoint
          ? 44
          : 52
    : isPresident
      ? 104
      : isVice
        ? 76
        : isAdjoint
          ? 54
          : 64;

  const titleSize = mobileVariant
    ? isPresident
      ? 21
      : isVice
        ? 17
        : isAdjoint
          ? 13
          : 15
    : isPresident
      ? 28
      : isVice
        ? 20
        : isAdjoint
          ? 14
          : 17;

  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `4px solid ${meta.accent}`,
        padding: mobileVariant
          ? isPresident
            ? '16px 14px 18px'
            : isAdjoint
              ? '10px 12px 12px'
              : '14px 14px 16px'
          : isPresident
            ? '22px 26px 24px'
            : isAdjoint
              ? '12px 14px 14px'
              : '16px 18px 18px',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: mobileVariant ? 10 : isPresident ? 20 : isAdjoint ? 10 : 14,
        boxShadow: isPresident
          ? '0 12px 32px rgba(243,188,28,0.18)'
          : isAdjoint
            ? '0 2px 6px rgba(0,34,68,0.04)'
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
            fontSize: isAdjoint ? 9 : 10,
            fontWeight: 700,
            color: meta.accent,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
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
            letterSpacing: '-0.02em',
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

        {(m.email || m.phone) && !isAdjoint && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px dashed ' + LRH.hairStrong,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
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
          </div>
        )}
      </div>
    </div>
  );
}

/** Connecteur vertical entre 2 cards : trait pointillé navy + ronds. */
function VerticalConnector({
  height,
  bgColor = LRH.navy,
}: {
  height: number;
  bgColor?: string;
}) {
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
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
          height,
          background: `repeating-linear-gradient(to bottom, ${bgColor} 0 4px, transparent 4px 8px)`,
        }}
      />
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: bgColor,
        }}
      />
    </div>
  );
}

/** Pilier (Trésorerie / Secrétariat) : titulaire en haut, adjoint accolé dessous. */
function PoleColumn({
  kicker,
  titulaire,
  adjoint,
  mobileVariant,
  accent,
}: {
  kicker: string;
  titulaire: BureauMemberRow | null;
  adjoint: BureauMemberRow | null;
  mobileVariant: boolean;
  accent: string;
}) {
  if (!titulaire && !adjoint) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 0,
        flex: '1 1 320px',
        maxWidth: 440,
        minWidth: 0,
      }}
    >
      {/* Kicker du pôle */}
      <div
        style={{
          display: 'inline-flex',
          alignSelf: 'center',
          alignItems: 'center',
          gap: 8,
          background: '#fff',
          padding: '5px 12px',
          border: '1px solid ' + LRH.hairStrong,
          borderLeft: `3px solid ${accent}`,
          marginBottom: mobileVariant ? 14 : 18,
        }}
      >
        <span
          style={{
            ...mono,
            fontSize: 9.5,
            fontWeight: 800,
            color: accent,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          ◆ {kicker}
        </span>
      </div>

      {/* Titulaire */}
      {titulaire ? (
        <MemberCard m={titulaire} variant="titulaire" mobileVariant={mobileVariant} />
      ) : (
        <PlaceholderCard kicker={kicker} accent={accent} mobileVariant={mobileVariant} />
      )}

      {/* Connecteur titulaire → adjoint */}
      {adjoint && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: mobileVariant ? '6px 0' : '8px 0',
          }}
        >
          <VerticalConnector
            height={mobileVariant ? 18 : 28}
            bgColor={CARD_META.adjoint.accent}
          />
        </div>
      )}

      {/* Adjoint */}
      {adjoint && (
        <MemberCard m={adjoint} variant="adjoint" mobileVariant={mobileVariant} />
      )}
    </div>
  );
}

function PlaceholderCard({
  kicker,
  accent,
  mobileVariant,
}: {
  kicker: string;
  accent: string;
  mobileVariant: boolean;
}) {
  return (
    <div
      style={{
        background: '#fafafa',
        border: '1px dashed ' + LRH.hairStrong,
        borderLeft: `4px dashed ${accent}`,
        padding: mobileVariant ? '14px 14px 16px' : '16px 18px 18px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 700,
          color: LRH.mute,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {kicker}
      </div>
      <div style={{ ...body, fontSize: 12.5, color: LRH.mute, fontStyle: 'italic' }}>
        Poste vacant
      </div>
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
  const grouped = useMemo(() => {
    const g: Record<Slot, BureauMemberRow[]> = {
      PRESIDENT: [],
      VICE_PRESIDENT: [],
      TRESORIER: [],
      TRESORIER_ADJ: [],
      SECRETAIRE: [],
      SECRETAIRE_ADJ: [],
      AUTRE: [],
    };
    for (const m of members) g[slotOf(m.role)].push(m);
    for (const k of Object.keys(g) as Slot[]) {
      g[k].sort((a, b) => a.order - b.order);
    }
    return g;
  }, [members]);

  const president = grouped.PRESIDENT[0] ?? null;
  const vicePresidents = grouped.VICE_PRESIDENT;
  const tresorier = grouped.TRESORIER[0] ?? null;
  const tresorierAdj = grouped.TRESORIER_ADJ[0] ?? null;
  const secretaire = grouped.SECRETAIRE[0] ?? null;
  const secretaireAdj = grouped.SECRETAIRE_ADJ[0] ?? null;
  const autres = grouped.AUTRE;

  const hasPoleRow = tresorier || tresorierAdj || secretaire || secretaireAdj;

  return (
    <div
      id="bureau"
      style={{
        background: '#fff',
        padding: mobileVariant ? '40px 16px 48px' : 'clamp(43px, 5.40vw, 72px) clamp(20px, 4.5vw, 64px) clamp(48px, 6.00vw, 80px)',
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
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {/* PRÉSIDENCE */}
          {president && (
            <>
              <div style={{ width: '100%', maxWidth: 560 }}>
                <MemberCard
                  m={president}
                  variant="president"
                  mobileVariant={mobileVariant}
                />
              </div>
              {(vicePresidents.length > 0 || hasPoleRow) && (
                <div style={{ margin: mobileVariant ? '18px 0' : '26px 0' }}>
                  <VerticalConnector height={mobileVariant ? 24 : 36} />
                </div>
              )}
            </>
          )}

          {/* VICE-PRÉSIDENCE(S) */}
          {vicePresidents.length > 0 && (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: mobileVariant ? 12 : 18,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                {vicePresidents.map((vp) => (
                  <div key={vp.id} style={{ maxWidth: 440, flex: '1 1 320px' }}>
                    <MemberCard
                      m={vp}
                      variant="vice"
                      mobileVariant={mobileVariant}
                    />
                  </div>
                ))}
              </div>
              {hasPoleRow && (
                <div style={{ margin: mobileVariant ? '18px 0' : '26px 0' }}>
                  <VerticalConnector height={mobileVariant ? 24 : 36} />
                </div>
              )}
            </>
          )}

          {/* PILIERS : TRÉSORERIE / SECRÉTARIAT */}
          {hasPoleRow && (
            <div
              style={{
                display: 'flex',
                gap: mobileVariant ? 18 : 'clamp(20px, 3vw, 36px)',
                flexWrap: 'wrap',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <PoleColumn
                kicker="Trésorerie"
                titulaire={tresorier}
                adjoint={tresorierAdj}
                mobileVariant={mobileVariant}
                accent={CARD_META.titulaire.accent}
              />
              <PoleColumn
                kicker="Secrétariat"
                titulaire={secretaire}
                adjoint={secretaireAdj}
                mobileVariant={mobileVariant}
                accent={CARD_META.titulaire.accent}
              />
            </div>
          )}

          {/* AUTRES MEMBRES */}
          {autres.length > 0 && (
            <div
              style={{
                marginTop: mobileVariant ? 30 : 48,
                paddingTop: mobileVariant ? 24 : 36,
                borderTop: '1px dashed ' + LRH.hairStrong,
                width: '100%',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: mobileVariant ? 16 : 22,
                }}
              >
                <span
                  style={{
                    ...mono,
                    fontSize: 10,
                    fontWeight: 800,
                    color: CARD_META.autre.accent,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    padding: '5px 12px',
                    background: '#fff',
                    border: '1px solid ' + LRH.hairStrong,
                    borderLeft: `3px solid ${CARD_META.autre.accent}`,
                  }}
                >
                  ◉ Membres du bureau · {autres.length.toString().padStart(2, '0')}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: mobileVariant
                    ? '1fr'
                    : 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                  gap: mobileVariant ? 12 : 16,
                  width: '100%',
                  maxWidth: 1100,
                  margin: '0 auto',
                }}
              >
                {autres.map((m) => (
                  <MemberCard
                    key={m.id}
                    m={m}
                    variant="autre"
                    mobileVariant={mobileVariant}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
