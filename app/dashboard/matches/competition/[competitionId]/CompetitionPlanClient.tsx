'use client';

// Pilotage d'une compétition : les quatre étapes, puis ses journées.
//
// Ce composant ne DÉCIDE rien. `computeCompetitionState` donne les étapes et
// l'état des actions, `computeMatchdays` donne l'état de chaque journée — tous
// deux purs et testés. Ici on ne fait que rendre. C'est la leçon du 1er août :
// les conditions d'affichage éparpillées finissaient par se contredire.

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { computeCompetitionState, type CompetitionFormat } from '@/lib/scheduling/competitionState';
import { computeMatchdays, matchdayLabel, type MatchdayStatus } from '@/lib/scheduling/matchdayState';
import { unpublishMatchday } from '@/lib/actions/draftCalendar';
import { useConfirm } from '@/components/lrh/dashboard/useConfirm';
import { StepStrip } from '../../provisoire/draw/StepStrip';
import { ConvertMatchdayModal, type SlotForConversion } from '../../provisoire/ConvertMatchdayModal';
import type {
  DraftSlotData,
  ClubOptionLite,
  VenueOptionLite,
  RefereeOptionLite,
} from '../../provisoire/draft/types';

type CompetitionLite = {
  id: string;
  name: string;
  mode: string;
  category: string;
  season: string;
  format: string;
  doubleRound?: boolean;
  fairnessEnabled?: boolean;
};

const STATUS_TONE: Record<MatchdayStatus, React.CSSProperties> = {
  vide: { background: LRH.paperWarm, color: LRH.mute },
  tiree: { background: LRH.gold, color: LRH.navy },
  partielle: { background: LRH.gold, color: LRH.navy },
  publiee: { background: '#1B7340', color: '#fff' },
  jouee: { background: LRH.navy, color: '#fff' },
};

export function CompetitionPlanClient({
  calendarId,
  calendarName,
  season,
  competition,
  slots,
  clubs,
  venues,
  referees,
  teamCount,
  entriesByCompetition,
}: {
  calendarId: string;
  calendarName: string;
  season: string;
  competition: CompetitionLite;
  slots: DraftSlotData[];
  clubs: ClubOptionLite[];
  venues: VenueOptionLite[];
  referees: RefereeOptionLite[];
  teamCount: number;
  entriesByCompetition: Record<string, string[]>;
}) {
  const router = useRouter();
  const [ask, confirmDialog] = useConfirm();
  const [busy, startBusy] = useTransition();
  const [convertOpen, setConvertOpen] = useState<null | {
    matchday: number;
    dateLabel: string;
    slots: SlotForConversion[];
  }>(null);

  const clubById = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs]);
  const entriesMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const [compId, ids] of Object.entries(entriesByCompetition)) m.set(compId, new Set(ids));
    return m;
  }, [entriesByCompetition]);

  const format = (competition.format as CompetitionFormat) ?? 'CHAMPIONSHIP';

  const state = useMemo(
    () =>
      computeCompetitionState({
        format,
        teamCount,
        doubleRound: competition.doubleRound ?? false,
        slots: slots.map((s) => ({
          matchday: s.matchday,
          date: s.date.slice(0, 10),
          plannedHomeClubId: s.plannedHomeClubId ?? null,
          plannedAwayClubId: s.plannedAwayClubId ?? null,
          isPinned: s.isPinned ?? false,
          converted: Boolean(s.convertedMatchId),
        })),
      }),
    [format, teamCount, competition.doubleRound, slots],
  );

  const matchdays = useMemo(
    () =>
      computeMatchdays(
        slots.map((s) => ({
          slotId: s.id,
          matchday: s.matchday,
          date: s.date.slice(0, 10),
          plannedHomeClubId: s.plannedHomeClubId ?? null,
          plannedAwayClubId: s.plannedAwayClubId ?? null,
          match: s.convertedMatch
            ? {
                status: s.convertedMatch.status,
                homeScore: s.convertedMatch.homeScore,
                awayScore: s.convertedMatch.awayScore,
              }
            : null,
        })),
      ),
    [slots],
  );

  const slotsByMatchday = useMemo(() => {
    const m = new Map<number, DraftSlotData[]>();
    for (const s of slots) {
      const b = m.get(s.matchday);
      if (b) b.push(s);
      else m.set(s.matchday, [s]);
    }
    return m;
  }, [slots]);

  const label = (id: string | null | undefined) =>
    id ? (clubById.get(id)?.shortCode ?? clubById.get(id)?.name ?? '?') : null;

  const onUnpublish = async (matchday: number, count: number, dateLabel: string) => {
    const quoi = count > 1 ? `les ${count} matchs publiés` : 'le match publié';
    const ok = await ask({
      title: `Dépublier la journée du ${dateLabel} ?`,
      message:
        (count > 1 ? `Les ${count} matchs publiés seront supprimés.` : 'Le match publié sera supprimé.')
        + `

La journée revient à l'état « tirée » : les affiches du tirage restent en place, `
        + `seuls les matchs officiels disparaissent. Aucun score n'est saisi, rien n'est perdu.`,
      confirmLabel: 'Dépublier',
      danger: true,
    });
    if (!ok) return;
    startBusy(async () => {
      try {
        await unpublishMatchday(calendarId, matchday);
        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  const openPublish = (matchday: number, dateLabel: string) => {
    const group = (slotsByMatchday.get(matchday) ?? []).filter(
      (s) => !s.convertedMatchId && s.competitionId && s.competition,
    );
    setConvertOpen({
      matchday,
      dateLabel,
      slots: group.map((s) => ({
        id: s.id,
        date: s.date,
        matchday: s.matchday,
        slotIndex: s.slotIndex,
        competitionId: s.competitionId!,
        competitionName: s.competition!.name,
        competitionDoubleRound: s.competition!.doubleRound ?? false,
        competitionFairnessEnabled: s.competition!.fairnessEnabled ?? false,
        plannedHomeClubId: s.plannedHomeClubId ?? null,
        plannedAwayClubId: s.plannedAwayClubId ?? null,
      })),
    });
  };

  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short',
    });

  const traits = [
    `${teamCount} équipe${teamCount > 1 ? 's' : ''}`,
    competition.doubleRound ? 'aller-retour' : 'aller simple',
    format === 'CHAMPIONSHIP_PLAYOFFS' ? 'avec phase finale' : null,
    format === 'CUP' ? 'élimination directe' : null,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {confirmDialog}
      <div>
        <Link
          href="/dashboard/matches/calendar?mode=brouillon"
          style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none' }}
        >
          ← {calendarName}
        </Link>
        <h2 style={{ ...display, fontWeight: 800, fontSize: 'clamp(20px, 4vw, 30px)', color: LRH.navy, margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
          {competition.name}
        </h2>
        <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.1em' }}>
          {season} · {traits}
        </div>
      </div>

      <StepStrip steps={state.steps} current={state.currentStep} />

      <section aria-label="Journées">
        <h3 style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.red, letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Journées
        </h3>

        {matchdays.length === 0 && (
          <div style={{ ...body, fontSize: 13, color: LRH.mute, padding: 24, border: `1px dashed ${LRH.hairStrong}`, background: '#fff' }}>
            Aucune date réservée pour cette compétition. Ajoutez-la à une date depuis le calendrier de saison.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {matchdays.map((j, i) => {
            const group = slotsByMatchday.get(j.matchday) ?? [];
            const affiches = group
              .map((s) => {
                const h = label(s.plannedHomeClubId ?? s.convertedMatch?.homeClubId);
                const a = label(s.plannedAwayClubId ?? s.convertedMatch?.awayClubId);
                return h && a ? `${h}-${a}` : (s.label ?? null);
              })
              .filter(Boolean);

            return (
              <div
                key={j.matchday}
                className="lrh-admin-row"
                style={{
                  background: '#fff', border: `1px solid ${LRH.hair}`,
                  borderLeft: `3px solid ${LRH.navy}`, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}
              >
                <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: LRH.navy, minWidth: 34 }}>
                  J{i + 1}
                </span>
                <span style={{ ...mono, fontSize: 11, color: LRH.ink2, minWidth: 96 }}>
                  {fmtDate(j.date)}
                </span>
                <span style={{ ...body, fontSize: 12, color: LRH.ink2, flex: '1 1 200px', minWidth: 0 }}>
                  {affiches.length > 0 ? affiches.join(' · ') : '—'}
                </span>

                <span style={{
                  ...mono, fontSize: 9, fontWeight: 700, padding: '3px 7px',
                  letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0,
                  ...STATUS_TONE[j.status],
                }}>
                  {matchdayLabel(j.status)}
                  {j.status === 'partielle' ? ` ${j.counts.published}/${j.counts.total}` : ''}
                </span>

                {j.actions.publish.allowed && clubs.length > 0 && (
                  <button
                    onClick={() => openPublish(j.matchday, fmtDate(j.date))}
                    style={{
                      ...mono, fontSize: 10, fontWeight: 700, padding: '5px 10px',
                      background: LRH.navy, color: '#fff', border: 'none', cursor: 'pointer',
                      letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0,
                    }}
                  >
                    Publier
                  </button>
                )}
                {j.actions.unpublish.allowed && (
                  <button
                    onClick={() => onUnpublish(j.matchday, j.counts.published, fmtDate(j.date))}
                    disabled={busy}
                    style={{
                      ...mono, fontSize: 10, fontWeight: 700, padding: '5px 10px',
                      background: 'transparent', color: LRH.red,
                      border: `1px solid ${LRH.red}`, cursor: busy ? 'wait' : 'pointer',
                      opacity: busy ? 0.5 : 1,
                      letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0,
                    }}
                  >
                    Dépublier
                  </button>
                )}
                {/* Un refus ne se montre pas par un bouton mort : on affiche
                    la raison, qui vient du même calcul que l'action. */}
                {j.status === 'jouee' && j.actions.unpublish.allowed === false && (
                  <span style={{ ...mono, fontSize: 9, color: LRH.mute, flexShrink: 0 }}>
                    {j.actions.unpublish.reason}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {convertOpen && (
        <ConvertMatchdayModal
          draftCalendarId={calendarId}
          matchday={convertOpen.matchday}
          dateLabel={convertOpen.dateLabel}
          slots={convertOpen.slots}
          clubs={clubs}
          venues={venues}
          referees={referees}
          entriesByCompetition={entriesMap}
          // La modale rafraîchit elle-même après conversion ; ici on referme.
          onClose={() => { setConvertOpen(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
