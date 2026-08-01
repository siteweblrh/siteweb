'use client';

// Panneau de tirage au sort d'un calendrier provisoire.
//
// Rôle : rendre lisible, pour quelqu'un qui ne connaît pas la théorie des
// round-robins, l'écart entre « ce qu'il y a à jouer » et « ce qui est
// configuré ». L'admin lit un compte, corrige sa configuration, puis lance le
// tirage. Aucun calcul mental n'est demandé.
//
// La couverture est calculée dans le navigateur à partir des créneaux déjà
// chargés par la page — pas d'aller-retour base pour des données en mémoire.

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { computeCoverage, type CoverageSlot, type CoverageStatus } from '@/lib/scheduling/coverage';
import { drawCompetitionOnCalendar, clearCompetitionDraw } from '@/lib/actions/draftCalendar';

export type DrawPanelSlot = {
  competitionId: string | null;
  plannedHomeClubId?: string | null;
  plannedAwayClubId?: string | null;
  isPinned?: boolean | null;
  convertedMatchId?: string | null;
};

export type DrawPanelCompetition = {
  competitionId: string;
  name: string;
  doubleRound: boolean;
};

/** Couleur d'état — jamais seule porteuse du sens, toujours doublée d'un texte. */
const TONE: Record<CoverageStatus, { color: string; bg: string; mark: string; label: string }> = {
  'no-teams':      { color: LRH.red,  bg: '#FDF2F3', mark: '!', label: 'Équipes manquantes' },
  'no-slots':      { color: LRH.red,  bg: '#FDF2F3', mark: '!', label: 'Aucun créneau' },
  'missing-slots': { color: LRH.red,  bg: '#FDF2F3', mark: '!', label: 'Créneaux manquants' },
  'extra-slots':   { color: '#B45309', bg: '#FFFBEB', mark: '~', label: 'Créneaux en trop' },
  'partial':       { color: '#B45309', bg: '#FFFBEB', mark: '~', label: 'Tirage incomplet' },
  'not-drawn':     { color: LRH.navy, bg: '#F1F5F9', mark: '·', label: 'Prêt à tirer' },
  'ready':         { color: '#1d6b3f', bg: '#F0FDF4', mark: '✓', label: 'Tirage complet' },
};

export function DrawPanel({
  calendarId,
  competitions,
  slots,
  teamCountByCompetition,
}: {
  calendarId: string;
  competitions: DrawPanelCompetition[];
  slots: DrawPanelSlot[];
  /** Nombre d'équipes inscrites, par compétition. */
  teamCountByCompetition: Record<string, number>;
}) {
  if (competitions.length === 0) return null;

  return (
    <section
      aria-label="Tirage au sort"
      style={{ border: `1px dashed ${LRH.hairStrong}`, padding: 16, marginTop: 16 }}
    >
      <h3
        style={{
          ...mono, fontSize: 10, fontWeight: 700, color: LRH.red,
          letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 12px',
        }}
      >
        Tirage au sort
      </h3>

      <div style={{ display: 'grid', gap: 12 }}>
        {competitions.map((c) => (
          <CompetitionRow
            key={c.competitionId}
            calendarId={calendarId}
            competition={c}
            slots={slots.filter((s) => s.competitionId === c.competitionId)}
            teamCount={teamCountByCompetition[c.competitionId] ?? 0}
          />
        ))}
      </div>
    </section>
  );
}

function CompetitionRow({
  calendarId,
  competition,
  slots,
  teamCount,
}: {
  calendarId: string;
  competition: DrawPanelCompetition;
  slots: DrawPanelSlot[];
  teamCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const coverage = useMemo(() => {
    const mapped: CoverageSlot[] = slots.map((s) => ({
      plannedHomeClubId: s.plannedHomeClubId ?? null,
      plannedAwayClubId: s.plannedAwayClubId ?? null,
      isPinned: Boolean(s.isPinned),
      converted: Boolean(s.convertedMatchId),
    }));
    return computeCoverage(teamCount, competition.doubleRound, mapped);
  }, [slots, teamCount, competition.doubleRound]);

  const tone = TONE[coverage.status];
  const canDraw = coverage.status !== 'no-teams' && coverage.status !== 'no-slots';

  const run = (fn: () => Promise<string>) => {
    setFeedback(null);
    startTransition(async () => {
      try {
        setFeedback({ kind: 'ok', text: await fn() });
        router.refresh();
      } catch (e: unknown) {
        setFeedback({ kind: 'error', text: e instanceof Error ? e.message : 'Erreur' });
      }
    });
  };

  const handleDraw = () => {
    if (coverage.convertedCount > 0 || coverage.pinnedCount > 0) {
      const parts = [
        coverage.convertedCount > 0 ? `${coverage.convertedCount} match(s) déjà converti(s)` : null,
        coverage.pinnedCount > 0 ? `${coverage.pinnedCount} affiche(s) épinglée(s)` : null,
      ].filter(Boolean).join(' et ');
      if (!confirm(`Relancer le tirage ?\n\n${parts} : ces créneaux ne seront pas modifiés. Le reste sera redistribué.`)) {
        return;
      }
    }
    run(async () => {
      const r = await drawCompetitionOnCalendar({
        draftCalendarId: calendarId,
        competitionId: competition.competitionId,
      });
      const bits = [`${r.placed} affiche${r.placed > 1 ? 's' : ''} placée${r.placed > 1 ? 's' : ''}`];
      if (r.unplaced > 0) bits.push(`${r.unplaced} sans créneau`);
      if (r.emptySlots > 0) bits.push(`${r.emptySlots} créneau(x) vide(s)`);
      return bits.join(' · ');
    });
  };

  const handleClear = () => {
    if (!confirm('Effacer le tirage ?\n\nLes matchs déjà convertis et les affiches épinglées sont conservés.')) return;
    run(async () => {
      const r = await clearCompetitionDraw(calendarId, competition.competitionId);
      return `${r.cleared} créneau${r.cleared > 1 ? 'x' : ''} remis à zéro`;
    });
  };

  return (
    <div style={{ borderLeft: `4px solid ${tone.color}`, background: tone.bg, padding: '12px 14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 240, flex: '1 1 320px' }}>
          <div style={{ ...display, fontSize: 15, fontWeight: 700, color: LRH.navy, letterSpacing: '-0.01em' }}>
            {competition.name}
          </div>

          <div style={{ ...mono, fontSize: 10, color: tone.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
            <span aria-hidden="true">{tone.mark}</span> {tone.label}
          </div>

          {/* `role=status` : le lecteur d'écran annonce le nouveau compte
              après un tirage sans qu'il faille déplacer le focus. */}
          <p role="status" style={{ ...body, fontSize: 13, color: LRH.ink, margin: '6px 0 0', lineHeight: 1.45 }}>
            {teamCount} équipe{teamCount > 1 ? 's' : ''} · {competition.doubleRound ? 'aller-retour' : 'aller simple'}
            <br />
            {coverage.message}
          </p>

          {coverage.hint && (
            <p style={{ ...body, fontSize: 12, color: LRH.mute, margin: '4px 0 0' }}>
              → {coverage.hint}
            </p>
          )}

          {feedback && (
            <p
              role={feedback.kind === 'error' ? 'alert' : 'status'}
              style={{
                ...mono, fontSize: 11, margin: '8px 0 0',
                color: feedback.kind === 'error' ? LRH.red : '#1d6b3f',
              }}
            >
              {feedback.text}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDraw}
            disabled={isPending || !canDraw}
            style={{
              ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '0 18px', minHeight: 48,
              background: canDraw ? LRH.navy : LRH.hairStrong,
              color: '#fff', border: 'none',
              cursor: isPending || !canDraw ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? 'En cours…' : coverage.plannedCount > 0 ? 'Retirer au sort' : 'Tirer au sort'}
          </button>

          {coverage.plannedCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isPending}
              style={{
                ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '0 16px', minHeight: 48,
                background: 'transparent', color: LRH.red,
                border: `1px solid ${LRH.red}`,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              Effacer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
