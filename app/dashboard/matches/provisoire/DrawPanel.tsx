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
import { type CoverageStatus } from '@/lib/scheduling/coverage';
import {
  computeCompetitionState,
  type StateSlot,
  type CompetitionFormat,
  type Step,
} from '@/lib/scheduling/competitionState';
import {
  drawCompetitionOnCalendar,
  clearCompetitionDraw,
  setDraftSlotPinned,
  autoFitCalendarForCompetition,
  revertConvertedSlot,
  generateFinalsFromResults,
} from '@/lib/actions/draftCalendar';

export type DrawPanelSlot = {
  id: string;
  matchday: number;
  slotIndex: number;
  date: string;
  competitionId: string | null;
  plannedHomeClubId?: string | null;
  plannedAwayClubId?: string | null;
  isPinned?: boolean | null;
  convertedMatchId?: string | null;
  /** « Finale », « Match 3e place »… posé par l'ajustement du calendrier. */
  label?: string | null;
};

export type DrawPanelClub = { id: string; name: string; shortCode: string | null };

export type DrawPanelCompetition = {
  competitionId: string;
  name: string;
  doubleRound: boolean;
  /** CHAMPIONSHIP_PLAYOFFS → une journée de plus, 2 matchs (3e place + finale). */
  hasFinals: boolean;
  /**
   * CUP → tableau à élimination directe. Le panneau ne sait pas encore le
   * tirer : il compterait les matchs avec la formule du round-robin (6 au lieu
   * de 4 pour 4 équipes) et générerait un tous-contre-tous. On bloque tant que
   * le support n'est pas écrit, plutôt que de produire un calendrier faux.
   */
  isCup: boolean;
};

/** 3e place + finale. Ces créneaux ne sont jamais remplis par le tirage. */
const FINALS_SLOTS = 2;

/** Couleur d'état — jamais seule porteuse du sens, toujours doublée d'un texte. */
const TONE: Record<CoverageStatus, { color: string; bg: string; mark: string; label: string }> = {
  'no-teams':      { color: LRH.red,  bg: '#FDF2F3', mark: '!', label: 'Équipes manquantes' },
  'no-slots':      { color: LRH.red,  bg: '#FDF2F3', mark: '!', label: 'Aucun créneau' },
  'missing-slots': { color: LRH.red,  bg: '#FDF2F3', mark: '!', label: 'Créneaux manquants' },
  'extra-slots':   { color: '#B45309', bg: '#FFFBEB', mark: '~', label: 'Créneaux en trop' },
  'partial':       { color: '#B45309', bg: '#FFFBEB', mark: '~', label: 'Tirage incomplet' },
  'unbalanced-bracket': { color: LRH.red, bg: '#FDF2F3', mark: '!', label: 'Effectif incompatible' },
  'not-drawn':     { color: LRH.navy, bg: '#F1F5F9', mark: '·', label: 'Prêt à tirer' },
  'ready':         { color: '#1d6b3f', bg: '#F0FDF4', mark: '✓', label: 'Tirage complet' },
};

export function DrawPanel({
  calendarId,
  competitions,
  slots,
  clubs,
  teamCountByCompetition,
}: {
  calendarId: string;
  competitions: DrawPanelCompetition[];
  slots: DrawPanelSlot[];
  clubs: DrawPanelClub[];
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
            clubs={clubs}
            teamCount={teamCountByCompetition[c.competitionId] ?? 0}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Progression en quatre étapes. Ce n'est pas décoratif : c'est ce qui répond
 * à « je ne sais pas où cliquer ni dans quel ordre ». L'étape courante est
 * mise en avant, les autres restent lisibles.
 */
function StepStrip({ steps, current }: { steps: Step[]; current: string }) {
  const COLORS: Record<Step['status'], string> = {
    done: '#1d6b3f',
    doing: '#B45309',
    blocked: LRH.red,
    todo: LRH.mute,
  };
  const MARKS: Record<Step['status'], string> = {
    done: '✓', doing: '⋯', blocked: '!', todo: '·',
  };

  return (
    <ol
      style={{
        listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 14,
        margin: '8px 0 0', padding: 0,
      }}
    >
      {steps.map((s, i) => {
        const isCurrent = s.id === current;
        return (
          <li
            key={s.id}
            aria-current={isCurrent ? 'step' : undefined}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 6,
              opacity: isCurrent || s.status === 'done' ? 1 : 0.7,
            }}
          >
            <span style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.1em' }}>
              {i + 1}
            </span>
            <span
              style={{
                ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: COLORS[s.status],
                textDecoration: isCurrent ? 'underline' : 'none',
                textUnderlineOffset: 3,
              }}
            >
              <span aria-hidden="true">{MARKS[s.status]}</span> {s.label}
            </span>
            <span style={{ ...body, fontSize: 11, color: LRH.mute }}>{s.detail}</span>
          </li>
        );
      })}
    </ol>
  );
}

function CompetitionRow({
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
  const finalsPending = slots.some(
    (s) => (s.label === 'Finale' || s.label === 'Match 3e place') && !s.convertedMatchId,
  );
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

          {finalsPending && (
            <button
              type="button"
              onClick={handleGenerateFinals}
              disabled={isPending}
              title="Crée la finale et le match de 3e place à partir du classement ou des vainqueurs"
              style={{
                ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '0 16px', minHeight: 48,
                background: 'transparent', color: '#1d6b3f',
                border: `1px solid #1d6b3f`,
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              🏆 Générer la phase finale
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
function DrawList({
  slots,
  clubs,
  disabled,
  onError,
}: {
  slots: DrawPanelSlot[];
  clubs: DrawPanelClub[];
  disabled: boolean;
  onError: (text: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const clubLabel = useMemo(() => {
    const m = new Map(clubs.map((c) => [c.id, c.shortCode || c.name]));
    return (id: string | null | undefined) => (id ? m.get(id) ?? '?' : '?');
  }, [clubs]);

  const byMatchday = useMemo(() => {
    const m = new Map<number, DrawPanelSlot[]>();
    for (const s of slots) {
      if (!s.plannedHomeClubId || !s.plannedAwayClubId) continue;
      m.set(s.matchday, [...(m.get(s.matchday) ?? []), s]);
    }
    return [...m.entries()]
      .map(([matchday, list]) => ({
        matchday,
        date: list[0].date,
        list: [...list].sort((a, b) => a.slotIndex - b.slotIndex),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [slots]);

  const unpublish = (slot: DrawPanelSlot, affiche: string) => {
    if (!confirm(
      `Dépublier ${affiche} ?

Le match est supprimé du site et le créneau redevient modifiable. `
      + `Aucun résultat n'est perdu : l'opération est refusée si un score a été saisi.`,
    )) return;
    startTransition(async () => {
      try {
        await revertConvertedSlot(slot.id);
        router.refresh();
      } catch (e: unknown) {
        onError(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  const togglePin = (slot: DrawPanelSlot) => {
    startTransition(async () => {
      try {
        await setDraftSlotPinned(slot.id, !slot.isPinned);
        router.refresh();
      } catch (e: unknown) {
        onError(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  return (
    <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
      {byMatchday.map(({ matchday, date, list }) => (
        <div key={matchday}>
          <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
            J{matchday} · {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </div>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
            {list.map((s) => {
              const converted = Boolean(s.convertedMatchId);
              const affiche = `${clubLabel(s.plannedHomeClubId)} – ${clubLabel(s.plannedAwayClubId)}`;
              return (
                <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...body, fontSize: 13, color: LRH.ink, flex: 1, minWidth: 0 }}>
                    {affiche}
                    {converted && (
                      <span style={{ ...mono, fontSize: 9, color: '#1d6b3f', marginLeft: 8, letterSpacing: '0.1em' }}>
                        CONVERTI
                      </span>
                    )}
                  </span>

                  {converted ? (
                    // Rien n'est definitif tant qu'aucun score n'est saisi :
                    // depublier supprime le match et rend le creneau au tirage.
                    // L'action serveur refuse si un resultat existe.
                    <button
                      type="button"
                      onClick={() => unpublish(s, affiche)}
                      disabled={disabled || isPending}
                      aria-label={`Dépublier ${affiche} — le match est supprimé et le créneau redevient modifiable`}
                      title="Supprime le match et rend le créneau au tirage"
                      style={{
                        ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', minHeight: 44, padding: '0 12px',
                        border: `1px solid ${LRH.hairStrong}`, background: 'transparent',
                        color: LRH.red, flexShrink: 0,
                        cursor: disabled || isPending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Dépublier
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => togglePin(s)}
                      disabled={disabled || isPending}
                      aria-pressed={Boolean(s.isPinned)}
                      aria-label={
                        s.isPinned
                          ? `Désépingler ${affiche} — l'affiche pourra changer au prochain tirage`
                          : `Épingler ${affiche} — l'affiche restera à cette place aux prochains tirages`
                      }
                      title={s.isPinned ? 'Épinglée : les prochains tirages la conserveront' : 'Épingler cette affiche'}
                      style={{
                        ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', minHeight: 44, padding: '0 12px',
                        border: `1px solid ${s.isPinned ? LRH.gold : LRH.hairStrong}`,
                        background: s.isPinned ? LRH.gold : 'transparent',
                        color: s.isPinned ? LRH.navy : LRH.mute,
                        cursor: disabled || isPending ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <span aria-hidden="true">📌</span> {s.isPinned ? 'Épinglée' : 'Épingler'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
