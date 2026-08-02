'use client';

import React from 'react';
import { LRH, MODE_COLOR, mono, body } from '@/components/lrh/tokens';
import type {
  DraftCalendarCompData,
} from './types';

// ---------------------------------------------------------------------------
// Competition row — inline editable
// ---------------------------------------------------------------------------

export function CompetitionRow({
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
