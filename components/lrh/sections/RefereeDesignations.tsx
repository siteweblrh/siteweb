'use client';

import React from 'react';
import { LRH, mono, display, body, ClubCrest } from '../tokens';
import type { DesignationRow } from '@/lib/queries/referee';

const MONTH_LABELS = [
  'JAN',
  'FÉV',
  'MAR',
  'AVR',
  'MAI',
  'JUN',
  'JUL',
  'AOÛ',
  'SEP',
  'OCT',
  'NOV',
  'DÉC',
];

function formatDate(d: Date) {
  return {
    day: d.getDate().toString().padStart(2, '0'),
    month: MONTH_LABELS[d.getMonth()],
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    weekday: d
      .toLocaleDateString('fr-FR', { weekday: 'short' })
      .replace('.', '')
      .toUpperCase(),
  };
}

function refereeBadge(level: string | null) {
  switch (level) {
    case 'NATIONAL':
      return { bg: LRH.gold, fg: LRH.navy, label: 'NAT' };
    case 'REGIONAL':
      return { bg: LRH.navy, fg: '#fff', label: 'REG' };
    case 'JEUNE':
      return { bg: LRH.red, fg: '#fff', label: 'JA' };
    case 'CANDIDAT':
      return { bg: LRH.paperWarm, fg: LRH.navy, label: 'CAN' };
    default:
      return { bg: LRH.hair, fg: LRH.ink2, label: '—' };
  }
}

export function RefereeDesignations({
  upcoming,
  recent,
  mobileVariant = false,
}: {
  upcoming: DesignationRow[];
  recent: DesignationRow[];
  mobileVariant?: boolean;
}) {
  if (upcoming.length === 0 && recent.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: LRH.paper,
        padding: mobileVariant
          ? '32px 16px'
          : 'clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobileVariant ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: mobileVariant ? 28 : 'clamp(24px, 3vw, 40px)',
        }}
      >
        <DesignationColumn
          kicker="06 · Prochaines désignations"
          accent={LRH.gold}
          empty="Aucune désignation à venir."
          matches={upcoming}
          tense="future"
          mobileVariant={mobileVariant}
        />
        <DesignationColumn
          kicker="07 · Dernières désignations"
          accent={LRH.navy}
          empty="Aucune désignation récente."
          matches={recent}
          tense="past"
          mobileVariant={mobileVariant}
        />
      </div>
    </div>
  );
}

function DesignationColumn({
  kicker,
  accent,
  empty,
  matches,
  tense,
  mobileVariant,
}: {
  kicker: string;
  accent: string;
  empty: string;
  matches: DesignationRow[];
  tense: 'future' | 'past';
  mobileVariant: boolean;
}) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <span style={{ width: 28, height: 2, background: accent }} />
        <span
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            color: accent,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          {kicker}
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
          {matches.length.toString().padStart(2, '0')}
        </span>
      </div>

      {matches.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px dashed ' + LRH.hairStrong,
            padding: 24,
            textAlign: 'center',
            ...body,
            fontSize: 13,
            color: LRH.mute,
          }}
        >
          {empty}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {matches.map((m) => (
            <DesignationCard key={m.id} match={m} tense={tense} mobileVariant={mobileVariant} />
          ))}
        </div>
      )}
    </section>
  );
}

function DesignationCard({
  match,
  tense,
  mobileVariant,
}: {
  match: DesignationRow;
  tense: 'future' | 'past';
  mobileVariant: boolean;
}) {
  const date = formatDate(new Date(match.kickoffAt));
  const isPlayed = tense === 'past' && match.status === 'FINISHED';
  const principals = match.referees.filter((r) => r.role === 'PRINCIPAL');
  const delegues = match.referees.filter((r) => r.role === 'DELEGUE');

  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${tense === 'future' ? LRH.gold : LRH.navy}`,
        padding: mobileVariant ? 12 : 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Date block */}
        <div
          style={{
            background: LRH.navy,
            color: '#fff',
            padding: '6px 10px',
            textAlign: 'center',
            minWidth: 56,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'repeating-linear-gradient(112deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 14px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              ...mono,
              fontSize: 8.5,
              fontWeight: 700,
              color: LRH.gold,
              letterSpacing: '0.18em',
              lineHeight: 1,
            }}
          >
            {date.weekday}
          </div>
          <div
            style={{
              position: 'relative',
              ...display,
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1,
              marginTop: 2,
              letterSpacing: '-0.02em',
            }}
          >
            {date.day}
          </div>
          <div
            style={{
              position: 'relative',
              ...mono,
              fontSize: 8.5,
              fontWeight: 700,
              color: LRH.gold,
              letterSpacing: '0.18em',
              lineHeight: 1,
              marginTop: 2,
            }}
          >
            {date.month}
          </div>
        </div>

        {/* Competition + teams */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              ...mono,
              fontSize: 9.5,
              fontWeight: 700,
              color: LRH.mute,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {date.time} · {match.competition.name}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
            }}
          >
            <ClubCrest id={match.homeClub.shortCode ?? undefined} size={mobileVariant ? 22 : 26} />
            <span
              style={{
                ...display,
                fontWeight: 800,
                fontSize: mobileVariant ? 13 : 14,
                color: LRH.navy,
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
              }}
            >
              {match.homeClub.shortCode ?? match.homeClub.name}
            </span>
            {isPlayed ? (
              <span
                style={{
                  ...display,
                  fontWeight: 800,
                  fontSize: 14,
                  color: LRH.navy,
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                {match.homeScore} – {match.awayScore}
              </span>
            ) : (
              <span
                style={{
                  ...mono,
                  fontSize: 11,
                  color: LRH.mute,
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                }}
              >
                vs
              </span>
            )}
            <span
              style={{
                ...display,
                fontWeight: 800,
                fontSize: mobileVariant ? 13 : 14,
                color: LRH.navy,
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
                textAlign: 'right',
              }}
            >
              {match.awayClub.shortCode ?? match.awayClub.name}
            </span>
            <ClubCrest id={match.awayClub.shortCode ?? undefined} size={mobileVariant ? 22 : 26} />
          </div>
          {match.venueRef && (
            <div
              style={{
                ...mono,
                fontSize: 9.5,
                color: LRH.mute,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginTop: 4,
                fontWeight: 700,
              }}
            >
              ◉ {match.venueRef.name} · {match.venueRef.city}
            </div>
          )}
        </div>
      </div>

      {/* Référents */}
      <div
        style={{
          borderTop: '1px dashed ' + LRH.hair,
          paddingTop: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {principals.map((r) => (
          <RefereeLine key={r.referee.id} referee={r.referee} role="PRINCIPAL" />
        ))}
        {delegues.map((r) => (
          <RefereeLine key={r.referee.id} referee={r.referee} role="DELEGUE" />
        ))}
      </div>
    </article>
  );
}

function RefereeLine({
  referee,
  role,
}: {
  referee: { id: string; fullName: string; level: string | null };
  role: 'PRINCIPAL' | 'DELEGUE';
}) {
  const badge = refereeBadge(referee.level);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          ...mono,
          fontSize: 9,
          fontWeight: 800,
          background: badge.bg,
          color: badge.fg,
          padding: '2px 5px',
          letterSpacing: '0.12em',
          minWidth: 30,
          textAlign: 'center',
        }}
      >
        {badge.label}
      </span>
      <span
        style={{
          ...mono,
          fontSize: 9.5,
          fontWeight: 700,
          color: role === 'PRINCIPAL' ? LRH.navy : LRH.mute,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          minWidth: 76,
        }}
      >
        {role === 'PRINCIPAL' ? '▸ Arbitre' : '◇ Délégué'}
      </span>
      <span
        style={{
          ...body,
          fontSize: 13,
          color: LRH.ink,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {referee.fullName}
      </span>
    </div>
  );
}
