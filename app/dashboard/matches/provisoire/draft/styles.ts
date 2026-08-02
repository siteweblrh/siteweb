import React from 'react';
import { LRH, mono, body } from '@/components/lrh/tokens';

// Extrait de DraftCalendarAdmin.tsx (2200 lignes) — un fichier, une responsabilite.

export const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 14,
  padding: '10px 12px',
  border: `1px solid ${LRH.hairStrong}`,
  width: '100%',
  minHeight: 44,
  boxSizing: 'border-box',
};

export const labelStyle: React.CSSProperties = {
  ...mono,
  fontSize: 10,
  color: LRH.mute,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 6,
};

export const btnPrimary: React.CSSProperties = {
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

export const btnOutline = (color: string): React.CSSProperties => ({
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

export const btnDanger: React.CSSProperties = btnOutline(LRH.red);

export const sectionLabelStyle: React.CSSProperties = {
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

export const COMP_PALETTE = [
  '#002244', '#1B7340', '#A8202F', '#2563EB', '#F3BC1C',
  '#7C3AED', '#0891B2', '#DC2626', '#059669', '#D97706',
];

// ---------------------------------------------------------------------------
