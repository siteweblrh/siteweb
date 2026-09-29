'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';
import { sharedRanks } from '@/lib/utils/rank';
import type { YouthRefereeRow } from '@/lib/queries/youth';

/**
 * Classement des jeunes arbitres d'une discipline : qui a tenu le sifflet, et
 * combien de fois. Demandé par la commission pour mettre ces jeunes en avant
 * en fin de saison.
 *
 * Même grammaire visuelle que `YouthScorersList` (rang, nom, pill numérique,
 * strip or pour le ou les leaders) : les deux classements se lisent de la même
 * façon sur la même page. Rang partagé à égalité, comme les buteurs.
 *
 * Pas de club affiché : les feuilles ne portent que le prénom de l'arbitre, et
 * on ne rattache pas un enfant à un licencié sur une simple homonymie.
 */
export function YouthRefereesBoard({
  rows,
  modeLabel,
  mobileVariant = false,
}: {
  rows: YouthRefereeRow[];
  /** « gazon » / « salle », pour l'état vide. */
  modeLabel: string;
  mobileVariant?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p style={{
        ...body, fontSize: 14, color: LRH.mute, fontStyle: 'italic',
        margin: '18px 0 0', padding: mobileVariant ? 16 : 22,
        background: '#fff', border: '1px dashed ' + LRH.hairStrong,
      }}>
        Aucun arbitrage jeune enregistré en {modeLabel} pour cette saison.
      </p>
    );
  }

  const leader = rows[0].matches;
  const ranks = sharedRanks(rows.map((r) => r.matches));

  return (
    <ol
      aria-label={`Classement des jeunes arbitres — ${modeLabel}`}
      style={{
        listStyle: 'none', margin: '18px 0 0', padding: 0,
        background: '#fff', border: '1px solid ' + LRH.hairStrong,
        maxWidth: 640,
      }}
    >
      {rows.map((r, i) => {
        const isLeader = r.matches === leader;
        return (
          <li
            key={r.name}
            style={{
              display: 'flex', alignItems: 'center',
              gap: mobileVariant ? 10 : 14,
              padding: mobileVariant ? '10px 16px' : '10px 22px',
              borderTop: i === 0 ? 'none' : '1px solid ' + LRH.hair,
              boxShadow: isLeader ? `inset 4px 0 0 ${LRH.gold}` : undefined,
              minHeight: 44,
            }}
          >
            <span style={{
              ...mono, fontSize: 10.5, fontWeight: 800,
              width: 22, flex: '0 0 22px',
              color: LRH.mute, textAlign: 'right',
            }}>
              {ranks[i]}
            </span>
            <span style={{
              ...body, fontSize: mobileVariant ? 14 : 15, fontWeight: 600,
              color: LRH.ink, flex: '1 1 auto', minWidth: 0,
              overflowWrap: 'break-word',
            }}>
              {r.name}
            </span>
            <span style={{
              ...display, fontSize: 13, fontWeight: 800,
              padding: '3px 10px', flex: '0 0 auto',
              background: isLeader ? LRH.gold : LRH.navy,
              color: isLeader ? LRH.navy : '#fff',
              letterSpacing: '-0.01em', whiteSpace: 'nowrap',
            }}>
              {r.matches} match{r.matches > 1 ? 's' : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
