'use client';

import React, { useState, useTransition, useOptimistic, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, MODE_COLOR, display, mono, body } from '@/components/lrh/tokens';
import {
  createDraftCalendar,
  deleteDraftCalendar,
  removeDraftMatchday,
  removeDraftSlot,
  assignCompetitionToSlot,
  addDraftSlot,
  updateDraftSlotVenue,
  updateDraftSlotLabel,
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

type SlotVenue = {
  id: string;
  name: string;
  city: string;
};

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

  // Collect unique seasons for PDF export
  const seasons = [...new Set(optimistic.map((c) => c.season))];

  return (
    <div style={{ opacity: isPending ? 0.85 : 1, transition: 'opacity 0.15s' }}>
      {/* Action bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
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
          }}
        >
          {showForm ? '✕ Fermer' : '+ Nouveau calendrier provisoire'}
        </button>

        {seasons.map((season) => (
          <a
            key={season}
            href={`/api/season-plan/${encodeURIComponent(season)}/calendar.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...mono,
              fontSize: 11,
              fontWeight: 700,
              padding: '10px 18px',
              background: LRH.red,
              color: '#fff',
              border: 'none',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ↓ PDF saison {season}
          </a>
        ))}
      </div>

      {/* Creation form */}
      {showForm && (
        <CreateDraftForm
          competitions={competitions}
          onCreated={() => {
            setShowForm(false);
            router.refresh();
          }}
          startTransition={startTransition}
          applyPatch={applyPatch}
        />
      )}

      {/* List */}
      {optimistic.length === 0 && !showForm && (
        <div style={{
          padding: 48,
          textAlign: 'center',
          border: `2px dashed ${LRH.hairStrong}`,
          background: '#fff',
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
// Calendar card (expandable)
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
  const dayLabel = cal.dayOfWeek === 'SATURDAY' ? 'Samedi' : 'Dimanche';
  const recLabel = cal.recurrence === 1 ? 'Chaque semaine' : `Toutes les ${cal.recurrence} semaines`;

  const matchdays = new Map<number, DraftSlotData[]>();
  for (const slot of cal.slots) {
    if (!matchdays.has(slot.matchday)) matchdays.set(slot.matchday, []);
    matchdays.get(slot.matchday)!.push(slot);
  }
  const totalMatchdays = matchdays.size;

  const handleRemoveMatchday = (md: number) => {
    if (!confirm(`Supprimer la journée ${md} et ses ${matchdays.get(md)?.length ?? 0} créneaux ?`)) return;
    startTransition(async () => {
      try {
        await removeDraftMatchday(cal.id, md);
        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  const handleRemoveSlot = (slotId: string) => {
    startTransition(async () => {
      try {
        await removeDraftSlot(slotId);
        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  const handleAssign = (slotId: string, compId: string | null) => {
    startTransition(async () => {
      try {
        await assignCompetitionToSlot(slotId, compId);
        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  const [addingMatchday, setAddingMatchday] = useState(false);
  const [addDate, setAddDate] = useState('');
  const nextMd = totalMatchdays > 0 ? Math.max(...Array.from(matchdays.keys())) + 1 : 1;

  const handleAddMatchday = () => {
    if (!addDate) return;
    startTransition(async () => {
      try {
        const promises = [];
        for (let i = 1; i <= cal.slotsPerDay; i++) {
          promises.push(addDraftSlot(cal.id, {
            date: addDate,
            matchday: nextMd,
            slotIndex: i,
          }));
        }
        await Promise.all(promises);
        setAddingMatchday(false);
        setAddDate('');
        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Erreur');
      }
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '16px 20px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          gap: 12,
          textAlign: 'left',
          minHeight: 48,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...display, fontSize: 18, fontWeight: 700, color: LRH.navy }}>
            {cal.name}
          </div>
          <div style={{ ...mono, fontSize: 11, color: LRH.mute, marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>{cal.season}</span>
            <span>{dayLabel}</span>
            <span>{recLabel}</span>
            <span>{totalMatchdays} journée{totalMatchdays > 1 ? 's' : ''}</span>
            <span>{cal.slots.length} créneau{cal.slots.length > 1 ? 'x' : ''}</span>
          </div>
        </div>
        <span style={{ ...mono, fontSize: 14, color: LRH.mute, flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: `1px dashed ${LRH.hairStrong}` }}>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <button
              onClick={() => setAddingMatchday(true)}
              style={{
                ...mono, fontSize: 11, fontWeight: 700, padding: '8px 14px',
                background: 'transparent', color: LRH.navy, border: `1px solid ${LRH.navy}`,
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 44,
              }}
            >
              + Ajouter une journée
            </button>
            <button
              onClick={onDelete}
              style={{
                ...mono, fontSize: 11, fontWeight: 700, padding: '8px 14px',
                background: 'transparent', color: LRH.red, border: `1px solid ${LRH.red}`,
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 44,
              }}
            >
              Supprimer ce calendrier
            </button>
          </div>

          {/* Add matchday form */}
          {addingMatchday && (
            <div style={{
              padding: 16, background: LRH.paper, border: `1px solid ${LRH.hair}`,
              marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
            }}>
              <div>
                <label style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  Date de la journée {nextMd}
                </label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  style={{ ...body, fontSize: 14, padding: '8px 12px', border: `1px solid ${LRH.hairStrong}`, minHeight: 44 }}
                />
              </div>
              <button
                onClick={handleAddMatchday}
                disabled={!addDate}
                style={{
                  ...mono, fontSize: 11, fontWeight: 700, padding: '8px 14px',
                  background: addDate ? LRH.navy : LRH.mute, color: '#fff', border: 'none',
                  letterSpacing: '0.1em', textTransform: 'uppercase', cursor: addDate ? 'pointer' : 'not-allowed', minHeight: 44,
                }}
              >
                Ajouter ({cal.slotsPerDay} créneau{cal.slotsPerDay > 1 ? 'x' : ''})
              </button>
              <button
                onClick={() => { setAddingMatchday(false); setAddDate(''); }}
                style={{
                  ...mono, fontSize: 11, padding: '8px 14px',
                  background: 'transparent', color: LRH.mute, border: `1px solid ${LRH.hair}`,
                  cursor: 'pointer', minHeight: 44,
                }}
              >
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

          {/* Grid of matchdays */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {Array.from(matchdays.entries()).map(([md, slots]) => (
              <MatchdayCard
                key={md}
                matchday={md}
                slots={slots}
                competitions={competitions}
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
// Matchday card
// ---------------------------------------------------------------------------

function MatchdayCard({
  matchday,
  slots,
  competitions,
  onRemoveMatchday,
  onRemoveSlot,
  onAssign,
}: {
  matchday: number;
  slots: DraftSlotData[];
  competitions: CompetitionOption[];
  onRemoveMatchday: () => void;
  onRemoveSlot: (id: string) => void;
  onAssign: (slotId: string, compId: string | null) => void;
}) {
  const router = useRouter();
  const [, startSlotTransition] = useTransition();
  const date = slots[0]?.date;

  const handleVenueTextBlur = (slotId: string, value: string) => {
    startSlotTransition(async () => {
      try {
        await updateDraftSlotVenue(slotId, null, value || null);
        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  const handleLabelBlur = (slotId: string, value: string) => {
    startSlotTransition(async () => {
      try {
        await updateDraftSlotLabel(slotId, value || null);
        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Erreur');
      }
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
            background: 'transparent',
            border: 'none',
            color: LRH.red,
            cursor: 'pointer',
            fontSize: 16,
            padding: 8,
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {slots.map((slot) => (
        <div
          key={slot.id}
          style={{
            padding: '10px 0',
            borderTop: `1px solid ${LRH.hair}`,
          }}
        >
          {/* Row 1: slot index + competition + mode badge + delete */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...mono, fontSize: 11, color: LRH.mute, flexShrink: 0, width: 28 }}>
              #{slot.slotIndex}
            </span>

            <select
              value={slot.competitionId ?? ''}
              onChange={(e) => onAssign(slot.id, e.target.value || null)}
              style={{
                ...body,
                fontSize: 12,
                padding: '6px 8px',
                border: `1px solid ${LRH.hairStrong}`,
                background: '#fff',
                flex: 1,
                minWidth: 0,
                minHeight: 36,
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
                ...mono,
                fontSize: 9,
                padding: '2px 6px',
                background: MODE_COLOR[slot.competition.mode as keyof typeof MODE_COLOR]?.bg ?? LRH.navy,
                color: '#fff',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                {slot.competition.mode === 'GAZON' ? 'G' : 'S'}
              </span>
            )}

            <button
              onClick={() => onRemoveSlot(slot.id)}
              aria-label={`Supprimer le créneau ${slot.slotIndex}`}
              style={{
                background: 'transparent',
                border: 'none',
                color: LRH.mute,
                cursor: 'pointer',
                fontSize: 12,
                padding: 6,
                minWidth: 36,
                minHeight: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Row 2: lieu (texte libre, à décider en concertation) + note */}
          <div style={{ display: 'flex', gap: 8, marginTop: 6, paddingLeft: 36 }}>
            <input
              type="text"
              defaultValue={slot.venueText ?? ''}
              placeholder="Lieu (à décider)"
              onBlur={(e) => handleVenueTextBlur(slot.id, e.target.value)}
              style={{
                ...body,
                fontSize: 11,
                padding: '4px 6px',
                border: `1px solid ${LRH.hair}`,
                background: '#fff',
                flex: 1,
                minWidth: 0,
                minHeight: 32,
                color: LRH.ink2,
              }}
            />

            <input
              type="text"
              defaultValue={slot.label ?? ''}
              placeholder="Note..."
              onBlur={(e) => handleLabelBlur(slot.id, e.target.value)}
              style={{
                ...body,
                fontSize: 11,
                padding: '4px 6px',
                border: `1px solid ${LRH.hair}`,
                background: '#fff',
                width: 120,
                minHeight: 32,
                color: LRH.ink2,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creation form
// ---------------------------------------------------------------------------

function CreateDraftForm({
  competitions,
  onCreated,
  startTransition,
  applyPatch,
}: {
  competitions: CompetitionOption[];
  onCreated: () => void;
  startTransition: React.TransitionStartFunction;
  applyPatch: (patch: Patch) => void;
}) {
  const [name, setName] = useState('');
  const [season, setSeason] = useState('2025-2026');
  const [dayOfWeek, setDayOfWeek] = useState<'SATURDAY' | 'SUNDAY'>('SATURDAY');
  const [recurrence, setRecurrence] = useState(2);
  const [slotsPerDay, setSlotsPerDay] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedComps, setSelectedComps] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const toggleComp = (id: string) => {
    setSelectedComps((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

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
          name,
          season,
          dayOfWeek,
          recurrence,
          slotsPerDay,
          startDate,
          endDate,
          competitionIds: selectedComps,
          notes: notes || undefined,
        });
        onCreated();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur à la création');
      }
    });
  };

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

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#fff',
        border: `1px solid ${LRH.hair}`,
        borderLeft: `4px solid ${LRH.gold}`,
        padding: 24,
        marginBottom: 24,
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Name */}
        <div>
          <label htmlFor="dc-name" style={labelStyle}>Nom du calendrier</label>
          <input id="dc-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Calendrier Gazon 2025-2026" style={inputStyle} />
        </div>

        {/* Season */}
        <div>
          <label htmlFor="dc-season" style={labelStyle}>Saison</label>
          <input id="dc-season" type="text" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2025-2026" style={inputStyle} />
        </div>

        {/* Day of week */}
        <div>
          <label htmlFor="dc-day" style={labelStyle}>Jour des matchs</label>
          <select id="dc-day" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value as 'SATURDAY' | 'SUNDAY')} style={inputStyle}>
            <option value="SATURDAY">Samedi</option>
            <option value="SUNDAY">Dimanche</option>
          </select>
        </div>

        {/* Recurrence */}
        <div>
          <label htmlFor="dc-rec" style={labelStyle}>Récurrence</label>
          <select id="dc-rec" value={recurrence} onChange={(e) => setRecurrence(Number(e.target.value))} style={inputStyle}>
            <option value={1}>Chaque semaine</option>
            <option value={2}>Toutes les 2 semaines</option>
            <option value={3}>Toutes les 3 semaines</option>
            <option value={4}>Toutes les 4 semaines</option>
          </select>
        </div>

        {/* Slots per day */}
        <div>
          <label htmlFor="dc-slots" style={labelStyle}>Matchs par journée</label>
          <input id="dc-slots" type="number" min={1} max={20} value={slotsPerDay} onChange={(e) => setSlotsPerDay(Number(e.target.value))} style={inputStyle} />
        </div>

        {/* Start date */}
        <div>
          <label htmlFor="dc-start" style={labelStyle}>Date de début</label>
          <input id="dc-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </div>

        {/* End date */}
        <div>
          <label htmlFor="dc-end" style={labelStyle}>Date de fin</label>
          <input id="dc-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Competitions multi-select */}
      <div style={{ marginBottom: 20 }}>
        <div style={labelStyle}>Compétitions à répartir sur les créneaux (optionnel)</div>
        <p style={{ ...body, fontSize: 12, color: LRH.mute, margin: '0 0 10px' }}>
          Les compétitions sélectionnées seront distribuées en rotation sur les créneaux de chaque journée. Vous pourrez aussi les assigner manuellement après.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {competitions.map((c) => {
            const selected = selectedComps.includes(c.id);
            const modeColor = MODE_COLOR[c.mode as keyof typeof MODE_COLOR];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleComp(c.id)}
                style={{
                  ...mono,
                  fontSize: 11,
                  padding: '8px 14px',
                  border: selected ? `2px solid ${modeColor?.bg ?? LRH.navy}` : `1px solid ${LRH.hairStrong}`,
                  background: selected ? (modeColor?.soft ?? 'rgba(0,34,68,0.06)') : '#fff',
                  color: selected ? (modeColor?.bg ?? LRH.navy) : LRH.ink2,
                  cursor: 'pointer',
                  fontWeight: selected ? 700 : 400,
                  letterSpacing: '0.06em',
                  minHeight: 44,
                }}
              >
                {c.name} · {c.category}
              </button>
            );
          })}
          {competitions.length === 0 && (
            <span style={{ ...body, fontSize: 13, color: LRH.mute }}>
              Aucune compétition créée. Vous pourrez assigner les créneaux plus tard.
            </span>
          )}
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 20 }}>
        <label htmlFor="dc-notes" style={labelStyle}>Notes (optionnel)</label>
        <textarea
          id="dc-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Remarques, contraintes, jours fériés à éviter..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Preview */}
      {startDate && endDate && (
        <PreviewSummary
          startDate={startDate}
          endDate={endDate}
          dayOfWeek={dayOfWeek}
          recurrence={recurrence}
          slotsPerDay={slotsPerDay}
        />
      )}

      <button
        type="submit"
        style={{
          ...mono,
          fontSize: 12,
          fontWeight: 700,
          padding: '12px 24px',
          background: LRH.navy,
          color: '#fff',
          border: 'none',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          minHeight: 48,
        }}
      >
        Générer le calendrier provisoire
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Preview summary (client-side estimation)
// ---------------------------------------------------------------------------

function PreviewSummary({
  startDate,
  endDate,
  dayOfWeek,
  recurrence,
  slotsPerDay,
}: {
  startDate: string;
  endDate: string;
  dayOfWeek: 'SATURDAY' | 'SUNDAY';
  recurrence: number;
  slotsPerDay: number;
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
      padding: 16,
      background: 'rgba(0,34,68,0.03)',
      border: `1px solid ${LRH.hair}`,
      marginBottom: 20,
    }}>
      <div style={{ ...mono, fontSize: 10, color: LRH.navy, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
        Aperçu : {dates.length} journée{dates.length > 1 ? 's' : ''} · {dates.length * slotsPerDay} créneau{dates.length * slotsPerDay > 1 ? 'x' : ''}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {dates.map((d, i) => (
          <span
            key={i}
            style={{
              ...mono,
              fontSize: 11,
              padding: '4px 10px',
              background: '#fff',
              border: `1px solid ${LRH.hair}`,
              color: LRH.ink2,
            }}
          >
            J{i + 1} — {d}
          </span>
        ))}
      </div>
    </div>
  );
}
