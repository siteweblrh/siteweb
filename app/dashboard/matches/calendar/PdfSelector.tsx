'use client';

// Téléchargement du calendrier officiel en PDF, par compétition.
//
// La route `/api/competitions/[id]/calendar.pdf` existait déjà et produit un
// document complet — dates, horaires, terrains et arbitres. Rien ne la
// déclenchait depuis le calendrier validé : seul le brouillon avait ses
// boutons PDF. Ce composant comble ce manque.
//
// Fichier séparé plutôt qu'ajouté à CalendarAdmin (1100 lignes) : une
// responsabilité, un fichier.

import React, { useMemo, useState } from 'react';
import { LRH, mono, body } from '@/components/lrh/tokens';

export type PdfCompetitionOption = {
  id: string;
  name: string;
  season: string;
  category: string;
  mode: string;
};

export function PdfSelector({
  competitions,
  /** Compétitions ayant au moins un match : inutile de proposer un PDF vide. */
  competitionIdsWithMatches,
}: {
  competitions: PdfCompetitionOption[];
  competitionIdsWithMatches: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  // Horodatage calculé à l'OUVERTURE du menu, pas pendant le rendu : appeler
  // Date.now() en phase de rendu casse la pureté du composant (React peut
  // rejouer un rendu à tout moment). Il casse le cache navigateur pour qu'un
  // PDF regénéré après modification du calendrier soit bien le nouveau.
  const [ts, setTs] = useState(0);

  const links = useMemo(() => {
    return competitions
      .filter((c) => competitionIdsWithMatches.has(c.id))
      .map((c) => ({
        id: c.id,
        label: `${c.name} · ${c.category}`,
        season: c.season,
        url: `/api/competitions/${c.id}/calendar.pdf?t=${ts}`,
      }));
  }, [competitions, competitionIdsWithMatches, ts]);

  if (links.length === 0) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => { setTs(Date.now()); setOpen((v) => !v); }}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          ...mono, fontSize: 11, fontWeight: 700,
          padding: '10px 18px', background: LRH.red, color: '#fff',
          border: 'none', letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer', minHeight: 44,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 14 }}>↓</span> PDF officiel
        <span aria-hidden="true" style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 20,
            background: '#fff', border: `1px solid ${LRH.hairStrong}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            minWidth: 280, marginTop: 2,
          }}
        >
          <div
            style={{
              ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.14em',
              textTransform: 'uppercase', padding: '10px 16px 6px',
            }}
          >
            Dates, horaires, terrains et arbitres
          </div>
          {links.map((link) => (
            <a
              key={link.id}
              role="menuitem"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="lrh-pdf-link"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', ...body, fontSize: 13, color: LRH.ink,
                textDecoration: 'none',
                borderTop: `1px solid ${LRH.hair}`,
                borderLeft: `3px solid ${LRH.red}`,
                minHeight: 44,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 13 }}>↓</span>
              <span style={{ minWidth: 0 }}>
                {link.label}
                <span style={{ ...mono, fontSize: 10, color: LRH.mute, marginLeft: 6 }}>
                  {link.season}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
