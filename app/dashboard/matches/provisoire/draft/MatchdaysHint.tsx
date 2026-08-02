'use client';

import React from 'react';
import { LRH, mono, body } from '@/components/lrh/tokens';
import type {
  CompetitionOption,
} from './types';
import { matchdaysForTeamCount } from './dates';

// ---------------------------------------------------------------------------
// Matchdays hint — table de référence + projection sur les inscrits courants.
// À la Réunion les compés tournent autour de 3-5 équipes, donc la table est
// petite et l'écart entre les cas reste lisible.
// ---------------------------------------------------------------------------

export function MatchdaysHint({ selectedComp }: { selectedComp: CompetitionOption | null }) {
  const entries = selectedComp?._count.entries ?? 0;
  const doubleRound = selectedComp?.doubleRound ?? false;

  // Projection précise si une compé est sélectionnée et qu'elle a déjà des inscrits.
  const projection = selectedComp && entries >= 2
    ? matchdaysForTeamCount(entries, doubleRound)
    : null;

  const ROWS: Array<{ n: number; simple: number; aller: number }> = [
    { n: 3, simple: matchdaysForTeamCount(3, false), aller: matchdaysForTeamCount(3, true) },
    { n: 4, simple: matchdaysForTeamCount(4, false), aller: matchdaysForTeamCount(4, true) },
    { n: 5, simple: matchdaysForTeamCount(5, false), aller: matchdaysForTeamCount(5, true) },
    { n: 6, simple: matchdaysForTeamCount(6, false), aller: matchdaysForTeamCount(6, true) },
  ];

  return (
    <div style={{
      marginBottom: 14, padding: 12,
      background: '#fff', border: `1px dashed ${LRH.hairStrong}`,
    }}>
      <div style={{
        ...mono, fontSize: 9.5, fontWeight: 700,
        color: LRH.navy, letterSpacing: '0.14em',
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        ◇ Combien de journées prévoir ?
      </div>

      {projection !== null ? (
        <div style={{ ...body, fontSize: 12.5, color: LRH.ink2, marginBottom: 8 }}>
          Cette compétition a <strong style={{ color: LRH.navy }}>{entries} équipe{entries > 1 ? 's' : ''}</strong> inscrite{entries > 1 ? 's' : ''}
          {' '}→ il faut <strong style={{ color: LRH.red }}>{projection} journée{projection > 1 ? 's' : ''}</strong>
          {' '}en {doubleRound ? 'aller-retour' : 'aller simple'}.
        </div>
      ) : (
        <div style={{ ...body, fontSize: 12, color: LRH.mute, marginBottom: 8 }}>
          Aucun club inscrit pour l&apos;instant. La table ci-dessous donne la fourchette habituelle (Réunion = 3-5 équipes max).
        </div>
      )}

      <table style={{
        ...mono, fontSize: 11, color: LRH.ink2,
        width: '100%', borderCollapse: 'collapse',
      }}>
        <thead>
          <tr style={{ background: LRH.paper }}>
            <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 700, letterSpacing: '0.08em' }}>Équipes</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 700, letterSpacing: '0.08em' }}>Aller simple</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 700, letterSpacing: '0.08em' }}>Aller-retour</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const highlight = entries === r.n;
            return (
              <tr key={r.n} style={{ background: highlight ? 'rgba(243,188,28,0.12)' : 'transparent' }}>
                <td style={{ padding: '4px 8px', fontWeight: highlight ? 700 : 400 }}>{r.n}</td>
                <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: highlight && !doubleRound ? 700 : 400 }}>
                  {r.simple} j
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: highlight && doubleRound ? 700 : 400 }}>
                  {r.aller} j
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
