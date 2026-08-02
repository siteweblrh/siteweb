'use client';

import React, { useState } from 'react';
import { LRH, mono, body } from '@/components/lrh/tokens';
import { inputStyle, labelStyle, btnPrimary, btnOutline } from './styles';

// ---------------------------------------------------------------------------
// Day editor — pour une journée : nombre de matchs par compétition (override)
// + déplacement d'une compétition vers une autre date
// ---------------------------------------------------------------------------

export function DayEditor({
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
