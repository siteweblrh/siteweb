'use client';

import React, { useState } from 'react';
import { LRH, display, body } from '@/components/lrh/tokens';
import {
  updateDraftCalendar,
} from '@/lib/actions/draftCalendar';
import type {
  DraftCalendarData,
} from './types';
import { inputStyle, labelStyle, btnPrimary } from './styles';

// ---------------------------------------------------------------------------
// Edit calendar form (simplified)
// ---------------------------------------------------------------------------

export function EditCalendarForm({
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
