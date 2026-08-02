'use client';

import React, { useState } from 'react';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import {
  createDraftCalendar,
  excludeDate,
} from '@/lib/actions/draftCalendar';
import { nextSeason, holidaysForRange } from '@/lib/utils/holidays-reunion';
import { inputStyle, labelStyle, btnPrimary } from './styles';

// ---------------------------------------------------------------------------
// Create calendar form (simplified)
// ---------------------------------------------------------------------------

export function CreateDraftForm({
  onCreated,
  startTransition,
}: {
  onCreated: (id: string) => void;
  startTransition: React.TransitionStartFunction;
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
        Définissez la période de la saison. Les compétitions seront ajoutées dans l&apos;étape suivante.
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
