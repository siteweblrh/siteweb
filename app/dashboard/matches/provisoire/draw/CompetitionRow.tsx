'use client';

// Une compétition dans le panneau de tirage : sa progression, son diagnostic,
// et les actions possibles. Tout ce qui est décidé ici vient de
// computeCompetitionState — ce composant ne fait que le rendre.

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import {
  computeCompetitionState,
  type StateSlot,
  type CompetitionFormat,
} from '@/lib/scheduling/competitionState';
import {
  drawCompetitionOnCalendar,
  clearCompetitionDraw,
  autoFitCalendarForCompetition,
  generateFinalsFromResults,
  createFinalsMatches,
} from '@/lib/actions/draftDraw';
import { TONE } from './tone';
import { StepStrip } from './StepStrip';
import { DrawList } from './DrawList';
import { FINALS_SLOTS, type DrawPanelSlot, type DrawPanelClub, type DrawPanelCompetition } from './types';

export function CompetitionRow({
  calendarId,
  competition,
  slots,
  clubs,
  teamCount,
}: {
  calendarId: string;
  competition: DrawPanelCompetition;
  slots: DrawPanelSlot[];
  clubs: DrawPanelClub[];
  teamCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [showDraw, setShowDraw] = useState(false);

  // Une seule source de vérité : l'état décide, ce composant ne fait que le
  // rendre. Les conditions étaient auparavant recalculées bouton par bouton,
  // et divergeaient — deux bugs en une journée en sont sortis.
  const state = useMemo(() => {
    const mapped: StateSlot[] = slots.map((s) => ({
      matchday: s.matchday,
      date: s.date,
      plannedHomeClubId: s.plannedHomeClubId ?? null,
      plannedAwayClubId: s.plannedAwayClubId ?? null,
      isPinned: Boolean(s.isPinned),
      converted: Boolean(s.convertedMatchId),
    }));
    const format: CompetitionFormat = competition.isCup
      ? 'CUP'
      : competition.hasFinals ? 'CHAMPIONSHIP_PLAYOFFS' : 'CHAMPIONSHIP';
    return computeCompetitionState({
      format, teamCount, doubleRound: competition.doubleRound, slots: mapped,
    });
  }, [slots, teamCount, competition.doubleRound, competition.hasFinals, competition.isCup]);

  const { coverage, actions } = state;

  // Phase finale réservée mais pas encore créée : on peut la générer depuis
  // les résultats plutôt que de demander des équipes qu'on ne connaît pas.
  // Déduit de la structure, pas du libellé : les créneaux encore libres de la
  // dernière date. Un critère fondé sur `label` ne voyait rien sur les
  // calendriers ajustés avant l'introduction des libellés.
  // Deux gestes distincts sur la phase finale :
  //   - la CRÉER dès maintenant, avec la règle de qualification à la place des
  //     équipes, pour que le calendrier soit présentable aux clubs ;
  //   - la RENSEIGNER une fois les résultats connus.
  const finals = useMemo(() => {
    if (!competition.hasFinals && !competition.isCup) {
      return { canCreate: false, canFill: false };
    }
    const lastDate = slots.reduce((acc, s) => (s.date > acc ? s.date : acc), '');
    const lastDaySlots = slots.filter((s) => s.date === lastDate);
    if (lastDaySlots.length === 0) return { canCreate: false, canFill: false };
    const free = lastDaySlots.filter((s) => !s.convertedMatchId);
    return { canCreate: free.length > 0, canFill: free.length === 0 };
  }, [slots, competition.hasFinals, competition.isCup]);
  const tone = TONE[coverage.status];
  const canDraw = actions.draw.allowed;
  const canAutoFit = actions.autoFit.allowed;
  // L'ajustement n'est mis en avant que s'il y a réellement quelque chose à
  // corriger — sinon il reste discret.
  const needsFix = !canDraw && canAutoFit;

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
      // Les créneaux de phase finale restent vides par construction : les
      // équipes dépendent du classement. Ne pas les signaler comme un défaut.
      const unexpectedEmpty = r.emptySlots - (competition.hasFinals ? FINALS_SLOTS : 0);
      if (unexpectedEmpty > 0 && !competition.isCup) bits.push(`${unexpectedEmpty} créneau(x) vide(s)`);
      if (competition.hasFinals) bits.push('phase finale à saisir à la main');
      if (competition.isCup) bits.push('tours suivants à saisir une fois les vainqueurs connus');
      return bits.join(' · ');
    });
  };

  const handleAutoFit = () => {
    const extra = coverage.slotDelta < 0 ? -coverage.slotDelta : 0;
    const msg = [
      'Ajuster le calendrier de cette compétition ?',
      '',
      `${coverage.teamCount} équipes · ${competition.isCup ? 'élimination directe' : competition.doubleRound ? 'aller-retour' : 'aller simple'} → ${coverage.expectedMatches} matchs.`,
      'Les journées seront redimensionnées, et une date de phase finale réservée si le format en prévoit une.',
      extra > 0 ? `${extra} créneau(x) en trop seront libérés.` : '',
      '',
      'Le tirage en cours sera remis à zéro.',
    ].filter(Boolean).join('\n');
    if (!confirm(msg)) return;

    run(async () => {
      const r = await autoFitCalendarForCompetition(calendarId, competition.competitionId);
      const bits = [`${r.regularDays} journée${r.regularDays > 1 ? 's' : ''} de ${r.perDay}`];
      if (r.finalsDate) bits.push('+ 1 date de phase finale');
      if (r.datesFreed > 0) bits.push(`${r.datesFreed} date(s) libérée(s)`);
      return bits.join(' · ');
    });
  };

  const handleCreateFinals = () => {
    run(async () => {
      const r = await createFinalsMatches(calendarId, competition.competitionId);
      return r.hasThirdPlace
        ? 'Finale et match de 3e place créés — équipes à renseigner après les résultats'
        : 'Finale créée — équipe à renseigner après les résultats';
    });
  };

  const handleGenerateFinals = () => {
    run(async () => {
      const r = await generateFinalsFromResults(calendarId, competition.competitionId);
      return r.hasThirdPlace
        ? 'Finale et match de 3e place créés'
        : 'Finale créée';
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

          <StepStrip steps={state.steps} current={state.currentStep} />

          <div style={{ ...mono, fontSize: 10, color: tone.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
            <span aria-hidden="true">{tone.mark}</span> {tone.label}
          </div>

          {/* `role=status` : le lecteur d'écran annonce le nouveau compte
              après un tirage sans qu'il faille déplacer le focus. */}
          <p role="status" style={{ ...body, fontSize: 13, color: LRH.ink, margin: '6px 0 0', lineHeight: 1.45 }}>
            {teamCount} équipe{teamCount > 1 ? 's' : ''} ·{' '}
            {competition.isCup
              ? 'élimination directe'
              : competition.doubleRound ? 'aller-retour' : 'aller simple'}
            <br />
            {coverage.message}
          </p>

          {!actions.draw.allowed && (
            <p style={{ ...body, fontSize: 12, color: '#B45309', margin: '6px 0 0', lineHeight: 1.45 }}>
              → {actions.draw.reason}
              {needsFix && ' « Ajuster le calendrier » s’en charge.'}
            </p>
          )}

          {actions.draw.allowed && coverage.hint && (
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
          {needsFix && (
            <button
              type="button"
              onClick={handleAutoFit}
              disabled={isPending}
              style={{
                ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '0 18px', minHeight: 48,
                background: LRH.gold, color: LRH.navy, border: 'none',
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              ⚙ Ajuster le calendrier
            </button>
          )}

          <button
            type="button"
            onClick={handleDraw}
            disabled={isPending || !canDraw}
            title={actions.draw.allowed ? undefined : actions.draw.reason}
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

          {(finals.canCreate || finals.canFill) && (
            <button
              type="button"
              onClick={finals.canCreate ? handleCreateFinals : handleGenerateFinals}
              disabled={isPending}
              title={finals.canCreate
                ? "Crée la finale et le match de 3e place dès maintenant, avec la règle de qualification à la place des équipes"
                : "Remplace les règles de qualification par les équipes réellement qualifiées"}
              style={{
                ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '0 16px', minHeight: 48,
                background: 'transparent', color: '#1d6b3f',
                border: `1px solid #1d6b3f`,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              🏆 {finals.canCreate ? 'Créer la phase finale' : 'Renseigner les équipes'}
            </button>
          )}

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

      {coverage.plannedCount > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowDraw((v) => !v)}
            aria-expanded={showDraw}
            style={{
              ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: LRH.navy, background: 'transparent',
              border: 'none', cursor: 'pointer', padding: '12px 0 0', minHeight: 44,
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            {showDraw ? 'Masquer' : 'Voir'} les {coverage.plannedCount} affiches
          </button>

          {showDraw && (
            <DrawList
              slots={slots}
              clubs={clubs}
              disabled={isPending}
              onError={(text) => setFeedback({ kind: 'error', text })}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Liste des affiches tirées, groupées par journée, avec l'épinglage.
 *
 * Épingler fige une affiche à sa place : les tirages suivants composent autour
 * d'elle. C'est ce qui permet de fixer un derby à une date sans renoncer au
 * tirage automatique du reste.
 */
