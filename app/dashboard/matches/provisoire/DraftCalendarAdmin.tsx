'use client';

import React, { useState, useTransition, useOptimistic, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, MODE_COLOR, display, mono, body } from '@/components/lrh/tokens';
import {
  createDraftCalendar,
  deleteDraftCalendar,
  updateDraftCalendar,
  removeDraftMatchday,
  removeDraftSlot,
  assignCompetitionToSlot,
  addDraftSlot,
  updateDraftSlotVenue,
  updateDraftSlotLabel,
  removeCompetitionFromCalendar,
  updateCompetitionPeriod,
  regenerateSlots,
  addCompetitionsBatchAndRegenerate,
} from '@/lib/actions/draftCalendar';
import { formatReunionDate } from '@/lib/utils/datetime-reunion';

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
};

type SlotVenue = { id: string; name: string; city: string };

type DraftSlotData = {
  id: string;
  date: string;
  matchday: number;
  slotIndex: number;
  competitionId: string | null;
  competition: SlotCompetition | null;
  venueId: string | null;
  venueRef: SlotVenue | null;
  venueText: string | null;
  label: string | null;
};

type DraftCalendarCompData = {
  id: string;
  competitionId: string;
  competition: { id: string; name: string; mode: string; category: string; season: string; format: string };
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
  _count: { matches: number; standings: number; entries: number };
};

type Props = {
  calendars: DraftCalendarData[];
  competitions: CompetitionOption[];
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
// Main component
// ---------------------------------------------------------------------------

export function DraftCalendarAdmin({ calendars, competitions }: Props) {
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

  const seasons = [...new Set(optimistic.map((c) => c.season))];

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

  return (
    <div style={{ opacity: isPending ? 0.85 : 1, transition: 'opacity 0.15s' }}>
      {/* Action bar */}
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
          onCreated={() => { setShowForm(false); router.refresh(); }}
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
          expanded={expandedId === cal.id}
          onToggle={() => setExpandedId((v) => (v === cal.id ? null : cal.id))}
          onDelete={() => handleDelete(cal.id)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar card (expandable) with competition management
// ---------------------------------------------------------------------------

const CalendarCard = React.memo(function CalendarCardImpl({
  cal,
  competitions,
  expanded,
  onToggle,
  onDelete,
}: {
  cal: DraftCalendarData;
  competitions: CompetitionOption[];
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddComp, setShowAddComp] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [addingMatchday, setAddingMatchday] = useState(false);
  const [addDate, setAddDate] = useState('');

  const dayLabel = cal.dayOfWeek === 'SATURDAY' ? 'Samedi' : 'Dimanche';
  const recLabel = cal.recurrence === 1 ? 'Chaque semaine' : `Toutes les ${cal.recurrence} sem.`;

  const matchdays = new Map<number, DraftSlotData[]>();
  for (const slot of cal.slots) {
    if (!matchdays.has(slot.matchday)) matchdays.set(slot.matchday, []);
    matchdays.get(slot.matchday)!.push(slot);
  }
  const totalMatchdays = matchdays.size;
  const nextMd = totalMatchdays > 0 ? Math.max(...Array.from(matchdays.keys())) + 1 : 1;

  const alreadyAddedIds = new Set(cal.competitions.map((c) => c.competitionId));
  const availableComps = competitions.filter((c) => !alreadyAddedIds.has(c.id));

  const handleRemoveMatchday = (md: number) => {
    if (!confirm(`Supprimer la journée ${md} et ses ${matchdays.get(md)?.length ?? 0} créneaux ?`)) return;
    startTransition(async () => {
      try { await removeDraftMatchday(cal.id, md); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleRemoveSlot = (slotId: string) => {
    startTransition(async () => {
      try { await removeDraftSlot(slotId); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleAssign = (slotId: string, compId: string | null) => {
    startTransition(async () => {
      try { await assignCompetitionToSlot(slotId, compId); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleAddMatchday = () => {
    if (!addDate) return;
    const slotsCount = cal.competitions.length || 1;
    startTransition(async () => {
      try {
        const promises = [];
        for (let i = 1; i <= slotsCount; i++) {
          promises.push(addDraftSlot(cal.id, { date: addDate, matchday: nextMd, slotIndex: i }));
        }
        await Promise.all(promises);
        setAddingMatchday(false);
        setAddDate('');
        router.refresh();
      } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleRemoveComp = (dccId: string, compName: string) => {
    if (!confirm(`Retirer "${compName}" de ce calendrier ?`)) return;
    startTransition(async () => {
      try { await removeCompetitionFromCalendar(dccId); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleRegenerate = () => {
    if (!confirm('Régénérer tous les créneaux ?\nLes assignations manuelles (lieux, notes) seront perdues.')) return;
    startTransition(async () => {
      try { await regenerateSlots(cal.id); router.refresh(); }
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
            <span>{dayLabel}</span>
            <span>{recLabel}</span>
            <span>{totalMatchdays} journée{totalMatchdays > 1 ? 's' : ''}</span>
            <span>{cal.slots.length} créneau{cal.slots.length > 1 ? 'x' : ''}</span>
            <span>{cal.competitions.length} compétition{cal.competitions.length > 1 ? 's' : ''}</span>
          </div>
          {/* Color dots for competitions */}
          {cal.competitions.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {cal.competitions.map((dcc) => (
                <span
                  key={dcc.id}
                  title={`${dcc.competition.name} (${dcc.competition.category})`}
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

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: `1px dashed ${LRH.hairStrong}` }}>
          {/* Action bar */}
          <div className="lrh-draft-actions">
            <button onClick={() => setShowAddComp(true)} style={btnOutline(LRH.navy)}>
              + Ajouter des compétitions
            </button>
            <button onClick={() => setShowEdit((v) => !v)} style={btnOutline(LRH.navy)}>
              {showEdit ? '✕ Annuler' : '✎ Modifier'}
            </button>
            <button onClick={() => setAddingMatchday(true)} style={btnOutline(LRH.navy)}>
              + Ajouter une journée
            </button>
            {cal.competitions.length > 0 && (
              <button onClick={handleRegenerate} style={btnOutline('#059669')}>
                ⟳ Régénérer les créneaux
              </button>
            )}
            <button onClick={onDelete} style={btnDanger}>
              Supprimer
            </button>
          </div>

          {/* Edit calendar form */}
          {showEdit && (
            <EditCalendarForm
              cal={cal}
              onSaved={() => { setShowEdit(false); router.refresh(); }}
              startTransition={startTransition}
            />
          )}

          {/* Batch competition editor */}
          {showAddComp && (
            <CompetitionBatchEditor
              calendarId={cal.id}
              calStartDate={cal.startDate}
              calEndDate={cal.endDate}
              calDayOfWeek={cal.dayOfWeek}
              calRecurrence={cal.recurrence}
              availableComps={availableComps}
              existingCount={cal.competitions.length}
              onDone={() => { setShowAddComp(false); router.refresh(); }}
              onCancel={() => setShowAddComp(false)}
              startTransition={startTransition}
            />
          )}

          {/* Competition periods with timeline */}
          {cal.competitions.length > 0 && (
            <CompetitionTimeline
              calStartDate={cal.startDate}
              calEndDate={cal.endDate}
              competitions={cal.competitions}
              slots={cal.slots}
              onRemove={handleRemoveComp}
              onUpdatePeriod={(dccId, field, value) => {
                startTransition(async () => {
                  try {
                    await updateCompetitionPeriod(dccId, { [field]: value });
                    router.refresh();
                  } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
                });
              }}
            />
          )}

          {/* PDF selector */}
          {cal.competitions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <PdfSelector season={cal.season} competitions={cal.competitions} />
            </div>
          )}

          {/* Add matchday form */}
          {addingMatchday && (
            <div style={{
              padding: 16, background: LRH.paper, border: `1px solid ${LRH.hair}`,
              marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
            }}>
              <div>
                <label style={labelStyle}>Date de la journée {nextMd}</label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  style={{ ...inputStyle, width: 'auto' }}
                />
              </div>
              <button
                onClick={handleAddMatchday}
                disabled={!addDate}
                style={{ ...btnPrimary, opacity: addDate ? 1 : 0.5, cursor: addDate ? 'pointer' : 'not-allowed' }}
              >
                Ajouter
              </button>
              <button onClick={() => { setAddingMatchday(false); setAddDate(''); }} style={btnOutline(LRH.mute)}>
                Annuler
              </button>
            </div>
          )}

          {/* Notes */}
          {cal.notes && (
            <div style={{ ...body, fontSize: 13, color: LRH.ink2, marginBottom: 16, fontStyle: 'italic' }}>
              {cal.notes}
            </div>
          )}

          {/* Matchday grid */}
          <div className="dash-grid-cards">
            {Array.from(matchdays.entries()).map(([md, slots]) => (
              <MatchdayCard
                key={md}
                matchday={md}
                slots={slots}
                competitions={competitions}
                calCompetitions={cal.competitions}
                onRemoveMatchday={() => handleRemoveMatchday(md)}
                onRemoveSlot={handleRemoveSlot}
                onAssign={handleAssign}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.cal === next.cal &&
  prev.expanded === next.expanded,
);

// ---------------------------------------------------------------------------
// Competition timeline
// ---------------------------------------------------------------------------

function CompetitionTimeline({
  calStartDate,
  calEndDate,
  competitions,
  slots,
  onRemove,
  onUpdatePeriod,
}: {
  calStartDate: string;
  calEndDate: string;
  competitions: DraftCalendarCompData[];
  slots: DraftSlotData[];
  onRemove: (dccId: string, name: string) => void;
  onUpdatePeriod: (dccId: string, field: string, value: string | number) => void;
}) {
  const calStart = new Date(calStartDate).getTime();
  const calEnd = new Date(calEndDate).getTime();
  const totalMs = calEnd - calStart;
  if (totalMs <= 0) return null;

  const slotsCountByComp = new Map<string, number>();
  for (const s of slots) {
    if (s.competitionId) {
      slotsCountByComp.set(s.competitionId, (slotsCountByComp.get(s.competitionId) ?? 0) + 1);
    }
  }

  return (
    <div style={{
      marginBottom: 20, padding: 16, background: LRH.paper,
      border: `1px solid ${LRH.hair}`,
    }}>
      <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
        Compétitions & périodes
      </div>

      {/* Timeline bars */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        {/* Scale */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          ...mono, fontSize: 9, color: LRH.mute, marginBottom: 8,
        }}>
          <span>{formatShortDate(calStartDate)}</span>
          <span>{formatShortDate(calEndDate)}</span>
        </div>

        {/* Track */}
        <div style={{
          position: 'relative', height: competitions.length * 36,
          background: '#fff', border: `1px solid ${LRH.hair}`,
        }}>
          {competitions.map((dcc, i) => {
            const compStart = new Date(dcc.startDate).getTime();
            const compEnd = new Date(dcc.endDate).getTime();
            const leftPct = Math.max(0, ((compStart - calStart) / totalMs) * 100);
            const widthPct = Math.min(100 - leftPct, ((compEnd - compStart) / totalMs) * 100);
            const slotCount = slotsCountByComp.get(dcc.competitionId) ?? 0;

            return (
              <div
                key={dcc.id}
                title={`${dcc.competition.name}: ${formatShortDate(dcc.startDate)} → ${formatShortDate(dcc.endDate)} · ${slotCount} créneau${slotCount > 1 ? 'x' : ''}`}
                style={{
                  position: 'absolute',
                  top: i * 36 + 4,
                  left: `${leftPct}%`,
                  width: `${Math.max(widthPct, 2)}%`,
                  height: 28,
                  background: dcc.color ?? COMP_PALETTE[i % COMP_PALETTE.length],
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  overflow: 'hidden',
                }}
              >
                <span style={{
                  ...mono, fontSize: 9, color: '#fff', fontWeight: 700,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {dcc.competition.name} ({slotCount})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail rows */}
      {competitions.map((dcc) => {
        const slotCount = slotsCountByComp.get(dcc.competitionId) ?? 0;
        const modeColor = MODE_COLOR[dcc.competition.mode as keyof typeof MODE_COLOR];
        return (
          <div key={dcc.id} className="lrh-draft-comp-row" style={{ borderTop: `1px solid ${LRH.hair}` }}>
            <span style={{
              width: 12, height: 12, flexShrink: 0,
              background: dcc.color ?? LRH.navy,
            }} />
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
              defaultValue={dcc.dayOfWeek ?? ''}
              onChange={(e) => onUpdatePeriod(dcc.id, 'dayOfWeek', e.target.value)}
              style={{ ...mono, fontSize: 10, padding: '2px 4px', border: `1px solid ${LRH.hair}`, minHeight: 32, color: LRH.ink2 }}
              aria-label={`Jour ${dcc.competition.name}`}
            >
              <option value="SATURDAY">Sam.</option>
              <option value="SUNDAY">Dim.</option>
            </select>
            <select
              defaultValue={dcc.recurrence ?? ''}
              onChange={(e) => onUpdatePeriod(dcc.id, 'recurrence', Number(e.target.value))}
              style={{ ...mono, fontSize: 10, padding: '2px 4px', border: `1px solid ${LRH.hair}`, minHeight: 32, color: LRH.ink2 }}
              aria-label={`Récurrence ${dcc.competition.name}`}
            >
              <option value={1}>1 sem.</option>
              <option value={2}>2 sem.</option>
              <option value={3}>3 sem.</option>
              <option value={4}>4 sem.</option>
            </select>
            <span style={{ ...mono, fontSize: 10, color: LRH.ink2 }}>
              {dcc.slotsPerDay} match{dcc.slotsPerDay > 1 ? 's' : ''}/j
            </span>
            <span style={{ ...mono, fontSize: 10, color: LRH.mute }}>
              {slotCount} créneau{slotCount > 1 ? 'x' : ''}
            </span>

            <div className="lrh-draft-comp-dates">
              <input
                type="date"
                defaultValue={dcc.startDate.slice(0, 10)}
                onBlur={(e) => e.target.value && onUpdatePeriod(dcc.id, 'startDate', e.target.value)}
                style={{ ...mono, fontSize: 11, padding: '4px 6px', border: `1px solid ${LRH.hair}`, minHeight: 36 }}
                aria-label={`Début ${dcc.competition.name}`}
              />
              <span style={{ ...mono, fontSize: 10, color: LRH.mute }}>→</span>
              <input
                type="date"
                defaultValue={dcc.endDate.slice(0, 10)}
                onBlur={(e) => e.target.value && onUpdatePeriod(dcc.id, 'endDate', e.target.value)}
                style={{ ...mono, fontSize: 11, padding: '4px 6px', border: `1px solid ${LRH.hair}`, minHeight: 36 }}
                aria-label={`Fin ${dcc.competition.name}`}
              />
              <button
                onClick={() => onRemove(dcc.id, dcc.competition.name)}
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
      })}
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ---------------------------------------------------------------------------
// Batch competition editor (multi-row)
// ---------------------------------------------------------------------------

type PendingCompetition = {
  key: string;
  compId: string;
  dayOfWeek: 'SATURDAY' | 'SUNDAY';
  recurrence: number;
  startDate: string;
  endDate: string;
  slotsPerDay: number;
};

function CompetitionBatchEditor({
  calendarId,
  calStartDate,
  calEndDate,
  calDayOfWeek,
  calRecurrence,
  availableComps,
  existingCount,
  onDone,
  onCancel,
  startTransition,
}: {
  calendarId: string;
  calStartDate: string;
  calEndDate: string;
  calDayOfWeek: string;
  calRecurrence: number;
  availableComps: CompetitionOption[];
  existingCount: number;
  onDone: () => void;
  onCancel: () => void;
  startTransition: React.TransitionStartFunction;
}) {
  const defaultStart = calStartDate.slice(0, 10);
  const defaultEnd = calEndDate.slice(0, 10);
  const defaultDay = (calDayOfWeek === 'SUNDAY' ? 'SUNDAY' : 'SATURDAY') as 'SATURDAY' | 'SUNDAY';

  const [rows, setRows] = useState<PendingCompetition[]>([
    { key: crypto.randomUUID(), compId: '', dayOfWeek: defaultDay, recurrence: calRecurrence, startDate: defaultStart, endDate: defaultEnd, slotsPerDay: 1 },
  ]);
  const [error, setError] = useState('');

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { key: crypto.randomUUID(), compId: '', dayOfWeek: defaultDay, recurrence: calRecurrence, startDate: defaultStart, endDate: defaultEnd, slotsPerDay: 1 },
    ]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const updateRow = (key: string, field: keyof Omit<PendingCompetition, 'key'>, value: string | number) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const selectedCompIds = new Set(rows.map((r) => r.compId).filter(Boolean));

  const handleValidate = () => {
    setError('');
    const validRows = rows.filter((r) => r.compId && r.startDate && r.endDate);
    if (validRows.length === 0) {
      setError('Ajoutez au moins une compétition avec des dates valides.');
      return;
    }

    startTransition(async () => {
      try {
        await addCompetitionsBatchAndRegenerate(
          calendarId,
          validRows.map((r) => ({
            competitionId: r.compId,
            startDate: r.startDate,
            endDate: r.endDate,
            slotsPerDay: r.slotsPerDay,
            dayOfWeek: r.dayOfWeek,
            recurrence: r.recurrence,
          })),
        );
        onDone();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur');
      }
    });
  };

  const canAddMore = rows.length < availableComps.length;

  return (
    <div className="lrh-draft-batch-editor" style={{
      background: '#fff', border: `1px solid ${LRH.hair}`,
      borderLeft: `4px solid ${LRH.gold}`,
      padding: 20, marginBottom: 20,
    }}>
      <div style={{ ...display, fontSize: 16, fontWeight: 700, color: LRH.navy, marginBottom: 4 }}>
        Ajouter des compétitions
      </div>
      <div style={{ ...body, fontSize: 12, color: LRH.mute, marginBottom: 16 }}>
        Configurez les compétitions et leurs périodes, puis validez pour générer les créneaux.
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

      {/* Column headers (desktop only) */}
      <div className="lrh-draft-batch-header">
        <span style={{ width: 12 }} />
        <span style={{ ...labelStyle, flex: 2, minWidth: 140, marginBottom: 0 }}>Compétition</span>
        <span style={{ ...labelStyle, width: 100, marginBottom: 0 }}>Jour</span>
        <span style={{ ...labelStyle, width: 110, marginBottom: 0 }}>Récurrence</span>
        <span style={{ ...labelStyle, flex: 1, minWidth: 110, marginBottom: 0 }}>Début</span>
        <span style={{ ...labelStyle, flex: 1, minWidth: 110, marginBottom: 0 }}>Fin</span>
        <span style={{ ...labelStyle, width: 65, marginBottom: 0 }}>Matchs/j</span>
        <span style={{ width: 44 }} />
      </div>

      {rows.map((row, idx) => {
        const autoColor = COMP_PALETTE[(existingCount + idx) % COMP_PALETTE.length];
        const availableForRow = availableComps.filter(
          (c) => c.id === row.compId || !selectedCompIds.has(c.id),
        );

        return (
          <div key={row.key} className="lrh-draft-batch-row">
            <span style={{
              width: 12, height: 12, background: autoColor,
              flexShrink: 0, alignSelf: 'center',
            }} />

            <div style={{ flex: 2, minWidth: 140 }}>
              <label className="lrh-draft-batch-label" style={labelStyle}>Compétition</label>
              <select
                value={row.compId}
                onChange={(e) => updateRow(row.key, 'compId', e.target.value)}
                style={inputStyle}
                aria-label="Compétition"
              >
                <option value="">— Choisir —</option>
                {availableForRow.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category} · {c.mode === 'GAZON' ? 'Gazon' : 'Salle'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: 100 }}>
              <label className="lrh-draft-batch-label" style={labelStyle}>Jour</label>
              <select
                value={row.dayOfWeek}
                onChange={(e) => updateRow(row.key, 'dayOfWeek', e.target.value)}
                style={inputStyle}
                aria-label="Jour de la semaine"
              >
                <option value="SATURDAY">Samedi</option>
                <option value="SUNDAY">Dimanche</option>
              </select>
            </div>

            <div style={{ width: 110 }}>
              <label className="lrh-draft-batch-label" style={labelStyle}>Récurrence</label>
              <select
                value={row.recurrence}
                onChange={(e) => updateRow(row.key, 'recurrence', Number(e.target.value))}
                style={inputStyle}
                aria-label="Récurrence"
              >
                <option value={1}>Chaque sem.</option>
                <option value={2}>2 semaines</option>
                <option value={3}>3 semaines</option>
                <option value={4}>4 semaines</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 110 }}>
              <label className="lrh-draft-batch-label" style={labelStyle}>Début</label>
              <input
                type="date"
                value={row.startDate}
                onChange={(e) => updateRow(row.key, 'startDate', e.target.value)}
                style={inputStyle}
                aria-label="Date de début"
              />
            </div>

            <div style={{ flex: 1, minWidth: 110 }}>
              <label className="lrh-draft-batch-label" style={labelStyle}>Fin</label>
              <input
                type="date"
                value={row.endDate}
                onChange={(e) => updateRow(row.key, 'endDate', e.target.value)}
                style={inputStyle}
                aria-label="Date de fin"
              />
            </div>

            <div style={{ width: 65 }}>
              <label className="lrh-draft-batch-label" style={labelStyle}>Matchs/j</label>
              <input
                type="number"
                min={1}
                max={10}
                value={row.slotsPerDay}
                onChange={(e) => updateRow(row.key, 'slotsPerDay', Number(e.target.value))}
                style={{ ...inputStyle, textAlign: 'center' }}
                aria-label="Matchs par journée"
              />
            </div>

            <button
              onClick={() => rows.length > 1 ? removeRow(row.key) : undefined}
              disabled={rows.length <= 1}
              aria-label="Retirer cette ligne"
              style={{
                background: 'transparent', border: 'none',
                color: rows.length > 1 ? LRH.red : 'transparent',
                cursor: rows.length > 1 ? 'pointer' : 'default',
                fontSize: 14, padding: 6,
                minWidth: 44, minHeight: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}

      {availableComps.length === 0 && (
        <div style={{ ...body, fontSize: 12, color: LRH.mute, marginTop: 8 }}>
          Toutes les compétitions sont déjà ajoutées.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
        {canAddMore && (
          <button type="button" onClick={addRow} style={btnOutline(LRH.navy)}>
            + Ajouter une ligne
          </button>
        )}
      </div>

      <div className="lrh-draft-batch-footer">
        <button type="button" onClick={handleValidate} style={{ ...btnPrimary, background: '#059669' }}>
          Valider et générer les créneaux
        </button>
        <button type="button" onClick={onCancel} style={btnOutline(LRH.mute)}>
          Annuler
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PDF selector (dropdown)
// ---------------------------------------------------------------------------

function PdfSelector({
  season,
  competitions,
}: {
  season: string;
  competitions: DraftCalendarCompData[];
}) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const url = e.target.value;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    e.target.value = '';
  };

  return (
    <select
      onChange={handleChange}
      defaultValue=""
      aria-label={`Télécharger un PDF saison ${season}`}
      style={{
        ...mono,
        fontSize: 11,
        fontWeight: 700,
        padding: '10px 18px',
        background: LRH.red,
        color: '#fff',
        border: 'none',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        minHeight: 44,
        maxWidth: '100%',
      }}
    >
      <option value="" disabled style={{ color: '#333' }}>
        PDF saison {season}
      </option>
      <option
        value={`/api/season-plan/${encodeURIComponent(season)}/calendar.pdf`}
        style={{ color: '#333' }}
      >
        Saison complète
      </option>
      {competitions.map((dcc) => (
        <option
          key={dcc.id}
          value={`/api/season-plan/${encodeURIComponent(season)}/${dcc.competitionId}/calendar.pdf`}
          style={{ color: '#333' }}
        >
          {dcc.competition.name} ({dcc.competition.category})
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Edit calendar form
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
  const [dayOfWeek, setDayOfWeek] = useState(cal.dayOfWeek);
  const [recurrence, setRecurrence] = useState(cal.recurrence);
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
        await updateDraftCalendar(cal.id, {
          name,
          season,
          dayOfWeek: dayOfWeek as 'SATURDAY' | 'SUNDAY',
          recurrence,
          startDate,
          endDate,
          notes: notes || null,
        });
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
        <div style={{ ...body, fontSize: 13, color: LRH.red, marginBottom: 12, padding: '8px 12px', background: 'rgba(168,32,47,0.06)', border: `1px solid ${LRH.red}` }}>
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
          <label htmlFor="ec-day" style={labelStyle}>Jour des matchs</label>
          <select id="ec-day" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} style={inputStyle}>
            <option value="SATURDAY">Samedi</option>
            <option value="SUNDAY">Dimanche</option>
          </select>
        </div>
        <div>
          <label htmlFor="ec-rec" style={labelStyle}>Récurrence</label>
          <select id="ec-rec" value={recurrence} onChange={(e) => setRecurrence(Number(e.target.value))} style={inputStyle}>
            <option value={1}>Chaque semaine</option>
            <option value={2}>Toutes les 2 semaines</option>
            <option value={3}>Toutes les 3 semaines</option>
            <option value={4}>Toutes les 4 semaines</option>
          </select>
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

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button type="submit" style={btnPrimary}>Enregistrer</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Matchday card
// ---------------------------------------------------------------------------

function MatchdayCard({
  matchday,
  slots,
  competitions,
  calCompetitions,
  onRemoveMatchday,
  onRemoveSlot,
  onAssign,
}: {
  matchday: number;
  slots: DraftSlotData[];
  competitions: CompetitionOption[];
  calCompetitions: DraftCalendarCompData[];
  onRemoveMatchday: () => void;
  onRemoveSlot: (id: string) => void;
  onAssign: (slotId: string, compId: string | null) => void;
}) {
  const router = useRouter();
  const [, startSlotTransition] = useTransition();
  const date = slots[0]?.date;

  const colorMap = new Map<string, string>();
  for (const dcc of calCompetitions) {
    colorMap.set(dcc.competitionId, dcc.color ?? LRH.navy);
  }

  const handleVenueTextBlur = (slotId: string, value: string) => {
    startSlotTransition(async () => {
      try { await updateDraftSlotVenue(slotId, null, value || null); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  const handleLabelBlur = (slotId: string, value: string) => {
    startSlotTransition(async () => {
      try { await updateDraftSlotLabel(slotId, value || null); router.refresh(); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
    });
  };

  return (
    <div style={{
      background: LRH.paper,
      border: `1px solid ${LRH.hair}`,
      padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Journée {matchday}
          </div>
          <div style={{ ...display, fontSize: 15, fontWeight: 700, color: LRH.navy, marginTop: 2 }}>
            {date ? formatReunionDate(date) : '—'}
          </div>
        </div>
        <button
          onClick={onRemoveMatchday}
          aria-label={`Supprimer la journée ${matchday}`}
          style={{
            background: 'transparent', border: 'none', color: LRH.red,
            cursor: 'pointer', fontSize: 16, padding: 8,
            minWidth: 44, minHeight: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {slots.map((slot) => {
        const slotColor = slot.competitionId ? (colorMap.get(slot.competitionId) ?? LRH.navy) : LRH.hair;
        return (
          <div
            key={slot.id}
            style={{
              padding: '10px 0 10px 10px',
              borderTop: `1px solid ${LRH.hair}`,
              borderLeft: `3px solid ${slotColor}`,
              marginLeft: -10,
              paddingLeft: 10,
            }}
          >
            {/* Row 1: slot index + competition + mode badge + delete */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ ...mono, fontSize: 11, color: LRH.mute, flexShrink: 0, width: 28 }}>
                #{slot.slotIndex}
              </span>

              <select
                value={slot.competitionId ?? ''}
                onChange={(e) => onAssign(slot.id, e.target.value || null)}
                style={{
                  ...body, fontSize: 12, padding: '6px 8px',
                  border: `1px solid ${LRH.hairStrong}`, background: '#fff',
                  flex: 1, minWidth: 0, minHeight: 36,
                  color: slot.competitionId ? LRH.ink : LRH.mute,
                }}
              >
                <option value="">— Non assigné —</option>
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category} · {c.mode === 'GAZON' ? 'Gazon' : 'Salle'})
                  </option>
                ))}
              </select>

              {slot.competition && (
                <span style={{
                  ...mono, fontSize: 9, padding: '2px 6px',
                  background: MODE_COLOR[slot.competition.mode as keyof typeof MODE_COLOR]?.bg ?? LRH.navy,
                  color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
                }}>
                  {slot.competition.mode === 'GAZON' ? 'G' : 'S'}
                </span>
              )}

              <button
                onClick={() => onRemoveSlot(slot.id)}
                aria-label={`Supprimer le créneau ${slot.slotIndex}`}
                style={{
                  background: 'transparent', border: 'none', color: LRH.mute,
                  cursor: 'pointer', fontSize: 12, padding: 6,
                  minWidth: 36, minHeight: 36, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Row 2: venue + label */}
            <div style={{ display: 'flex', gap: 8, marginTop: 6, paddingLeft: 36, flexWrap: 'wrap' }}>
              <input
                type="text"
                defaultValue={slot.venueText ?? ''}
                placeholder="Lieu (à décider)"
                onBlur={(e) => handleVenueTextBlur(slot.id, e.target.value)}
                style={{
                  ...body, fontSize: 11, padding: '4px 6px',
                  border: `1px solid ${LRH.hair}`, background: '#fff',
                  flex: 1, minWidth: 100, minHeight: 32, color: LRH.ink2,
                }}
              />
              <input
                type="text"
                defaultValue={slot.label ?? ''}
                placeholder="Note..."
                onBlur={(e) => handleLabelBlur(slot.id, e.target.value)}
                style={{
                  ...body, fontSize: 11, padding: '4px 6px',
                  border: `1px solid ${LRH.hair}`, background: '#fff',
                  width: 120, minWidth: 80, minHeight: 32, color: LRH.ink2,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creation form (simplified: no slotsPerDay or competition selection)
// ---------------------------------------------------------------------------

function CreateDraftForm({
  onCreated,
  startTransition,
  applyPatch,
}: {
  onCreated: () => void;
  startTransition: React.TransitionStartFunction;
  applyPatch: (patch: Patch) => void;
}) {
  const [name, setName] = useState('');
  const [season, setSeason] = useState('2025-2026');
  const [dayOfWeek, setDayOfWeek] = useState<'SATURDAY' | 'SUNDAY'>('SATURDAY');
  const [recurrence, setRecurrence] = useState(2);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
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
        await createDraftCalendar({
          name, season, dayOfWeek, recurrence, startDate, endDate,
          notes: notes || undefined,
        });
        onCreated();
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
      <div style={{ ...display, fontSize: 18, fontWeight: 700, color: LRH.navy, marginBottom: 20 }}>
        Nouveau calendrier provisoire
      </div>

      {error && (
        <div style={{ ...body, fontSize: 13, color: LRH.red, marginBottom: 16, padding: '10px 14px', background: 'rgba(168,32,47,0.06)', border: `1px solid ${LRH.red}` }}>
          {error}
        </div>
      )}

      <div className="dash-grid-form" style={{ marginBottom: 16 }}>
        <div>
          <label htmlFor="dc-name" style={labelStyle}>Nom du calendrier</label>
          <input id="dc-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Saison Gazon 2025-2026" style={inputStyle} />
        </div>
        <div>
          <label htmlFor="dc-season" style={labelStyle}>Saison</label>
          <input id="dc-season" type="text" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2025-2026" style={inputStyle} />
        </div>
        <div>
          <label htmlFor="dc-day" style={labelStyle}>Jour des matchs</label>
          <select id="dc-day" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value as 'SATURDAY' | 'SUNDAY')} style={inputStyle}>
            <option value="SATURDAY">Samedi</option>
            <option value="SUNDAY">Dimanche</option>
          </select>
        </div>
        <div>
          <label htmlFor="dc-rec" style={labelStyle}>Récurrence</label>
          <select id="dc-rec" value={recurrence} onChange={(e) => setRecurrence(Number(e.target.value))} style={inputStyle}>
            <option value={1}>Chaque semaine</option>
            <option value={2}>Toutes les 2 semaines</option>
            <option value={3}>Toutes les 3 semaines</option>
            <option value={4}>Toutes les 4 semaines</option>
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
          placeholder="Remarques, contraintes, jours fériés à éviter..."
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <p style={{ ...body, fontSize: 12, color: LRH.mute, margin: '0 0 16px' }}>
        Les compétitions seront ajoutées après la création du calendrier, avec leurs périodes respectives.
      </p>

      {startDate && endDate && (
        <PreviewSummary startDate={startDate} endDate={endDate} dayOfWeek={dayOfWeek} recurrence={recurrence} />
      )}

      <button type="submit" style={{ ...btnPrimary, minHeight: 48 }}>
        Créer le calendrier
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Preview summary
// ---------------------------------------------------------------------------

function PreviewSummary({
  startDate,
  endDate,
  dayOfWeek,
  recurrence,
}: {
  startDate: string;
  endDate: string;
  dayOfWeek: 'SATURDAY' | 'SUNDAY';
  recurrence: number;
}) {
  const targetDay = dayOfWeek === 'SATURDAY' ? 6 : 0;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;

  const cursor = new Date(start);
  const currentDay = cursor.getDay();
  const daysUntil = (targetDay - currentDay + 7) % 7;
  cursor.setDate(cursor.getDate() + daysUntil);

  const dates: string[] = [];
  while (cursor <= end) {
    dates.push(cursor.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
    cursor.setDate(cursor.getDate() + 7 * recurrence);
  }

  if (dates.length === 0) return null;

  return (
    <div style={{
      padding: 16, background: 'rgba(0,34,68,0.03)',
      border: `1px solid ${LRH.hair}`, marginBottom: 20,
    }}>
      <div style={{ ...mono, fontSize: 10, color: LRH.navy, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
        Aperçu : {dates.length} journée{dates.length > 1 ? 's' : ''}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {dates.map((d, i) => (
          <span key={i} style={{
            ...mono, fontSize: 11, padding: '4px 10px',
            background: '#fff', border: `1px solid ${LRH.hair}`, color: LRH.ink2,
          }}>
            J{i + 1} — {d}
          </span>
        ))}
      </div>
    </div>
  );
}
