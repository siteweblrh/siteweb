'use client';

import React, { useState, useTransition, useOptimistic, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, MODE_COLOR, display, mono, body } from '@/components/lrh/tokens';
import {
  createDraftCalendar,
  deleteDraftCalendar,
  updateDraftCalendar,
  addCompetitionToCalendar,
  removeCompetitionFromCalendar,
  updateCompetitionPeriod,
  excludeDate,
  addManualDate,
  removeManualDate,
  removeDateSlots,
  moveDraftCompetitionDate,
  removeDraftCompetitionFromDate,
  setDraftCompetitionDateSlotCount,
  reorderCalendarCompetitions,
} from '@/lib/actions/draftCalendar';
import { nextSeason, holidaysForRange, holidayMap } from '@/lib/utils/holidays-reunion';
import { DrawPanel } from './DrawPanel';
import { ConvertMatchdayModal, type SlotForConversion } from './ConvertMatchdayModal';
import { revertConvertedSlot } from '@/lib/actions/draftCalendar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SlotCompetition = {
  id: string;
  name: string;
  mode: string;
  category: string;
  season: string;
  format: string;
  // Présents quand la compétition est récupérée via SLOT_INCLUDE (admin).
  doubleRound?: boolean;
  fairnessEnabled?: boolean;
};

type ConvertedMatchData = {
  id: string;
  homeClubId: string;
  awayClubId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  phase: string;
  kickoffAt: string;
};

type DraftSlotData = {
  id: string;
  date: string;
  matchday: number;
  slotIndex: number;
  competitionId: string | null;
  competition: SlotCompetition | null;
  // Affiche planifiée par le tirage, avant conversion en match.
  plannedHomeClubId?: string | null;
  plannedAwayClubId?: string | null;
  isPinned?: boolean | null;
  convertedMatchId?: string | null;
  convertedMatch?: ConvertedMatchData | null;
};

type DraftCalendarCompData = {
  id: string;
  competitionId: string;
  competition: { id: string; name: string; mode: string; category: string; season: string; format: string; doubleRound?: boolean };
  startDate: string;
  endDate: string;
  slotsPerDay: number;
  color: string | null;
  dayOfWeek: string | null;
  recurrence: number | null;
};

type DraftCalendarData = {
  id: string;
  name: string;
  season: string;
  dayOfWeek: string;
  recurrence: number;
  slotsPerDay: number;
  startDate: string;
  endDate: string;
  notes: string | null;
  excludedDates: string[];
  addedDates: string[];
  slots: DraftSlotData[];
  competitions: DraftCalendarCompData[];
  createdAt: string;
};

type CompetitionOption = {
  id: string;
  name: string;
  mode: string;
  season: string;
  category: string;
  format: string;
  doubleRound?: boolean;
  _count: { matches: number; standings: number; entries: number };
};

type ClubOptionLite = {
  id: string;
  name: string;
  shortCode: string | null;
};
type VenueOptionLite = {
  id: string;
  name: string;
  city: string | null;
};
type RefereeOptionLite = {
  id: string;
  fullName: string;
};

type Props = {
  calendars: DraftCalendarData[];
  competitions: CompetitionOption[];
  // Datasets nécessaires au workflow de conversion. Optionnels pour
  // rester compatibles avec l'appel historique (sans conversion).
  clubs?: ClubOptionLite[];
  venues?: VenueOptionLite[];
  referees?: RefereeOptionLite[];
  // Map clé = competitionId, valeur = set des clubId inscrits.
  entriesByCompetition?: Record<string, string[]>;
};

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 14,
  padding: '10px 12px',
  border: `1px solid ${LRH.hairStrong}`,
  width: '100%',
  minHeight: 44,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  ...mono,
  fontSize: 10,
  color: LRH.mute,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 6,
};

const btnPrimary: React.CSSProperties = {
  ...mono,
  fontSize: 11,
  fontWeight: 700,
  padding: '10px 18px',
  background: LRH.navy,
  color: '#fff',
  border: 'none',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  minHeight: 44,
};

const btnOutline = (color: string): React.CSSProperties => ({
  ...mono,
  fontSize: 11,
  fontWeight: 700,
  padding: '8px 14px',
  background: 'transparent',
  color,
  border: `1px solid ${color}`,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  minHeight: 44,
});

const btnDanger: React.CSSProperties = btnOutline(LRH.red);

const sectionLabelStyle: React.CSSProperties = {
  ...mono,
  fontSize: 10,
  color: LRH.mute,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: 12,
};

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const COMP_PALETTE = [
  '#002244', '#1B7340', '#A8202F', '#2563EB', '#F3BC1C',
  '#7C3AED', '#0891B2', '#DC2626', '#059669', '#D97706',
];

// ---------------------------------------------------------------------------
// Optimistic reducer
// ---------------------------------------------------------------------------

type Patch =
  | { kind: 'delete-calendar'; id: string }
  | { kind: 'add-calendar'; cal: DraftCalendarData };

function reducer(state: DraftCalendarData[], patch: Patch): DraftCalendarData[] {
  switch (patch.kind) {
    case 'delete-calendar':
      return state.filter((c) => c.id !== patch.id);
    case 'add-calendar':
      return [patch.cal, ...state];
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

// Nombre de journées nécessaires en round-robin pour N équipes.
// N pair : N-1 journées en simple, doublé en aller-retour.
// N impair : N journées (une équipe au repos chaque journée), doublé en aller-retour.
function matchdaysForTeamCount(n: number, doubleRound: boolean): number {
  if (n < 2) return 0;
  const base = n % 2 === 0 ? n - 1 : n;
  return doubleRound ? base * 2 : base;
}

function computePreviewDates(
  dayOfWeek: 'SATURDAY' | 'SUNDAY',
  recurrence: number,
  startDate: string,
  endDate: string,
): string[] {
  if (!startDate || !endDate) return [];
  const targetDay = dayOfWeek === 'SATURDAY' ? 6 : 0;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return [];

  const cursor = new Date(start);
  const daysUntil = (targetDay - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + daysUntil);

  const dates: string[] = [];
  while (cursor <= end) {
    dates.push(cursor.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
    cursor.setDate(cursor.getDate() + 7 * recurrence);
  }
  return dates;
}

// ISO (YYYY-MM-DD) en heure locale navigateur — même convention que
// computePreviewDates (et cohérent avec la génération serveur en heure Réunion).
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Date de la N-ième journée à partir de startDate, en respectant le jour cible
// et la récurrence. Sert à DÉDUIRE la date de fin depuis un nombre de journées
// saisi par l'admin (au lieu de la saisir à la main).
function nthMatchdayISO(
  dayOfWeek: 'SATURDAY' | 'SUNDAY',
  recurrence: number,
  startDate: string,
  count: number,
): string {
  if (!startDate || count < 1) return '';
  const targetDay = dayOfWeek === 'SATURDAY' ? 6 : 0;
  const cursor = new Date(startDate + 'T00:00:00');
  if (isNaN(cursor.getTime())) return '';
  const daysUntil = (targetDay - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + daysUntil + 7 * recurrence * (count - 1));
  return toISODate(cursor);
}

// Première date au jour cible STRICTEMENT après `afterISO`. Sert à « enchaîner »
// une compétition juste après la dernière journée déjà planifiée.
function nextTargetDayAfterISO(
  dayOfWeek: 'SATURDAY' | 'SUNDAY',
  afterISO: string,
): string {
  const targetDay = dayOfWeek === 'SATURDAY' ? 6 : 0;
  const cursor = new Date(afterISO + 'T00:00:00');
  if (isNaN(cursor.getTime())) return '';
  cursor.setDate(cursor.getDate() + 1);
  const daysUntil = (targetDay - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + daysUntil);
  return toISODate(cursor);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DraftCalendarAdmin({
  calendars,
  competitions,
  clubs = [],
  venues = [],
  referees = [],
  entriesByCompetition = {},
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, applyPatch] = useOptimistic(calendars, reducer);

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = useCallback((id: string) => {
    if (!confirm('Supprimer ce calendrier provisoire et tous ses créneaux ?')) return;
    startTransition(async () => {
      applyPatch({ kind: 'delete-calendar', id });
      try {
        await deleteDraftCalendar(id);
        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Erreur');
        router.refresh();
      }
    });
  }, [applyPatch, router, startTransition]);

  const competitionsBySeason = new Map<string, DraftCalendarCompData[]>();
  for (const cal of optimistic) {
    const existing = competitionsBySeason.get(cal.season) ?? [];
    for (const dcc of cal.competitions) {
      if (!existing.some((e) => e.competitionId === dcc.competitionId)) {
        existing.push(dcc);
      }
    }
    competitionsBySeason.set(cal.season, existing);
  }
  const seasons = [...new Set(optimistic.map((c) => c.season))];

  // Map competitionId → nom du calendrier qui la détient déjà. Sert à griser
  // une compétition dans le menu d'ajout des AUTRES calendriers : une compé ne
  // peut vivre que dans un seul calendrier à la fois (cf. garde-fou serveur).
  const compToCalendarName = new Map<string, string>();
  for (const cal of optimistic) {
    for (const dcc of cal.competitions) {
      compToCalendarName.set(dcc.competitionId, cal.name);
    }
  }

  return (
    <div style={{ opacity: isPending ? 0.85 : 1, transition: 'opacity 0.15s' }}>
      <div className="lrh-draft-actions" style={{ marginTop: 0 }}>
        <button onClick={() => setShowForm((v) => !v)} style={btnPrimary}>
          {showForm ? '✕ Fermer' : '+ Nouveau calendrier'}
        </button>
        {seasons.map((season) => (
          <PdfSelector
            key={season}
            season={season}
            competitions={competitionsBySeason.get(season) ?? []}
          />
        ))}
      </div>

      {showForm && (
        <CreateDraftForm
          onCreated={(id) => { setShowForm(false); setExpandedId(id); router.refresh(); }}
          startTransition={startTransition}
          applyPatch={applyPatch}
        />
      )}

      {optimistic.length === 0 && !showForm && (
        <div style={{
          padding: 48, textAlign: 'center',
          border: `2px dashed ${LRH.hairStrong}`, background: '#fff',
        }}>
          <div style={{ ...display, fontSize: 18, color: LRH.navy, marginBottom: 8 }}>
            Aucun calendrier provisoire
          </div>
          <div style={{ ...body, fontSize: 13, color: LRH.mute }}>
            Créez un squelette de saison pour planifier les dates avant l'engagement des clubs.
          </div>
        </div>
      )}

      {optimistic.map((cal) => (
        <CalendarCard
          key={cal.id}
          cal={cal}
          competitions={competitions}
          compToCalendarName={compToCalendarName}
          clubs={clubs}
          venues={venues}
          referees={referees}
          entriesByCompetition={entriesByCompetition}
          expanded={expandedId === cal.id}
          onToggle={() => setExpandedId((v) => (v === cal.id ? null : cal.id))}
          onDelete={() => handleDelete(cal.id)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar card (simplified)
// ---------------------------------------------------------------------------

const CalendarCard = React.memo(function CalendarCardImpl({
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
  const lastScheduledDateISO = [...uniqueDates].sort().pop();

  const handleRemoveComp = (dccId: string, compName: string) => {
    if (!confirm(`Retirer « ${compName} » ?\nLes dates seront recalculées automatiquement.`)) return;
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

  const handleRemoveCompFromDate = (competitionId: string, dateISO: string, compName: string) => {
    if (!confirm(`Retirer « ${compName} » de cette date ?\nLes autres compétitions de la journée ne sont pas touchées.`)) return;
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

// ---------------------------------------------------------------------------
// Competition row — inline editable
// ---------------------------------------------------------------------------

function CompetitionRow({
  dcc,
  slotCount,
  isFirst,
  isLast,
  onRemove,
  onUpdate,
  onMoveUp,
  onMoveDown,
}: {
  dcc: DraftCalendarCompData;
  slotCount: number;
  isFirst: boolean;
  isLast: boolean;
  onRemove: () => void;
  onUpdate: (field: string, value: string | number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const color = dcc.color ?? LRH.navy;
  const modeColor = MODE_COLOR[dcc.competition.mode as keyof typeof MODE_COLOR];

  const arrowStyle = (disabled: boolean): React.CSSProperties => ({
    ...mono, fontSize: 11, lineHeight: 1,
    width: 22, height: 18, padding: 0,
    background: 'transparent',
    border: `1px solid ${disabled ? LRH.hair : LRH.hairStrong}`,
    color: disabled ? LRH.hair : LRH.navy,
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div className="lrh-draft-comp-row" style={{ borderTop: `1px solid ${LRH.hair}` }}>
      {/* Réordonnancement global de la compétition dans la journée */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }} title="Ordre dans la journée">
        <button onClick={onMoveUp} disabled={isFirst} aria-label="Monter" style={arrowStyle(isFirst)}>▲</button>
        <button onClick={onMoveDown} disabled={isLast} aria-label="Descendre" style={arrowStyle(isLast)}>▼</button>
      </div>

      <span style={{ width: 12, height: 12, flexShrink: 0, background: color }} />

      <span style={{ ...body, fontSize: 13, fontWeight: 700, color: LRH.navy, minWidth: 0 }}>
        {dcc.competition.name}
      </span>

      <span style={{
        ...mono, fontSize: 9, padding: '2px 6px',
        background: modeColor?.bg ?? LRH.mute, color: '#fff',
      }}>
        {dcc.competition.mode === 'GAZON' ? 'GAZ' : 'SAL'}
      </span>

      <select
        value={dcc.dayOfWeek ?? 'SATURDAY'}
        onChange={(e) => onUpdate('dayOfWeek', e.target.value)}
        style={{ ...mono, fontSize: 10, padding: '2px 4px', border: `1px solid ${LRH.hair}`, minHeight: 32, color: LRH.ink2 }}
        aria-label={`Jour ${dcc.competition.name}`}
      >
        <option value="SATURDAY">Sam.</option>
        <option value="SUNDAY">Dim.</option>
      </select>

      <select
        value={dcc.recurrence ?? 2}
        onChange={(e) => onUpdate('recurrence', Number(e.target.value))}
        style={{ ...mono, fontSize: 10, padding: '2px 4px', border: `1px solid ${LRH.hair}`, minHeight: 32, color: LRH.ink2 }}
        aria-label={`Récurrence ${dcc.competition.name}`}
      >
        <option value={1}>1 sem.</option>
        <option value={2}>2 sem.</option>
        <option value={3}>3 sem.</option>
        <option value={4}>4 sem.</option>
      </select>

      <input
        type="number"
        min={1}
        max={10}
        value={dcc.slotsPerDay}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v >= 1 && v <= 10) onUpdate('slotsPerDay', v);
        }}
        style={{ ...mono, fontSize: 10, padding: '2px 4px', border: `1px solid ${LRH.hair}`, width: 48, minHeight: 32, textAlign: 'center', color: LRH.ink2 }}
        aria-label={`Matchs/j ${dcc.competition.name}`}
        title="Matchs par journée"
      />

      <span style={{ ...mono, fontSize: 10, color: LRH.mute, whiteSpace: 'nowrap' }}>
        {slotCount} j.
      </span>

      <div className="lrh-draft-comp-dates">
        <input
          type="date"
          defaultValue={dcc.startDate.slice(0, 10)}
          onBlur={(e) => e.target.value && onUpdate('startDate', e.target.value)}
          style={{ ...mono, fontSize: 11, padding: '4px 6px', border: `1px solid ${LRH.hair}`, minHeight: 36 }}
          aria-label={`Début ${dcc.competition.name}`}
        />
        <span style={{ ...mono, fontSize: 10, color: LRH.mute }}>→</span>
        <input
          type="date"
          defaultValue={dcc.endDate.slice(0, 10)}
          onBlur={(e) => e.target.value && onUpdate('endDate', e.target.value)}
          style={{ ...mono, fontSize: 11, padding: '4px 6px', border: `1px solid ${LRH.hair}`, minHeight: 36 }}
          aria-label={`Fin ${dcc.competition.name}`}
        />
        <button
          onClick={onRemove}
          aria-label={`Retirer ${dcc.competition.name}`}
          style={{
            background: 'transparent', border: 'none', color: LRH.red,
            cursor: 'pointer', fontSize: 14, padding: 6,
            minWidth: 44, minHeight: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Matchdays hint — table de référence + projection sur les inscrits courants.
// À la Réunion les compés tournent autour de 3-5 équipes, donc la table est
// petite et l'écart entre les cas reste lisible.
// ---------------------------------------------------------------------------

function MatchdaysHint({ selectedComp }: { selectedComp: CompetitionOption | null }) {
  const entries = selectedComp?._count.entries ?? 0;
  const doubleRound = selectedComp?.doubleRound ?? false;

  // Projection précise si une compé est sélectionnée et qu'elle a déjà des inscrits.
  const projection = selectedComp && entries >= 2
    ? matchdaysForTeamCount(entries, doubleRound)
    : null;

  const ROWS: Array<{ n: number; simple: number; aller: number }> = [
    { n: 3, simple: matchdaysForTeamCount(3, false), aller: matchdaysForTeamCount(3, true) },
    { n: 4, simple: matchdaysForTeamCount(4, false), aller: matchdaysForTeamCount(4, true) },
    { n: 5, simple: matchdaysForTeamCount(5, false), aller: matchdaysForTeamCount(5, true) },
    { n: 6, simple: matchdaysForTeamCount(6, false), aller: matchdaysForTeamCount(6, true) },
  ];

  return (
    <div style={{
      marginBottom: 14, padding: 12,
      background: '#fff', border: `1px dashed ${LRH.hairStrong}`,
    }}>
      <div style={{
        ...mono, fontSize: 9.5, fontWeight: 700,
        color: LRH.navy, letterSpacing: '0.14em',
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        ◇ Combien de journées prévoir ?
      </div>

      {projection !== null ? (
        <div style={{ ...body, fontSize: 12.5, color: LRH.ink2, marginBottom: 8 }}>
          Cette compétition a <strong style={{ color: LRH.navy }}>{entries} équipe{entries > 1 ? 's' : ''}</strong> inscrite{entries > 1 ? 's' : ''}
          {' '}→ il faut <strong style={{ color: LRH.red }}>{projection} journée{projection > 1 ? 's' : ''}</strong>
          {' '}en {doubleRound ? 'aller-retour' : 'aller simple'}.
        </div>
      ) : (
        <div style={{ ...body, fontSize: 12, color: LRH.mute, marginBottom: 8 }}>
          Aucun club inscrit pour l'instant. La table ci-dessous donne la fourchette habituelle (Réunion = 3-5 équipes max).
        </div>
      )}

      <table style={{
        ...mono, fontSize: 11, color: LRH.ink2,
        width: '100%', borderCollapse: 'collapse',
      }}>
        <thead>
          <tr style={{ background: LRH.paper }}>
            <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 700, letterSpacing: '0.08em' }}>Équipes</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 700, letterSpacing: '0.08em' }}>Aller simple</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 700, letterSpacing: '0.08em' }}>Aller-retour</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const highlight = entries === r.n;
            return (
              <tr key={r.n} style={{ background: highlight ? 'rgba(243,188,28,0.12)' : 'transparent' }}>
                <td style={{ padding: '4px 8px', fontWeight: highlight ? 700 : 400 }}>{r.n}</td>
                <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: highlight && !doubleRound ? 700 : 400 }}>
                  {r.simple} j
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: highlight && doubleRound ? 700 : 400 }}>
                  {r.aller} j
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add competition form (single-add with preview)
// ---------------------------------------------------------------------------

function AddCompetitionForm({
  calendarId,
  calSeason,
  seasonHasComps,
  calStartDate,
  calEndDate,
  calDayOfWeek,
  calRecurrence,
  availableComps,
  compToCalendarName,
  existingCount,
  lastScheduledDateISO,
  onDone,
  onCancel,
  startTransition,
}: {
  calendarId: string;
  calSeason: string;
  seasonHasComps: boolean;
  calStartDate: string;
  calEndDate: string;
  calDayOfWeek: 'SATURDAY' | 'SUNDAY';
  calRecurrence: number;
  availableComps: CompetitionOption[];
  compToCalendarName: Map<string, string>;
  existingCount: number;
  lastScheduledDateISO?: string;
  onDone: () => void;
  onCancel: () => void;
  startTransition: React.TransitionStartFunction;
}) {
  const [compId, setCompId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<'SATURDAY' | 'SUNDAY'>(calDayOfWeek);
  const [recurrence, setRecurrence] = useState(calRecurrence);
  const [startDate, setStartDate] = useState(calStartDate);
  const [matchdayCount, setMatchdayCount] = useState(6);
  const [countTouched, setCountTouched] = useState(false);
  const [chain, setChain] = useState(false);
  const [slotsPerDay, setSlotsPerDay] = useState(1);
  const [error, setError] = useState('');

  const selectedComp = availableComps.find((c) => c.id === compId) ?? null;

  // Pré-remplit le nombre de journées avec la projection round-robin dès qu'une
  // compétition avec des inscrits est choisie (tant que l'admin n'a pas saisi
  // sa propre valeur).
  useEffect(() => {
    if (!selectedComp || countTouched) return;
    const entries = selectedComp._count.entries;
    if (entries >= 2) {
      setMatchdayCount(matchdaysForTeamCount(entries, selectedComp.doubleRound ?? false));
    }
  }, [selectedComp, countTouched]);

  // « Enchaîner » : la date de début se cale sur le 1er jour cible après la
  // dernière journée déjà planifiée. Sinon, la date saisie à la main.
  const canChain = !!lastScheduledDateISO;
  const effectiveStart = chain && lastScheduledDateISO
    ? nextTargetDayAfterISO(dayOfWeek, lastScheduledDateISO)
    : startDate;

  // Date de fin DÉDUITE du nombre de journées (au lieu d'être saisie).
  const computedEndISO = nthMatchdayISO(dayOfWeek, recurrence, effectiveStart, matchdayCount);
  const exceedsWindow = !!computedEndISO && !!calEndDate && computedEndISO > calEndDate;
  const previewEnd = exceedsWindow ? calEndDate : computedEndISO;
  const previewDates = compId ? computePreviewDates(dayOfWeek, recurrence, effectiveStart, previewEnd) : [];
  const autoColor = COMP_PALETTE[existingCount % COMP_PALETTE.length];

  const handleAdd = () => {
    setError('');
    if (!compId) { setError('Choisissez une compétition.'); return; }
    if (!effectiveStart) { setError('Date de début requise.'); return; }
    if (matchdayCount < 1) { setError('Indiquez au moins une journée.'); return; }
    if (previewDates.length === 0) { setError('Aucune date ne correspond — vérifiez la date de début et le jour choisi.'); return; }

    startTransition(async () => {
      try {
        await addCompetitionToCalendar(calendarId, {
          competitionId: compId,
          startDate: effectiveStart,
          endDate: computedEndISO,
          slotsPerDay,
          dayOfWeek,
          recurrence,
        });
        onDone();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur');
      }
    });
  };

  return (
    <div style={{
      background: '#fff', border: `1px solid ${LRH.hair}`,
      borderLeft: `4px solid ${LRH.gold}`,
      padding: 20, marginTop: 16, marginBottom: 16,
    }}>
      <div style={{ ...display, fontSize: 16, fontWeight: 700, color: LRH.navy, marginBottom: 4 }}>
        Ajouter une compétition
      </div>
      <div style={{ ...body, fontSize: 12, color: LRH.mute, marginBottom: 16 }}>
        Choisissez une compétition, indiquez son <strong>nombre de journées</strong> :
        la date de fin et les dates sont calculées automatiquement. Cochez «&nbsp;Enchaîner&nbsp;»
        pour démarrer juste après la dernière journée déjà planifiée.
      </div>

      {error && (
        <div style={{
          ...body, fontSize: 13, color: LRH.red, marginBottom: 12,
          padding: '8px 12px', background: 'rgba(168,32,47,0.06)',
          border: `1px solid ${LRH.red}`,
        }}>
          {error}
        </div>
      )}

      {/* Competition select — limité à la saison du calendrier */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Compétition · saison {calSeason}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, background: autoColor, flexShrink: 0 }} />
          <select
            value={compId}
            onChange={(e) => setCompId(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          >
            <option value="">— Choisir une compétition —</option>
            {availableComps.map((c) => {
              const lockedIn = compToCalendarName.get(c.id);
              return (
                <option key={c.id} value={c.id} disabled={!!lockedIn}>
                  {c.name} ({c.category} · {c.mode === 'GAZON' ? 'Gazon' : 'Salle'})
                  {lockedIn ? ` — déjà dans « ${lockedIn} »` : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Aide : projection du nombre de journées nécessaires. */}
      <MatchdaysHint selectedComp={selectedComp} />

      {/* Enchaîner après la dernière journée déjà planifiée */}
      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: canChain ? 'pointer' : 'not-allowed', opacity: canChain ? 1 : 0.55,
        }}>
          <input
            type="checkbox"
            checked={chain}
            disabled={!canChain}
            onChange={(e) => setChain(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: LRH.navy }}
          />
          <span style={{ ...body, fontSize: 13, color: LRH.ink }}>
            Enchaîner après la dernière journée planifiée
          </span>
        </label>
        <div style={{ ...body, fontSize: 11, color: LRH.mute, marginTop: 4, marginLeft: 28 }}>
          {canChain
            ? `La date de début se cale sur le premier ${dayOfWeek === 'SUNDAY' ? 'dimanche' : 'samedi'} après le ${formatShortDate(lastScheduledDateISO!)}.`
            : 'Disponible dès qu’une première compétition est planifiée dans ce calendrier.'}
        </div>
      </div>

      {/* Day + Recurrence + Matches/day */}
      <div className="dash-grid-form" style={{ marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Jour</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value as 'SATURDAY' | 'SUNDAY')}
            style={inputStyle}
          >
            <option value="SATURDAY">Samedi</option>
            <option value="SUNDAY">Dimanche</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Récurrence</label>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(Number(e.target.value))}
            style={inputStyle}
          >
            <option value={1}>Chaque semaine</option>
            <option value={2}>Toutes les 2 semaines</option>
            <option value={3}>Toutes les 3 semaines</option>
            <option value={4}>Toutes les 4 semaines</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Matchs / journée</label>
          <input
            type="number"
            min={1}
            max={10}
            value={slotsPerDay}
            onChange={(e) => setSlotsPerDay(Math.max(1, Number(e.target.value)))}
            style={{ ...inputStyle, textAlign: 'center' }}
          />
        </div>
      </div>

      {/* Début + Nombre de journées → la date de fin est calculée */}
      <div className="dash-grid-form" style={{ marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Début</label>
          <input
            type="date"
            value={effectiveStart}
            disabled={chain}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ ...inputStyle, opacity: chain ? 0.6 : 1, cursor: chain ? 'not-allowed' : 'auto' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Nombre de journées</label>
          <input
            type="number"
            min={1}
            max={60}
            value={matchdayCount}
            onChange={(e) => { setCountTouched(true); setMatchdayCount(Math.max(1, Number(e.target.value))); }}
            style={{ ...inputStyle, textAlign: 'center' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Fin (calculée)</label>
          <div style={{
            ...inputStyle, display: 'flex', alignItems: 'center',
            background: LRH.paper, color: LRH.ink2,
          }}>
            {computedEndISO ? formatShortDate(computedEndISO) : '—'}
          </div>
        </div>
      </div>

      {/* Preview */}
      {previewDates.length > 0 && (
        <div style={{
          padding: 14, background: 'rgba(0,34,68,0.03)',
          border: `1px solid ${LRH.hair}`, marginBottom: 16,
        }}>
          <div style={{ ...mono, fontSize: 10, color: LRH.navy, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Aperçu : {previewDates.length} journée{previewDates.length > 1 ? 's' : ''}
          </div>
          {exceedsWindow && (
            <div style={{ ...body, fontSize: 11, color: LRH.red, marginBottom: 8 }}>
              ⚠ La {matchdayCount}<sup>e</sup> journée tomberait après la fin du calendrier ({formatShortDate(calEndDate)}).
              {' '}Seules {previewDates.length} journée{previewDates.length > 1 ? 's' : ''} seront générées — élargissez la période du calendrier ou réduisez le nombre de journées.
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {previewDates.map((d, i) => (
              <span key={i} style={{
                ...mono, fontSize: 10, padding: '3px 8px',
                background: '#fff', border: `1px solid ${LRH.hair}`, color: LRH.ink2,
                borderLeft: `3px solid ${autoColor}`,
              }}>
                J{i + 1} — {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {availableComps.length === 0 && (
        <div style={{ ...body, fontSize: 12, color: LRH.mute, marginBottom: 12 }}>
          {seasonHasComps
            ? `Toutes les compétitions de la saison ${calSeason} sont déjà ajoutées.`
            : `Aucune compétition pour la saison ${calSeason}. Créez-la d'abord dans Compétitions.`}
        </div>
      )}

      {availableComps.length > 0 && availableComps.every((c) => compToCalendarName.has(c.id)) && (
        <div style={{ ...body, fontSize: 12, color: LRH.mute, marginBottom: 12 }}>
          Les compétitions restantes de la saison {calSeason} sont déjà planifiées dans d'autres calendriers. Retirez-les d'abord pour les rattacher ici.
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!compId}
          style={{
            ...btnPrimary, background: '#059669',
            opacity: compId ? 1 : 0.5, cursor: compId ? 'pointer' : 'not-allowed',
          }}
        >
          Ajouter
        </button>
        <button type="button" onClick={onCancel} style={btnOutline(LRH.mute)}>
          Fermer
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule preview — dates grouped by month (replaces MatchdayCard grid)
// ---------------------------------------------------------------------------

function SchedulePreview({
  draftCalendarId,
  slots,
  competitions,
  addedDates,
  calStartDate,
  calEndDate,
  clubs,
  venues,
  referees,
  entriesByCompetition,
  onRemoveDate,
  onAddDate,
  onRemoveManual,
  onMoveDate,
  onSetCount,
  onRemoveCompFromDate,
}: {
  draftCalendarId: string;
  slots: DraftSlotData[];
  competitions: DraftCalendarCompData[];
  addedDates: string[];
  calStartDate: string;
  calEndDate: string;
  clubs: ClubOptionLite[];
  venues: VenueOptionLite[];
  referees: RefereeOptionLite[];
  entriesByCompetition: Record<string, string[]>;
  onRemoveDate: (dateISO: string) => void;
  onAddDate: (dateISO: string, competitionId: string) => void;
  onRemoveManual: (dateISO: string) => void;
  onMoveDate: (competitionId: string, fromISO: string, toISO: string) => void;
  onSetCount: (competitionId: string, dateISO: string, count: number) => void;
  onRemoveCompFromDate: (competitionId: string, dateISO: string, compName: string) => void;
}) {
  const [showAddDate, setShowAddDate] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newCompId, setNewCompId] = useState(competitions[0]?.competitionId ?? '');
  const [convertOpen, setConvertOpen] = useState<null | {
    matchday: number;
    dateLabel: string;
    slots: SlotForConversion[];
  }>(null);

  // entriesByCompetition (record string→array) → Map<string, Set<string>> pour la modale.
  const entriesMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const [compId, clubIds] of Object.entries(entriesByCompetition)) {
      m.set(compId, new Set(clubIds));
    }
    return m;
  }, [entriesByCompetition]);

  const addedDateSet = new Set(addedDates.map((d) => new Date(d).toISOString().slice(0, 10)));

  const holidays = holidayMap(new Date(calStartDate), new Date(calEndDate));

  const colorMap = new Map<string, string>();
  for (const dcc of competitions) {
    colorMap.set(dcc.competitionId, dcc.color ?? LRH.navy);
  }

  const byDate = new Map<string, {
    date: Date;
    matchday: number;
    comps: Map<string, { id: string; name: string; count: number; color: string }>;
    slots: DraftSlotData[];
  }>();
  for (const slot of slots) {
    if (!slot.competitionId || !slot.competition) continue;
    const dateKey = new Date(slot.date).toISOString().slice(0, 10);
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        date: new Date(slot.date),
        matchday: slot.matchday,
        comps: new Map(),
        slots: [],
      });
    }
    const entry = byDate.get(dateKey)!;
    entry.slots.push(slot);
    const existing = entry.comps.get(slot.competitionId);
    if (existing) {
      existing.count++;
    } else {
      entry.comps.set(slot.competitionId, {
        id: slot.competitionId,
        name: slot.competition.name,
        count: 1,
        color: colorMap.get(slot.competitionId) ?? LRH.navy,
      });
    }
  }

  const sorted = Array.from(byDate.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

  const byMonth = new Map<string, typeof sorted>();
  for (const entry of sorted) {
    const monthKey = entry.date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
    byMonth.get(monthKey)!.push(entry);
  }

  const handleAdd = () => {
    if (!newDate || !newCompId) return;
    onAddDate(newDate, newCompId);
    setNewDate('');
    setShowAddDate(false);
  };

  return (
    <div style={{ marginTop: 20, padding: 16, background: LRH.paper, border: `1px solid ${LRH.hair}` }}>
      <div style={sectionLabelStyle}>
        Planning généré — {sorted.length} date{sorted.length > 1 ? 's' : ''}
      </div>

      {sorted.length === 0 && (
        <div style={{ ...body, fontSize: 13, color: LRH.mute, padding: '12px 0' }}>
          Aucune date générée — vérifiez les périodes des compétitions.
        </div>
      )}

      {Array.from(byMonth.entries()).map(([month, dates]) => (
        <div key={month} style={{ marginBottom: 16 }}>
          <div style={{
            ...mono, fontSize: 10, fontWeight: 700, color: LRH.navy,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 6, paddingBottom: 4,
            borderBottom: `1px solid ${LRH.hair}`,
          }}>
            {month}
          </div>
          {dates.map((entry, idx) => {
            const dateKey = entry.date.toISOString().slice(0, 10);
            const dateStr = entry.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
            const comps = Array.from(entry.comps.values());
            const totalMatches = comps.reduce((sum, c) => sum + c.count, 0);
            const isManual = addedDateSet.has(dateKey);
            const holidayName = holidays.get(dateKey);
            const convertedCount = entry.slots.filter((s) => s.convertedMatchId).length;
            const pendingCount = entry.slots.length - convertedCount;
            const allConverted = convertedCount === entry.slots.length && entry.slots.length > 0;
            const canConvert = pendingCount > 0 && clubs.length > 0;
            // Une compétition est déplaçable tant qu'aucun de ses créneaux à
            // cette date n'a été converti en match officiel.
            const convertedCompIds = new Set(
              entry.slots.filter((s) => s.convertedMatchId).map((s) => s.competitionId),
            );
            const movableComps = comps.filter((c) => !convertedCompIds.has(c.id));
            const isEditing = editingKey === dateKey;

            return (
              <React.Fragment key={dateKey}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 0', flexWrap: 'wrap',
                  borderBottom: idx < dates.length - 1 && !isEditing ? `1px solid rgba(10,18,32,0.06)` : 'none',
                  background: holidayName ? 'rgba(168,32,47,0.04)' : 'transparent',
                }}
              >
                {isManual && (
                  <span title="Date ajoutée manuellement" style={{
                    ...mono, fontSize: 9, padding: '1px 5px',
                    background: LRH.gold, color: LRH.navy, fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    +
                  </span>
                )}
                {holidayName && (
                  <span title={holidayName} style={{
                    ...mono, fontSize: 9, padding: '1px 5px',
                    background: LRH.red, color: '#fff', fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    FÉRIÉ
                  </span>
                )}
                <span style={{
                  ...mono, fontSize: 12, color: LRH.ink2, width: 120, flexShrink: 0,
                }}>
                  {dateStr}
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                  {comps.map((comp) => (
                    <span key={comp.name} style={{
                      ...mono, fontSize: 10, padding: '2px 8px',
                      background: '#fff', border: `1px solid ${LRH.hair}`,
                      borderLeft: `3px solid ${comp.color}`,
                      color: LRH.ink2,
                    }}>
                      {comp.name}{comp.count > 1 ? ` (×${comp.count})` : ''}
                    </span>
                  ))}
                </div>
                <span style={{ ...mono, fontSize: 10, color: LRH.mute, flexShrink: 0 }}>
                  {totalMatches} match{totalMatches > 1 ? 's' : ''}
                </span>

                {/* Badge état conversion + bouton */}
                {allConverted && (
                  <span title="Tous les créneaux convertis en matchs" style={{
                    ...mono, fontSize: 9, padding: '3px 7px',
                    background: '#1B7340', color: '#fff', fontWeight: 700,
                    letterSpacing: '0.1em',
                    flexShrink: 0,
                  }}>
                    ✓ CONVERTIS
                  </span>
                )}
                {!allConverted && convertedCount > 0 && (
                  <span title={`${convertedCount}/${entry.slots.length} convertis`} style={{
                    ...mono, fontSize: 9, padding: '3px 7px',
                    background: LRH.gold, color: LRH.navy, fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {convertedCount}/{entry.slots.length} ✓
                  </span>
                )}
                {canConvert && (
                  <button
                    onClick={() => setConvertOpen({
                      matchday: entry.matchday,
                      dateLabel: dateStr,
                      slots: entry.slots
                        .filter((s) => !s.convertedMatchId && s.competitionId && s.competition)
                        .map((s) => ({
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
                    })}
                    title="Convertir les créneaux de cette journée en matchs officiels"
                    style={{
                      ...mono, fontSize: 10, fontWeight: 700,
                      padding: '5px 10px',
                      background: LRH.navy, color: '#fff',
                      border: 'none', cursor: 'pointer',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    ✓ Convertir
                  </button>
                )}

                {movableComps.length > 0 && (
                  <button
                    onClick={() => setEditingKey((k) => (k === dateKey ? null : dateKey))}
                    title="Modifier cette date (nombre de matchs, déplacer ou retirer une compétition)"
                    aria-label="Modifier cette date"
                    style={{
                      ...mono, fontSize: 10, fontWeight: 700,
                      padding: '5px 10px',
                      background: isEditing ? LRH.navy : 'transparent',
                      color: isEditing ? '#fff' : LRH.navy,
                      border: `1px solid ${LRH.navy}`, cursor: 'pointer',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    ✎ Modifier
                  </button>
                )}

                <button
                  onClick={() => isManual ? onRemoveManual(dateKey) : onRemoveDate(dateKey)}
                  title="Supprimer cette date"
                  aria-label="Supprimer cette date"
                  style={{
                    background: 'transparent', border: 'none', color: LRH.mute,
                    cursor: 'pointer', fontSize: 12, padding: 4,
                    minWidth: 32, minHeight: 32, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
              {isEditing && (
                <DayEditor
                  fromDateKey={dateKey}
                  dateStr={dateStr}
                  comps={movableComps}
                  calStartDate={calStartDate}
                  calEndDate={calEndDate}
                  onMove={(compId, toISO) => {
                    onMoveDate(compId, dateKey, toISO);
                    setEditingKey(null);
                  }}
                  onSetCount={(compId, count) => onSetCount(compId, dateKey, count)}
                  onRemoveComp={(compId, compName) => onRemoveCompFromDate(compId, dateKey, compName)}
                  onCancel={() => setEditingKey(null)}
                />
              )}
              </React.Fragment>
            );
          })}
        </div>
      ))}

      {/* Add date form */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${LRH.hairStrong}` }}>
        {showAddDate ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={labelStyle}>Date à ajouter</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                style={{ ...inputStyle, width: 'auto' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Compétition</label>
              <select
                value={newCompId}
                onChange={(e) => setNewCompId(e.target.value)}
                style={{ ...inputStyle, width: 'auto' }}
              >
                {competitions.map((dcc) => (
                  <option key={dcc.competitionId} value={dcc.competitionId}>
                    {dcc.competition.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAdd}
              disabled={!newDate || !newCompId}
              style={{ ...btnPrimary, opacity: newDate && newCompId ? 1 : 0.5, cursor: newDate && newCompId ? 'pointer' : 'not-allowed' }}
            >
              Ajouter
            </button>
            <button
              onClick={() => { setShowAddDate(false); setNewDate(''); }}
              style={btnOutline(LRH.mute)}
            >
              Annuler
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAddDate(true)} style={btnOutline(LRH.navy)}>
            + Ajouter une date
          </button>
        )}
      </div>

      {/* Modale de conversion */}
      {convertOpen && (
        <ConvertMatchdayModal
          draftCalendarId={draftCalendarId}
          matchday={convertOpen.matchday}
          dateLabel={convertOpen.dateLabel}
          slots={convertOpen.slots}
          clubs={clubs}
          venues={venues}
          referees={referees}
          entriesByCompetition={entriesMap}
          onClose={() => setConvertOpen(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day editor — pour une journée : nombre de matchs par compétition (override)
// + déplacement d'une compétition vers une autre date
// ---------------------------------------------------------------------------

function DayEditor({
  fromDateKey,
  dateStr,
  comps,
  calStartDate,
  calEndDate,
  onMove,
  onSetCount,
  onRemoveComp,
  onCancel,
}: {
  fromDateKey: string;
  dateStr: string;
  comps: Array<{ id: string; name: string; color: string; count: number }>;
  calStartDate: string;
  calEndDate: string;
  onMove: (competitionId: string, toISO: string) => void;
  onSetCount: (competitionId: string, count: number) => void;
  onRemoveComp: (competitionId: string, compName: string) => void;
  onCancel: () => void;
}) {
  const [compId, setCompId] = useState(comps[0]?.id ?? '');
  const [toDate, setToDate] = useState(fromDateKey);
  const [error, setError] = useState('');

  const handleMove = () => {
    setError('');
    if (!compId) { setError('Choisissez une compétition.'); return; }
    if (!toDate) { setError('Choisissez la nouvelle date.'); return; }
    if (toDate === fromDateKey) { setError('La nouvelle date est identique à la date actuelle.'); return; }
    onMove(compId, toDate);
  };

  return (
    <div style={{
      padding: 14, marginBottom: 8,
      background: 'rgba(0,34,68,0.04)',
      borderLeft: `3px solid ${LRH.navy}`,
    }}>
      {/* Nombre de matchs par compétition (override de cette journée) + retrait */}
      <div style={{ ...mono, fontSize: 10, color: LRH.navy, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
        Compétitions du {dateStr}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {comps.map((c) => (
          <SlotCountRow
            key={`${c.id}-${c.count}`}
            comp={c}
            onApply={(n) => onSetCount(c.id, n)}
            onRemove={() => onRemoveComp(c.id, c.name)}
          />
        ))}
      </div>

      {/* Déplacement vers une autre date */}
      <div style={{ ...mono, fontSize: 10, color: LRH.navy, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, paddingTop: 12, borderTop: `1px dashed ${LRH.hairStrong}` }}>
        Déplacer une compétition vers une autre date
      </div>

      {error && (
        <div style={{
          ...body, fontSize: 12, color: LRH.red, marginBottom: 10,
          padding: '6px 10px', background: 'rgba(168,32,47,0.06)',
          border: `1px solid ${LRH.red}`,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {comps.length > 1 && (
          <div>
            <label style={labelStyle}>Compétition à déplacer</label>
            <select
              value={compId}
              onChange={(e) => setCompId(e.target.value)}
              style={{ ...inputStyle, width: 'auto' }}
            >
              {comps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.count > 1 ? ` (×${c.count})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        {comps.length === 1 && (
          <div>
            <label style={labelStyle}>Compétition</label>
            <div style={{
              ...mono, fontSize: 12, color: LRH.ink2,
              padding: '10px 12px', border: `1px solid ${LRH.hair}`,
              background: '#fff', minHeight: 44, display: 'flex', alignItems: 'center',
              borderLeft: `3px solid ${comps[0].color}`,
            }}>
              {comps[0].name}
            </div>
          </div>
        )}
        <div>
          <label style={labelStyle}>Nouvelle date</label>
          <input
            type="date"
            value={toDate}
            min={calStartDate.slice(0, 10)}
            max={calEndDate.slice(0, 10)}
            onChange={(e) => setToDate(e.target.value)}
            style={{ ...inputStyle, width: 'auto' }}
          />
        </div>
        <button onClick={handleMove} style={btnPrimary}>
          Déplacer
        </button>
        <button onClick={onCancel} style={btnOutline(LRH.mute)}>
          Fermer
        </button>
      </div>
    </div>
  );
}

// Ligne « nombre de matchs » pour une compétition d'une journée. L'input est
// remonté (via key={id}-{count}) à chaque changement de données, donc reseedé.
function SlotCountRow({
  comp,
  onApply,
  onRemove,
}: {
  comp: { id: string; name: string; color: string; count: number };
  onApply: (count: number) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState(comp.count);
  const changed = value !== comp.count && value >= 1 && value <= 10;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{
        ...mono, fontSize: 11, color: LRH.ink2,
        padding: '4px 8px', background: '#fff', border: `1px solid ${LRH.hair}`,
        borderLeft: `3px solid ${comp.color}`, minWidth: 140,
      }}>
        {comp.name}
      </span>
      <input
        type="number"
        min={1}
        max={10}
        value={value}
        onChange={(e) => setValue(Math.max(1, Math.min(10, Number(e.target.value))))}
        aria-label={`Nombre de matchs ${comp.name}`}
        style={{ ...mono, fontSize: 12, padding: '6px 8px', border: `1px solid ${LRH.hairStrong}`, width: 64, textAlign: 'center', minHeight: 36 }}
      />
      <span style={{ ...mono, fontSize: 10, color: LRH.mute }}>
        match{value > 1 ? 's' : ''}
      </span>
      <button
        onClick={() => onApply(value)}
        disabled={!changed}
        style={{
          ...mono, fontSize: 10, fontWeight: 700, padding: '6px 12px',
          background: changed ? LRH.navy : 'transparent',
          color: changed ? '#fff' : LRH.hair,
          border: `1px solid ${changed ? LRH.navy : LRH.hair}`,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: changed ? 'pointer' : 'default', minHeight: 36,
        }}
      >
        OK
      </button>
      <button
        onClick={onRemove}
        title={`Retirer ${comp.name} de cette date`}
        aria-label={`Retirer ${comp.name} de cette date`}
        style={{
          ...mono, fontSize: 10, fontWeight: 700, padding: '6px 12px',
          background: 'transparent', color: LRH.red,
          border: `1px solid ${LRH.red}`,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer', minHeight: 36, marginLeft: 'auto',
        }}
      >
        ✕ Retirer
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create calendar form (simplified)
// ---------------------------------------------------------------------------

function CreateDraftForm({
  onCreated,
  startTransition,
  applyPatch,
}: {
  onCreated: (id: string) => void;
  startTransition: React.TransitionStartFunction;
  applyPatch: (patch: Patch) => void;
}) {
  const defaultSeason = nextSeason();
  const [name, setName] = useState('');
  const [season, setSeason] = useState(defaultSeason);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [autoExcludeHolidays, setAutoExcludeHolidays] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !startDate || !endDate) {
      setError('Nom, date de début et date de fin sont requis.');
      return;
    }

    startTransition(async () => {
      try {
        const cal = await createDraftCalendar({
          name,
          season,
          dayOfWeek: 'SATURDAY',
          recurrence: 2,
          startDate,
          endDate,
          notes: notes || undefined,
        });
        if (autoExcludeHolidays) {
          const holidays = holidaysForRange(
            new Date(startDate + 'T00:00:00Z'),
            new Date(endDate + 'T23:59:59Z'),
          );
          for (const h of holidays) {
            await excludeDate(cal.id, h.key);
          }
        }
        onCreated(cal.id);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur à la création');
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#fff', border: `1px solid ${LRH.hair}`,
        borderLeft: `4px solid ${LRH.gold}`,
        padding: 24, marginBottom: 24,
      }}
    >
      <div style={{ ...display, fontSize: 18, fontWeight: 700, color: LRH.navy, marginBottom: 6 }}>
        Nouveau calendrier provisoire
      </div>
      <div style={{ ...body, fontSize: 12, color: LRH.mute, marginBottom: 20 }}>
        Définissez la période de la saison. Les compétitions seront ajoutées dans l'étape suivante.
      </div>

      {error && (
        <div style={{
          ...body, fontSize: 13, color: LRH.red, marginBottom: 16,
          padding: '10px 14px', background: 'rgba(168,32,47,0.06)',
          border: `1px solid ${LRH.red}`,
        }}>
          {error}
        </div>
      )}

      <div className="dash-grid-form" style={{ marginBottom: 16 }}>
        <div>
          <label htmlFor="dc-name" style={labelStyle}>Nom du calendrier</label>
          <input
            id="dc-name" type="text" value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Saison Gazon 2025-2026"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="dc-season" style={labelStyle}>Saison</label>
          <select
            id="dc-season"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            style={inputStyle}
          >
            {(() => {
              const y = new Date().getFullYear();
              const options = [];
              for (let i = -1; i <= 2; i++) {
                const s = `${y + i}-${y + i + 1}`;
                options.push(<option key={s} value={s}>{s}</option>);
              }
              return options;
            })()}
          </select>
        </div>
        <div>
          <label htmlFor="dc-start" style={labelStyle}>Date de début</label>
          <input id="dc-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="dc-end" style={labelStyle}>Date de fin</label>
          <input id="dc-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="dc-notes" style={labelStyle}>Notes (optionnel)</label>
        <textarea
          id="dc-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Remarques, contraintes..."
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Auto-exclude holidays */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoExcludeHolidays}
            onChange={(e) => setAutoExcludeHolidays(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: LRH.red }}
          />
          <span style={{ ...body, fontSize: 13, color: LRH.ink }}>
            Exclure automatiquement les jours fériés
          </span>
        </label>
        {autoExcludeHolidays && startDate && endDate && (() => {
          const holidays = holidaysForRange(
            new Date(startDate + 'T00:00:00Z'),
            new Date(endDate + 'T23:59:59Z'),
          );
          if (holidays.length === 0) return null;
          return (
            <div style={{
              marginTop: 10, padding: 12,
              background: 'rgba(168,32,47,0.04)', border: `1px solid rgba(168,32,47,0.15)`,
            }}>
              <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                {holidays.length} jour{holidays.length > 1 ? 's' : ''} férié{holidays.length > 1 ? 's' : ''} exclu{holidays.length > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {holidays.map((h) => (
                  <span key={h.key} style={{
                    ...mono, fontSize: 10, padding: '3px 8px',
                    background: '#fff', border: `1px solid rgba(168,32,47,0.2)`,
                    borderLeft: `3px solid ${LRH.red}`,
                    color: LRH.ink2,
                  }}>
                    {h.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {h.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <button type="submit" style={{ ...btnPrimary, minHeight: 48 }}>
        Créer le calendrier
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Edit calendar form (simplified)
// ---------------------------------------------------------------------------

function EditCalendarForm({
  cal,
  onSaved,
  startTransition,
}: {
  cal: DraftCalendarData;
  onSaved: () => void;
  startTransition: React.TransitionStartFunction;
}) {
  const [name, setName] = useState(cal.name);
  const [season, setSeason] = useState(cal.season);
  const [startDate, setStartDate] = useState(cal.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(cal.endDate.slice(0, 10));
  const [notes, setNotes] = useState(cal.notes ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name) { setError('Nom requis'); return; }

    startTransition(async () => {
      try {
        await updateDraftCalendar(cal.id, { name, season, startDate, endDate, notes: notes || null });
        onSaved();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur');
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#fff', border: `1px solid ${LRH.hair}`,
        borderLeft: `4px solid ${LRH.gold}`,
        padding: 20, marginBottom: 20,
      }}
    >
      <div style={{ ...display, fontSize: 16, fontWeight: 700, color: LRH.navy, marginBottom: 16 }}>
        Modifier le calendrier
      </div>

      {error && (
        <div style={{
          ...body, fontSize: 13, color: LRH.red, marginBottom: 12,
          padding: '8px 12px', background: 'rgba(168,32,47,0.06)',
          border: `1px solid ${LRH.red}`,
        }}>
          {error}
        </div>
      )}

      <div className="dash-grid-form" style={{ marginBottom: 16 }}>
        <div>
          <label htmlFor="ec-name" style={labelStyle}>Nom</label>
          <input id="ec-name" type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="ec-season" style={labelStyle}>Saison</label>
          <input id="ec-season" type="text" value={season} onChange={(e) => setSeason(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="ec-start" style={labelStyle}>Date de début</label>
          <input id="ec-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="ec-end" style={labelStyle}>Date de fin</label>
          <input id="ec-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="ec-notes" style={labelStyle}>Notes</label>
        <textarea
          id="ec-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Remarques, contraintes..."
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <button type="submit" style={btnPrimary}>Enregistrer</button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// PDF dropdown
// ---------------------------------------------------------------------------

function PdfSelector({
  season,
  competitions,
}: {
  season: string;
  competitions: DraftCalendarCompData[];
}) {
  const [open, setOpen] = useState(false);
  const ts = Date.now();

  const links = [
    {
      label: `Saison complète ${season}`,
      url: `/api/season-plan/${encodeURIComponent(season)}/calendar.pdf?t=${ts}`,
    },
    ...competitions.map((dcc) => ({
      label: `${dcc.competition.name} (${dcc.competition.category})`,
      url: `/api/season-plan/${encodeURIComponent(season)}/${dcc.competitionId}/calendar.pdf?t=${ts}`,
      color: dcc.color,
    })),
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          ...mono, fontSize: 11, fontWeight: 700,
          padding: '10px 18px', background: LRH.red, color: '#fff',
          border: 'none', letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer', minHeight: 44,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>↓</span> PDF {season}
        <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 20,
            background: '#fff', border: `1px solid ${LRH.hairStrong}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            minWidth: 240, marginTop: 2,
          }}
        >
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="lrh-pdf-link"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', ...body, fontSize: 13, color: LRH.ink,
                textDecoration: 'none',
                borderBottom: i < links.length - 1 ? `1px solid ${LRH.hair}` : 'none',
                borderLeft: `3px solid ${'color' in link && link.color ? link.color : LRH.red}`,
                minHeight: 44,
              }}
            >
              <span style={{ fontSize: 13 }}>↓</span>
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
