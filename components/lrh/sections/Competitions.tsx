'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LRH, mono, display, body, ClubCrest, Card } from '../tokens';
import type { ModeData } from '@/lib/queries/home';
import { formatMatchDay, formatMatchTime } from '@/lib/utils/match-format';
import { MobileSectionLabel, MobileSectionTitle } from './SectionHeading';

type UpcomingMatch = ModeData['upcoming'][number];

// Nombre de matchs affichés une fois le filtre appliqué.
const VISIBLE_LIMIT = 4;

export function ChipDark({
  children, active = false, onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px', borderRadius: 999,
        background: active ? LRH.gold : 'rgba(255,255,255,0.06)',
        color: active ? LRH.navy : 'rgba(255,255,255,0.78)',
        ...body, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
        border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
    >{children}</button>
  );
}

export function ChipLight({
  children, active = false, onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '7px 12px', borderRadius: 999, flexShrink: 0,
        background: active ? LRH.navy : '#fff',
        color: active ? '#fff' : LRH.ink2,
        border: active ? 'none' : '1px solid ' + LRH.hairStrong,
        ...body, fontSize: 11.5, fontWeight: 700,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s ease, color 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >{children}</button>
  );
}

export function UpcomingMatchCard({ match, variant = 'desktop' }: {
  match: UpcomingMatch;
  variant?: 'desktop' | 'mobile';
}) {
  if (variant === 'mobile') {
    return (
      <Card style={{ padding: 16 }}>
        <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.12em', marginBottom: 10 }}>
          {formatMatchDay(match.kickoffAt)} · {formatMatchTime(match.kickoffAt)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClubCrest id={match.homeClub.shortCode ?? undefined} size={28} />
            <span style={{ ...display, fontSize: 13, fontWeight: 600, color: LRH.navy }}>{match.homeClub.name}</span>
          </div>
          <span style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.1em' }}>VS</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse' }}>
            <ClubCrest id={match.awayClub.shortCode ?? undefined} size={28} />
            <span style={{ ...display, fontSize: 13, fontWeight: 600, color: LRH.navy }}>{match.awayClub.name}</span>
          </div>
        </div>
        {match.venue && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + LRH.hair, ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            📍 {match.venue}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div style={{
      padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 10.5, color: LRH.gold, letterSpacing: '0.12em', marginBottom: 16 }}>
        <span>{formatMatchDay(match.kickoffAt)}</span>
        <span>{formatMatchTime(match.kickoffAt)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <ClubCrest id={match.homeClub.shortCode ?? undefined} size={32} />
        <span style={{ ...display, fontSize: 14, fontWeight: 600 }}>{match.homeClub.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ClubCrest id={match.awayClub.shortCode ?? undefined} size={32} />
        <span style={{ ...display, fontSize: 14, fontWeight: 600 }}>{match.awayClub.name}</span>
      </div>
      {match.venue && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', ...mono, fontSize: 9.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {match.venue}
        </div>
      )}
    </div>
  );
}

/**
 * Tire la liste des compétitions présentes dans `upcoming` (dans l'ordre
 * d'apparition de la première occurrence). Garantit qu'aucun chip "mort"
 * (sans match) n'est affiché. Renvoie aussi un nom court pour le chip.
 */
type ChipOption = { id: string; label: string };

function useCompetitionChips(upcoming: UpcomingMatch[]): ChipOption[] {
  return useMemo(() => {
    const seen = new Map<string, ChipOption>();
    for (const m of upcoming) {
      const c = m.competition;
      if (!seen.has(c.id)) {
        seen.set(c.id, { id: c.id, label: c.name });
      }
    }
    return Array.from(seen.values());
  }, [upcoming]);
}

function useFilteredUpcoming(
  upcoming: UpcomingMatch[],
  competitionId: string | null,
): UpcomingMatch[] {
  return useMemo(() => {
    const filtered = competitionId
      ? upcoming.filter((m) => m.competition.id === competitionId)
      : upcoming;
    return filtered.slice(0, VISIBLE_LIMIT);
  }, [upcoming, competitionId]);
}

/**
 * Reset auto du filtre si la compétition sélectionnée disparaît (changement
 * de mode, fin de compétition, etc.). Renvoie le competitionId effectif.
 */
function useActiveCompetitionId(
  competitionId: string | null,
  chips: ChipOption[],
): [string | null, (id: string | null) => void] {
  const [internal, setInternal] = useState<string | null>(competitionId);

  useEffect(() => {
    if (internal && !chips.some((c) => c.id === internal)) {
      setInternal(null);
    }
  }, [chips, internal]);

  return [internal, setInternal];
}

export function CompetitionsDesktop({ upcoming }: { upcoming: ModeData['upcoming'] }) {
  const chips = useCompetitionChips(upcoming);
  const [competitionId, setCompetitionId] = useActiveCompetitionId(null, chips);
  const visible = useFilteredUpcoming(upcoming, competitionId);

  return (
    <div style={{ padding: 'clamp(36px, 5vw, 48px) clamp(20px, 4.5vw, 64px)', background: LRH.navy, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...mono, fontSize: 11, color: LRH.gold, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
            03 · Calendrier
          </div>
          <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(28px, 3.4vw, 40px)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            Les prochaines journées.
          </h2>
        </div>
        {chips.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ChipDark
              active={competitionId === null}
              onClick={() => setCompetitionId(null)}
            >Toutes</ChipDark>
            {chips.map((c) => (
              <ChipDark
                key={c.id}
                active={competitionId === c.id}
                onClick={() => setCompetitionId(c.id)}
              >{c.label}</ChipDark>
            ))}
          </div>
        )}
      </div>
      {visible.length === 0 ? (
        <div style={{ padding: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
          <p style={{ ...body, fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            {competitionId
              ? 'Aucun match programmé dans cette compétition.'
              : 'Aucun match programmé pour le moment.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 14 }}>
          {visible.map((m) => <UpcomingMatchCard key={m.id} match={m} variant="desktop" />)}
        </div>
      )}
    </div>
  );
}

export function CompetitionsMobile({ upcoming }: { upcoming: ModeData['upcoming'] }) {
  const chips = useCompetitionChips(upcoming);
  const [competitionId, setCompetitionId] = useActiveCompetitionId(null, chips);
  const visible = useFilteredUpcoming(upcoming, competitionId);

  return (
    <div style={{ padding: '36px 0 0' }}>
      <div style={{ padding: '0 16px' }}>
        <MobileSectionLabel kicker="02 · Calendrier" />
        <MobileSectionTitle>Les prochaines journées.</MobileSectionTitle>
      </div>
      {chips.length > 0 && (
        <div style={{ marginTop: 18, padding: '0 16px 4px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          <ChipLight
            active={competitionId === null}
            onClick={() => setCompetitionId(null)}
          >Toutes</ChipLight>
          {chips.map((c) => (
            <ChipLight
              key={c.id}
              active={competitionId === c.id}
              onClick={() => setCompetitionId(c.id)}
            >{c.label}</ChipLight>
          ))}
        </div>
      )}
      <div style={{ marginTop: 14, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.length === 0 ? (
          <Card style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: 0 }}>
              {competitionId
                ? 'Aucun match dans cette compétition.'
                : 'Aucun match programmé.'}
            </p>
          </Card>
        ) : visible.map((m) => <UpcomingMatchCard key={m.id} match={m} variant="mobile" />)}
      </div>
    </div>
  );
}
