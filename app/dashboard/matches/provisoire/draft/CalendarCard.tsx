'use client';

import { useConfirm } from '@/components/lrh/dashboard/useConfirm';
import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import {
  removeCompetitionFromCalendar,
  updateCompetitionPeriod,
  addManualDate,
  removeManualDate,
  removeDateSlots,
  moveDraftCompetitionDate,
  removeDraftCompetitionFromDate,
  setDraftCompetitionDateSlotCount,
  reorderCalendarCompetitions,
} from '@/lib/actions/draftCalendar';
import type {
  DraftCalendarData,
  CompetitionOption,
  ClubOptionLite,
  VenueOptionLite,
  RefereeOptionLite,
} from './types';
import { btnPrimary, btnOutline, btnDanger, sectionLabelStyle } from './styles';
import { formatShortDate } from './dates';
import { DrawPanel } from '../DrawPanel';
import { CompetitionRow } from './CompetitionRow';
import { AddCompetitionForm } from './AddCompetitionForm';
import { SchedulePreview } from './SchedulePreview';
import { EditCalendarForm } from './EditCalendarForm';
import { PdfSelector } from './PdfSelector';

// ---------------------------------------------------------------------------
// Calendar card (simplified)
// ---------------------------------------------------------------------------

export const CalendarCard = React.memo(function CalendarCardImpl({
  cal,
  competitions,
  compToCalendarName,
  clubs,
  venues,
  referees,
  entriesByCompetition,
  expanded,
  onToggle,
  onDelete,
}: {
  cal: DraftCalendarData;
  competitions: CompetitionOption[];
  compToCalendarName: Map<string, string>;
  clubs: ClubOptionLite[];
  venues: VenueOptionLite[];
  referees: RefereeOptionLite[];
  entriesByCompetition: Record<string, string[]>;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddComp, setShowAddComp] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Nombre d'équipes inscrites par compétition — alimente le panneau de
  // tirage, qui en déduit le nombre d'affiches à placer.
  const teamCountByCompetition = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [compId, clubIds] of Object.entries(entriesByCompetition ?? {})) {
      out[compId] = clubIds.length;
    }
    return out;
  }, [entriesByCompetition]);

  const alreadyAddedIds = new Set(cal.competitions.map((c) => c.competitionId));
  // On ne propose QUE les compétitions de la saison du calendrier : sélectionner
  // une compétition d'une autre saison n'a pas de sens et prête à confusion.
  const seasonComps = competitions.filter((c) => c.season === cal.season);
  const availableComps = seasonComps.filter((c) => !alreadyAddedIds.has(c.id));

  const uniqueDates = new Set(cal.slots.filter((s) => s.competitionId).map((s) => new Date(s.date).toISOString().slice(0, 10)));

  // Dernière journée déjà planifiée (toutes compétitions confondues) — sert au
  // mode « enchaîner » du formulaire d'ajout de compétition.
  const [ask, confirmDialog] = useConfirm();
  const lastScheduledDateISO = [...uniqueDates].sort().pop();

  const handleRemoveComp = async (dccId: string, compName: string) => {
    const ok = await ask({
      title: `Retirer « ${compName} » du calendrier ?`,
      message: 'Les dates seront recalculées automatiquement.',
      confirmLabel: 'Retirer', danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try { await removeCompetitionFromCalendar(dccId); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleUpdatePeriod = (dccId: string, field: string, value: string | number) => {
    startTransition(async () => {
      try { await updateCompetitionPeriod(dccId, { [field]: value }); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleRemoveDate = (dateISO: string) => {
    startTransition(async () => {
      try { await removeDateSlots(cal.id, dateISO); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleAddManualDate = (dateISO: string, competitionId: string) => {
    startTransition(async () => {
      try { await addManualDate(cal.id, dateISO, competitionId); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleRemoveManualDate = (dateISO: string) => {
    startTransition(async () => {
      try { await removeManualDate(cal.id, dateISO); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleMoveDate = (competitionId: string, fromISO: string, toISO: string) => {
    startTransition(async () => {
      try { await moveDraftCompetitionDate(cal.id, competitionId, fromISO, toISO); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleSetCount = (competitionId: string, dateISO: string, count: number) => {
    startTransition(async () => {
      try { await setDraftCompetitionDateSlotCount(cal.id, competitionId, dateISO, count); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleRemoveCompFromDate = async (competitionId: string, dateISO: string, compName: string) => {
    const ok = await ask({
      title: `Retirer « ${compName} » de cette date ?`,
      message: 'Les autres compétitions de la journée ne sont pas touchées.',
      confirmLabel: 'Retirer', danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try { await removeDraftCompetitionFromDate(cal.id, competitionId, dateISO); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleReorderComp = (dccId: string, dir: 'up' | 'down') => {
    const ids = cal.competitions.map((c) => c.id);
    const idx = ids.indexOf(dccId);
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    startTransition(async () => {
      try { await reorderCalendarCompetitions(cal.id, ids); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${LRH.hair}`,
      borderLeft: `4px solid ${LRH.navy}`,
      marginBottom: 16,
      opacity: isPending ? 0.85 : 1,
      transition: 'opacity 0.15s',
    }}>
      {confirmDialog}
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '16px 20px', background: 'transparent',
          border: 'none', cursor: 'pointer', gap: 12, textAlign: 'left', minHeight: 48,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...display, fontSize: 18, fontWeight: 700, color: LRH.navy }}>
            {cal.name}
          </div>
          <div style={{ ...mono, fontSize: 11, color: LRH.mute, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>{cal.season}</span>
            <span>{formatShortDate(cal.startDate)} → {formatShortDate(cal.endDate)}</span>
            <span>{cal.competitions.length} compétition{cal.competitions.length > 1 ? 's' : ''}</span>
            {uniqueDates.size > 0 && (
              <span>{uniqueDates.size} date{uniqueDates.size > 1 ? 's' : ''}</span>
            )}
          </div>
          {cal.competitions.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {cal.competitions.map((dcc) => (
                <span
                  key={dcc.id}
                  style={{
                    ...mono, fontSize: 9, padding: '2px 8px',
                    background: dcc.color ?? LRH.navy, color: '#fff',
                    letterSpacing: '0.06em',
                  }}
                >
                  {dcc.competition.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <span style={{ ...mono, fontSize: 14, color: LRH.mute, flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: `1px dashed ${LRH.hairStrong}` }}>

          {/* Empty state — no competitions yet */}
          {cal.competitions.length === 0 && !showAddComp && (
            <div style={{
              padding: 32, textAlign: 'center',
              border: `2px dashed ${LRH.hairStrong}`, background: LRH.paper,
              marginTop: 16,
            }}>
              <div style={{ ...display, fontSize: 16, color: LRH.navy, marginBottom: 8 }}>
                Aucune compétition ajoutée
              </div>
              <div style={{ ...body, fontSize: 13, color: LRH.mute, marginBottom: 16 }}>
                Ajoutez des compétitions pour générer automatiquement le planning.
              </div>
              <button onClick={() => setShowAddComp(true)} style={btnPrimary}>
                + Ajouter une compétition
              </button>
            </div>
          )}

          {/* Competitions section */}
          {cal.competitions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={sectionLabelStyle}>Compétitions</div>
              {cal.competitions.map((dcc, i) => {
                const slotCount = cal.slots.filter((s) => s.competitionId === dcc.competitionId).length;
                return (
                  <CompetitionRow
                    key={dcc.id}
                    dcc={dcc}
                    slotCount={slotCount}
                    isFirst={i === 0}
                    isLast={i === cal.competitions.length - 1}
                    onRemove={() => handleRemoveComp(dcc.id, dcc.competition.name)}
                    onUpdate={(field, value) => handleUpdatePeriod(dcc.id, field, value)}
                    onMoveUp={() => handleReorderComp(dcc.id, 'up')}
                    onMoveDown={() => handleReorderComp(dcc.id, 'down')}
                  />
                );
              })}
              {!showAddComp && availableComps.length > 0 && (
                <button
                  onClick={() => setShowAddComp(true)}
                  style={{ ...btnOutline(LRH.navy), marginTop: 10 }}
                >
                  + Ajouter une compétition
                </button>
              )}
            </div>
          )}

          {/* Add competition form */}
          {showAddComp && (
            <AddCompetitionForm
              calendarId={cal.id}
              calSeason={cal.season}
              seasonHasComps={seasonComps.length > 0}
              calStartDate={cal.startDate.slice(0, 10)}
              calEndDate={cal.endDate.slice(0, 10)}
              calDayOfWeek={cal.dayOfWeek as 'SATURDAY' | 'SUNDAY'}
              calRecurrence={cal.recurrence}
              availableComps={availableComps}
              compToCalendarName={compToCalendarName}
              existingCount={cal.competitions.length}
              lastScheduledDateISO={lastScheduledDateISO}
              onDone={() => { setShowAddComp(false); router.refresh(); }}
              onCancel={() => setShowAddComp(false)}
              startTransition={startTransition}
            />
          )}

          {/* Tirage au sort — couverture + lancement, par compétition */}
          {cal.competitions.length > 0 && (
            <DrawPanel
              calendarId={cal.id}
              competitions={cal.competitions.map((dcc) => ({
                competitionId: dcc.competitionId,
                name: dcc.competition.name,
                doubleRound: Boolean(dcc.competition.doubleRound),
                hasFinals: dcc.competition.format === 'CHAMPIONSHIP_PLAYOFFS',
                isCup: dcc.competition.format === 'CUP',
              }))}
              slots={cal.slots}
              clubs={clubs}
              teamCountByCompetition={teamCountByCompetition}
            />
          )}

          {/* Schedule preview */}
          {cal.competitions.length > 0 && (
            <SchedulePreview
              draftCalendarId={cal.id}
              slots={cal.slots}
              competitions={cal.competitions}
              addedDates={cal.addedDates ?? []}
              calStartDate={cal.startDate}
              calEndDate={cal.endDate}
              clubs={clubs}
              venues={venues}
              referees={referees}
              entriesByCompetition={entriesByCompetition}
              onRemoveDate={handleRemoveDate}
              onAddDate={handleAddManualDate}
              onRemoveManual={handleRemoveManualDate}
              onMoveDate={handleMoveDate}
              onSetCount={handleSetCount}
              onRemoveCompFromDate={handleRemoveCompFromDate}
            />
          )}

          {/* Notes */}
          {cal.notes && (
            <div style={{ ...body, fontSize: 13, color: LRH.ink2, marginTop: 16, fontStyle: 'italic' }}>
              {cal.notes}
            </div>
          )}

          {/* Actions */}
          <div className="lrh-draft-actions">
            {cal.competitions.length > 0 && (
              <PdfSelector season={cal.season} competitions={cal.competitions} />
            )}
            <button onClick={() => setShowEdit((v) => !v)} style={btnOutline(LRH.navy)}>
              {showEdit ? '✕ Annuler' : '✎ Modifier le calendrier'}
            </button>
            <button onClick={onDelete} style={btnDanger}>
              Supprimer
            </button>
          </div>

          {showEdit && (
            <EditCalendarForm
              cal={cal}
              onSaved={() => { setShowEdit(false); router.refresh(); }}
              startTransition={startTransition}
            />
          )}
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.cal === next.cal &&
  prev.expanded === next.expanded,
);
