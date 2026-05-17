'use client';

import React from 'react';
import { LRH, mono, display, body, ClubCrest } from '../tokens';
import type { BracketMatch } from '@/lib/queries/competition';

type Phase = BracketMatch['phase'];

const PHASE_LABEL: Record<Phase, string> = {
  REGULAR: 'Phase régulière',
  R32: '32e de finale',
  R16: '16e de finale',
  QUARTER: 'Quart de finale',
  SEMI: 'Demi-finale',
  THIRD_PLACE: '3e place',
  FINAL: 'Finale',
};

// Ordre d'affichage de gauche à droite. THIRD_PLACE est rendu séparément
// (juste à côté de FINAL).
const COLUMN_ORDER: Phase[] = ['R32', 'R16', 'QUARTER', 'SEMI', 'FINAL'];

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function BracketBoard({
  matches,
  mobileVariant = false,
  title = 'Phase finale',
  index = '02',
}: {
  matches: BracketMatch[];
  mobileVariant?: boolean;
  title?: string;
  index?: string;
}) {
  if (matches.length === 0) {
    return (
      <div
        style={{
          background: LRH.paper,
          padding: mobileVariant
            ? '32px 16px'
            : 'clamp(36px, 5vw, 60px) clamp(20px, 4.5vw, 64px)',
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
              fontWeight: 700,
            }}
          >
            [ Phase finale à venir ]
          </div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2 }}>
            Les matchs de phase finale ne sont pas encore programmés.
          </div>
        </div>
      </div>
    );
  }

  // Group par phase
  const byPhase = new Map<Phase, BracketMatch[]>();
  for (const p of [...COLUMN_ORDER, 'THIRD_PLACE' as Phase]) byPhase.set(p, []);
  for (const m of matches) {
    if (!byPhase.has(m.phase)) byPhase.set(m.phase, []);
    byPhase.get(m.phase)!.push(m);
  }

  const visibleColumns = COLUMN_ORDER.filter(
    (p) => (byPhase.get(p)?.length ?? 0) > 0,
  );
  const thirdPlace = byPhase.get('THIRD_PLACE') ?? [];

  return (
    <div
      style={{
        background: LRH.paper,
        padding: mobileVariant
          ? '32px 16px 40px'
          : 'clamp(36px, 5vw, 60px) clamp(20px, 4.5vw, 64px) clamp(44px, 5vw, 60px)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: mobileVariant ? 20 : 28,
        }}
      >
        <span style={{ width: 28, height: 2, background: LRH.gold }} />
        <span
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            color: LRH.gold,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          {index} · {title}
        </span>
        <span style={{ flex: 1, height: 1, background: LRH.hair }} />
        <span
          style={{
            ...mono,
            fontSize: 10,
            fontWeight: 700,
            color: LRH.mute,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {matches.length.toString().padStart(2, '0')} match
          {matches.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Colonnes principales (R32 → FINAL) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobileVariant
            ? '1fr'
            : `repeat(${visibleColumns.length}, minmax(min(100%, 240px), 1fr))`,
          gap: mobileVariant ? 18 : 'clamp(14px, 1.6vw, 24px)',
        }}
      >
        {visibleColumns.map((phase) => (
          <BracketColumn
            key={phase}
            phase={phase}
            matches={byPhase.get(phase) ?? []}
            mobileVariant={mobileVariant}
          />
        ))}
      </div>

      {/* Match 3e place — section dédiée pour ne pas brouiller la lecture du bracket */}
      {thirdPlace.length > 0 && (
        <div style={{ marginTop: mobileVariant ? 28 : 40 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <span style={{ width: 18, height: 1, background: LRH.red }} />
            <span
              style={{
                ...mono,
                fontSize: 10,
                fontWeight: 700,
                color: LRH.red,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              ◆ Match pour la 3e place
            </span>
            <span style={{ flex: 1, height: 1, background: LRH.hair }} />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
              gap: 14,
              maxWidth: 540,
            }}
          >
            {thirdPlace.map((m) => (
              <MatchCard key={m.id} match={m} mobileVariant={mobileVariant} thirdPlace />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BracketColumn({
  phase,
  matches,
  mobileVariant,
}: {
  phase: Phase;
  matches: BracketMatch[];
  mobileVariant: boolean;
}) {
  const isFinal = phase === 'FINAL';
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 800,
          color: isFinal ? LRH.gold : LRH.navy,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: `2px solid ${isFinal ? LRH.gold : LRH.hairStrong}`,
          textAlign: 'center',
        }}
      >
        {PHASE_LABEL[phase]}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: mobileVariant ? 10 : 14,
          justifyContent: 'space-around',
          flex: 1,
        }}
      >
        {matches.map((m) => (
          <MatchCard key={m.id} match={m} mobileVariant={mobileVariant} isFinal={isFinal} />
        ))}
      </div>
    </div>
  );
}

function isValidHex(c?: string | null): c is string {
  return typeof c === 'string' && /^#?[0-9a-fA-F]{6}$/.test(c);
}
function clubColor(c?: string | null, fallback = LRH.navy): string {
  if (!isValidHex(c)) return fallback;
  return c.startsWith('#') ? c : '#' + c;
}

function MatchCard({
  match,
  mobileVariant,
  isFinal = false,
  thirdPlace = false,
}: {
  match: BracketMatch;
  mobileVariant: boolean;
  isFinal?: boolean;
  thirdPlace?: boolean;
}) {
  const isPlayed = match.status === 'FINISHED';
  const hs = match.homeScore ?? null;
  const as = match.awayScore ?? null;
  const homeWin = isPlayed && hs != null && as != null && hs > as;
  const awayWin = isPlayed && hs != null && as != null && as > hs;
  const date = new Date(match.kickoffAt);
  const accent = isFinal ? LRH.gold : thirdPlace ? LRH.red : LRH.navy;

  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `4px solid ${accent}`,
        padding: mobileVariant ? 10 : 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        boxShadow: isFinal
          ? '0 8px 22px rgba(243,188,28,0.18)'
          : '0 2px 6px rgba(0,34,68,0.05)',
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 9,
          fontWeight: 700,
          color: LRH.mute,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        {formatDate(date)} · {formatTime(date)}
        {match.venueRef && ` · ${match.venueRef.name}`}
      </div>

      <TeamRow
        name={match.homeClub.shortCode ?? match.homeClub.name}
        crest={match.homeClub.shortCode}
        score={hs}
        winning={homeWin}
        played={isPlayed}
        accent={clubColor(match.homeClub.primaryColor)}
      />
      <div
        style={{
          height: 1,
          background: LRH.hair,
          margin: '2px 0',
        }}
      />
      <TeamRow
        name={match.awayClub.shortCode ?? match.awayClub.name}
        crest={match.awayClub.shortCode}
        score={as}
        winning={awayWin}
        played={isPlayed}
        accent={clubColor(match.awayClub.primaryColor)}
      />
    </article>
  );
}

function TeamRow({
  name,
  crest,
  score,
  winning,
  played,
  accent,
}: {
  name: string;
  crest: string | null;
  score: number | null;
  winning: boolean;
  played: boolean;
  accent: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <ClubCrest id={crest ?? undefined} size={22} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          ...display,
          fontWeight: winning ? 800 : 600,
          fontSize: 12.5,
          color: played && !winning ? LRH.mute : LRH.navy,
          letterSpacing: '-0.01em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
      <span
        style={{
          ...display,
          fontWeight: 800,
          fontSize: played ? 16 : 12,
          color: winning ? accent : played ? LRH.mute : LRH.hairStrong,
          letterSpacing: '-0.02em',
          minWidth: 22,
          textAlign: 'right',
        }}
      >
        {played ? (score ?? 0) : '—'}
      </span>
    </div>
  );
}
