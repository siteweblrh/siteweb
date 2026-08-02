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
import type { DraftCalendarCompData, Props } from './draft/types';
import { btnPrimary } from './draft/styles';
import { useConfirm } from '@/components/lrh/dashboard/useConfirm';
import { reducer } from './draft/reducer';
import { CalendarCard } from './draft/CalendarCard';
import { CreateDraftForm } from './draft/CreateDraftForm';
import { PdfSelector } from './draft/PdfSelector';


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
  const [ask, confirmDialog] = useConfirm();

  const handleDelete = useCallback(async (id: string) => {
    const ok = await ask({
      title: 'Supprimer ce calendrier provisoire ?',
      message: 'Toutes ses dates et tous ses créneaux seront supprimés. Les matchs déjà publiés ne sont pas touchés.',
      confirmLabel: 'Supprimer', danger: true,
    });
    if (!ok) return;
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
  }, [applyPatch, router, startTransition, ask]);

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
      {confirmDialog}
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
            Créez un squelette de saison pour planifier les dates avant l&apos;engagement des clubs.
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
