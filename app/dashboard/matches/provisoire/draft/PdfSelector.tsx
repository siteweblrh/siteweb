'use client';

import React, { useState } from 'react';
import { LRH, mono, body } from '@/components/lrh/tokens';
import type {
  DraftCalendarCompData,
} from './types';

// ---------------------------------------------------------------------------
// PDF dropdown
// ---------------------------------------------------------------------------

export function PdfSelector({
  season,
  competitions,
}: {
  season: string;
  competitions: DraftCalendarCompData[];
}) {
  const [open, setOpen] = useState(false);
  // Cache-buster calcule a l OUVERTURE du menu : appeler `Date.now()` dans le
  // corps du composant est un appel impur pendant le rendu (react-hooks/purity),
  // et le resultat changerait a chaque re-rendu sans raison.
  const [ts, setTs] = useState(0);

  const links = [
    {
      label: `Saison complète ${season}`,
      url: `/api/season-plan/${encodeURIComponent(season)}/calendar.pdf?t=${ts}`,
    },
    ...competitions.map((dcc) => ({
      label: `${dcc.competition.name} (${dcc.competition.category})`,
      url: `/api/season-plan/${encodeURIComponent(season)}/${dcc.competitionId}/calendar.pdf?t=${ts}`,
      color: dcc.color,
    })),
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => { if (!open) setTs(Date.now()); setOpen((v) => !v); }}
        style={{
          ...mono, fontSize: 11, fontWeight: 700,
          padding: '10px 18px', background: LRH.red, color: '#fff',
          border: 'none', letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer', minHeight: 44,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>↓</span> PDF {season}
        <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 20,
            background: '#fff', border: `1px solid ${LRH.hairStrong}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            minWidth: 240, marginTop: 2,
          }}
        >
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="lrh-pdf-link"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', ...body, fontSize: 13, color: LRH.ink,
                textDecoration: 'none',
                borderBottom: i < links.length - 1 ? `1px solid ${LRH.hair}` : 'none',
                borderLeft: `3px solid ${'color' in link && link.color ? link.color : LRH.red}`,
                minHeight: 44,
              }}
            >
              <span style={{ fontSize: 13 }}>↓</span>
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
