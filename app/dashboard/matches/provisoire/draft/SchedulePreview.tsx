'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, mono, body } from '@/components/lrh/tokens';
import { holidayMap } from '@/lib/utils/holidays-reunion';
import { unpublishMatchday } from '@/lib/actions/draftCalendar';
import {
  computeMatchdays,
  matchdayLabel,
  type MatchdayStatus,
} from '@/lib/scheduling/matchdayState';
import type {
  DraftSlotData,
  DraftCalendarCompData,
  ClubOptionLite,
  VenueOptionLite,
  RefereeOptionLite,
} from './types';
import { inputStyle, labelStyle, btnPrimary, btnOutline, sectionLabelStyle } from './styles';
import { ConvertMatchdayModal, type SlotForConversion } from '../ConvertMatchdayModal';
import { DayEditor } from './DayEditor';

// ---------------------------------------------------------------------------
// Schedule preview — dates grouped by month (replaces MatchdayCard grid)
// ---------------------------------------------------------------------------

/**
 * Couleur de l'état d'une journée. La progression se lit sans lire le mot :
 * gris → gold → vert. Le rouge est réservé à « jouée », le seul état dont on ne
 * revient pas.
 */
const STATUS_TONE: Record<MatchdayStatus, React.CSSProperties> = {
  vide: { background: LRH.paperWarm, color: LRH.mute },
  tiree: { background: LRH.gold, color: LRH.navy },
  partielle: { background: LRH.gold, color: LRH.navy },
  publiee: { background: '#1B7340', color: '#fff' },
  jouee: { background: LRH.navy, color: '#fff' },
};

export function SchedulePreview({
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
  const router = useRouter();
  const [unpublishing, startUnpublish] = useTransition();

  // Dépublier détruit des matchs : c'est réversible dans les faits (il suffit de
  // republier) mais on demande quand même, parce que le nombre supprimé n'est
  // pas visible depuis la rangée.
  const onUnpublish = (matchday: number, count: number, dateLabel: string) => {
    const quoi = count > 1 ? `les ${count} matchs publiés` : 'le match publié';
    if (!confirm(`Dépublier ${quoi} du ${dateLabel} ?\n\nLa journée revient à l'état « tirée » : les affiches restent, seuls les matchs officiels sont supprimés. Aucun score n'est saisi, rien n'est perdu.`)) return;
    startUnpublish(async () => {
      try {
        await unpublishMatchday(draftCalendarId, matchday);
        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

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
            // État de la journée déduit de ses créneaux — source unique, testée.
            // Remplace les compteurs ad hoc qui divergeaient d'un endroit à
            // l'autre de l'écran. Cf. lib/scheduling/matchdayState.ts.
            const [dayState] = computeMatchdays(
              entry.slots.map((s) => ({
                slotId: s.id,
                matchday: s.matchday,
                date: dateKey,
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
            );
            const convertedCount = dayState?.counts.published ?? 0;
            const canConvert = dayState?.actions.publish.allowed === true && clubs.length > 0;
            const canUnpublish = dayState?.actions.unpublish.allowed === true;
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

                {/* L'état de la journée, en un mot. Il n'y a plus de « monde »
                    brouillon ni officiel : une journée a un état, et il se lit. */}
                {dayState && (
                  <span
                    title={
                      dayState.status === 'partielle'
                        ? `${dayState.counts.published} créneau(x) publié(s) sur ${dayState.counts.total}`
                        : undefined
                    }
                    style={{
                      ...mono, fontSize: 9, padding: '3px 7px', fontWeight: 700,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      flexShrink: 0,
                      ...STATUS_TONE[dayState.status],
                    }}
                  >
                    {matchdayLabel(dayState.status)}
                    {dayState.status === 'partielle'
                      ? ` ${dayState.counts.published}/${dayState.counts.total}`
                      : ''}
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
                    title="Publier les matchs de cette journée — réversible tant qu'aucun score n'est saisi"
                    style={{
                      ...mono, fontSize: 10, fontWeight: 700,
                      padding: '5px 10px',
                      background: LRH.navy, color: '#fff',
                      border: 'none', cursor: 'pointer',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    Publier
                  </button>
                )}

                {/* Le geste symétrique. Il n'apparaît que lorsqu'il est permis :
                    un bouton grisé n'apprend rien, alors que la raison du refus,
                    affichée à côté de l'état, se lit. */}
                {canUnpublish && (
                  <button
                    onClick={() => onUnpublish(entry.matchday, convertedCount, dateStr)}
                    disabled={unpublishing}
                    title="Supprimer les matchs publiés de cette journée et la ramener à l'état tirée"
                    style={{
                      ...mono, fontSize: 10, fontWeight: 700,
                      padding: '5px 10px',
                      background: 'transparent', color: LRH.red,
                      border: `1px solid ${LRH.red}`,
                      cursor: unpublishing ? 'wait' : 'pointer',
                      opacity: unpublishing ? 0.5 : 1,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    Dépublier
                  </button>
                )}
                {dayState?.status === 'jouee' && (
                  <span style={{ ...mono, fontSize: 9, color: LRH.mute, flexShrink: 0 }}>
                    {dayState.actions.unpublish.allowed === false
                      ? dayState.actions.unpublish.reason
                      : ''}
                  </span>
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
