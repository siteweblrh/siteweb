'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, body, mono } from '@/components/lrh/tokens';

type Mode = 'officiel' | 'brouillon';

export function CalendarToolbar({
  mode,
  isAdmin,
}: {
  mode: Mode;
  isAdmin: boolean;
}) {
  const toggleStyle = (active: boolean): React.CSSProperties => ({
    ...mono,
    fontSize: 11,
    fontWeight: 700,
    padding: '10px 18px',
    background: active ? LRH.navy : 'transparent',
    color: active ? '#fff' : LRH.navy,
    border: '1px solid ' + LRH.navy,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  });

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'clamp(16px, 3vw, 24px)',
        padding: 'clamp(12px, 2vw, 16px)',
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderRadius: 4,
      }}
    >
      {/* Toggle Brouillon / Officiel */}
      <div style={{ display: 'inline-flex', borderRadius: 4, overflow: 'hidden' }}>
        <Link
          href="/dashboard/matches/calendar"
          style={toggleStyle(mode === 'officiel')}
        >
          ◉ Officiel
        </Link>
        <Link
          href="/dashboard/matches/calendar?mode=brouillon"
          style={{ ...toggleStyle(mode === 'brouillon'), borderLeft: 'none' }}
        >
          ◌ Brouillon
        </Link>
      </div>

      {/* Actions admin — visibles seulement en mode Officiel et pour admin */}
      {isAdmin && mode === 'officiel' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/matches/journee/new"
            style={{
              ...body,
              fontSize: 12,
              fontWeight: 700,
              padding: '10px 16px',
              borderRadius: 4,
              background: 'transparent',
              color: LRH.navy,
              border: '1px solid ' + LRH.navy,
              textDecoration: 'none',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            + Créer une journée
          </Link>
          <Link
            href="/dashboard/matches/tirage"
            style={{
              ...body,
              fontSize: 12,
              fontWeight: 700,
              padding: '10px 16px',
              borderRadius: 4,
              background: LRH.gold,
              color: LRH.navy,
              border: '1px solid ' + LRH.gold,
              textDecoration: 'none',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ◎ Tirage au sort
          </Link>
        </div>
      )}
    </div>
  );
}
