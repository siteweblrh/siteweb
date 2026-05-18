'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, mono, display, body, ClubCrest } from '../tokens';

type Club = {
  id: string;
  slug: string;
  shortCode: string | null;
  name: string;
};

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  clubId: string;
};

type GoalEvent = {
  id: string;
  type: 'GOAL';
  minute: number;
  clubId: string;
  goalKind: string | null;
  scorerMember: Member | null;
  scorerName: string | null;
};

type CardEvent = {
  id: string;
  type: 'CARD';
  minute: number;
  clubId: string;
  cardKind: 'GREEN' | 'YELLOW' | 'RED';
  reason: string | null;
  member: Member | null;
  memberName: string | null;
};

export type FactEvent = GoalEvent | CardEvent;

const CARD_DOT_COLOR: Record<'GREEN' | 'YELLOW' | 'RED', string> = {
  GREEN:  '#1d6b3f',
  YELLOW: '#F3BC1C',
  RED:    '#A8202F',
};

const CARD_LABEL: Record<'GREEN' | 'YELLOW' | 'RED', string> = {
  GREEN:  'Vert',
  YELLOW: 'Jaune',
  RED:    'Rouge',
};

function memberLabel(m: Member, withJersey = true): string {
  const jersey = withJersey && m.jerseyNumber != null ? `#${m.jerseyNumber} ` : '';
  return `${jersey}${m.firstName} ${m.lastName}`;
}

export function FactsTimeline({
  events,
  homeClub,
  awayClub,
  mobileVariant = false,
}: {
  events: FactEvent[];
  homeClub: Club;
  awayClub: Club;
  mobileVariant?: boolean;
}) {
  if (events.length === 0) {
    return (
      <div
        style={{
          ...mono,
          fontSize: 11.5,
          color: LRH.mute,
          letterSpacing: '0.08em',
          padding: '24px 18px',
          background: '#fff',
          border: '1px dashed ' + LRH.hairStrong,
          textAlign: 'center',
        }}
      >
        Aucun fait marquant enregistré pour ce match.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: LRH.hair, border: '1px solid ' + LRH.hairStrong }}>
      {events.map((ev) => (
        <FactRow
          key={`${ev.type}-${ev.id}`}
          event={ev}
          homeClub={homeClub}
          awayClub={awayClub}
          mobileVariant={mobileVariant}
        />
      ))}
    </div>
  );
}

function FactRow({
  event,
  homeClub,
  awayClub,
  mobileVariant,
}: {
  event: FactEvent;
  homeClub: Club;
  awayClub: Club;
  mobileVariant: boolean;
}) {
  const club = event.clubId === homeClub.id ? homeClub : awayClub;
  const isHome = event.clubId === homeClub.id;

  let accent: string;
  let label: string;
  let main: React.ReactNode;
  let subline: string | null = null;

  if (event.type === 'GOAL') {
    accent = LRH.gold;
    label = event.goalKind || 'But';
    const scorer = event.scorerMember;
    main = scorer ? (
      <PlayerLink member={scorer} clubSlug={club.slug} />
    ) : (
      <span style={{ ...body, fontSize: 14, fontWeight: 700, color: LRH.ink }}>
        {event.scorerName || 'Buteur non précisé'}
      </span>
    );
  } else {
    const palC = CARD_DOT_COLOR[event.cardKind];
    accent = palC;
    label = `Carton ${CARD_LABEL[event.cardKind]}`;
    const player = event.member;
    main = player ? (
      <PlayerLink member={player} clubSlug={club.slug} />
    ) : (
      <span style={{ ...body, fontSize: 14, fontWeight: 700, color: LRH.ink }}>
        {event.memberName || 'Joueur non précisé'}
      </span>
    );
    subline = event.reason;
  }

  return (
    <div
      style={{
        background: '#fff',
        padding: mobileVariant ? '12px 14px' : '14px 20px',
        display: 'grid',
        gridTemplateColumns: mobileVariant ? '48px 1fr auto' : '70px 1fr auto',
        gap: mobileVariant ? 12 : 18,
        alignItems: 'center',
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div
        style={{
          ...display,
          fontSize: mobileVariant ? 22 : 28,
          fontWeight: 800,
          color: LRH.navy,
          letterSpacing: '-0.03em',
          textAlign: 'right',
        }}
      >
        {event.minute}'
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span
            style={{
              ...mono,
              fontSize: 9.5,
              fontWeight: 800,
              padding: '2px 7px',
              background: accent,
              color: accent === LRH.gold ? LRH.navy : '#fff',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </span>
          <ClubCrest id={club.shortCode ?? undefined} size={16} />
          <Link
            href={`/clubs/${club.slug}`}
            style={{
              ...mono,
              fontSize: 10.5,
              color: LRH.mute,
              letterSpacing: '0.06em',
              textDecoration: 'none',
            }}
          >
            {club.name}
          </Link>
        </div>
        <div style={{ ...body, fontSize: mobileVariant ? 13.5 : 14, color: LRH.ink }}>
          {main}
        </div>
        {subline && (
          <div style={{ ...body, fontSize: 12, color: LRH.mute, marginTop: 4 }}>
            {subline}
          </div>
        )}
      </div>

      <div
        style={{
          ...mono,
          fontSize: 9,
          fontWeight: 700,
          color: LRH.mute,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {isHome ? '◂ Dom.' : 'Visit. ▸'}
      </div>
    </div>
  );
}

function PlayerLink({
  member,
  clubSlug,
}: {
  member: Member;
  clubSlug: string;
}) {
  // Pas de page joueur dédiée pour le moment → lien vers la fiche club
  // (le roster y est visible). À remplacer par /players/[id] le jour où la
  // fiche joueur sera implémentée.
  return (
    <Link
      href={`/clubs/${clubSlug}#effectif`}
      style={{
        ...body,
        fontSize: 14,
        fontWeight: 700,
        color: LRH.navy,
        textDecoration: 'none',
        borderBottom: `1px solid ${LRH.gold}`,
      }}
    >
      {memberLabel(member)}
    </Link>
  );
}
