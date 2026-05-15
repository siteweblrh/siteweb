'use client';

import React from 'react';
import { LRH, mono, MODE_COLOR, categoryAccent, type ModeKey } from './tokens';

export function ModeBadge({ mode, size = 'md' }: { mode: ModeKey | string; size?: 'sm' | 'md' }) {
  const key = (mode as string).toUpperCase() as ModeKey;
  const palette = MODE_COLOR[key] ?? { bg: LRH.navy, fg: '#fff', label: mode };
  const isSm = size === 'sm';
  return (
    <span style={{
      ...mono, fontSize: isSm ? 9 : 10, fontWeight: 800,
      padding: isSm ? '2px 6px' : '3px 8px',
      borderRadius: 2,
      background: palette.bg, color: palette.fg,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      display: 'inline-flex', alignItems: 'center', gap: 5,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: isSm ? 4 : 5, height: isSm ? 4 : 5, borderRadius: '50%',
        background: palette.fg, opacity: 0.85,
      }} />
      {palette.label}
    </span>
  );
}

export function CategoryBadge({ category, size = 'md' }: { category: string; size?: 'sm' | 'md' }) {
  const color = categoryAccent(category);
  const isSm = size === 'sm';
  return (
    <span style={{
      ...mono, fontSize: isSm ? 9 : 10, fontWeight: 700,
      padding: isSm ? '2px 6px' : '3px 8px',
      borderRadius: 2,
      background: 'rgba(10,18,32,0.04)',
      color, letterSpacing: '0.12em', textTransform: 'uppercase',
      border: `1px solid ${color}`,
      whiteSpace: 'nowrap',
    }}>{category}</span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    SCHEDULED:  { bg: LRH.paperWarm, fg: LRH.mute, label: 'Programmé' },
    LIVE:       { bg: LRH.red, fg: '#fff', label: '● Live' },
    HALFTIME:   { bg: LRH.gold, fg: LRH.navy, label: 'Mi-temps' },
    FINISHED:   { bg: LRH.navy, fg: '#fff', label: 'Terminé' },
    POSTPONED:  { bg: '#7a7065', fg: '#fff', label: 'Reporté' },
    CANCELLED:  { bg: '#3f3f46', fg: '#fff', label: 'Annulé' },
  };
  const v = map[status] ?? map.SCHEDULED;
  return (
    <span style={{
      ...mono, fontSize: 9.5, fontWeight: 800,
      padding: '3px 8px', borderRadius: 2,
      background: v.bg, color: v.fg,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>{v.label}</span>
  );
}
