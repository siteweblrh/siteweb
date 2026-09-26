'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';
import { memberFullName, memberInitials } from '@/lib/utils/member-name';
import type { YouthScorerRow } from '@/lib/queries/scorers';

/**
 * Classement des buteurs d'UNE catégorie jeune, en version compacte —
 * conçu pour s'insérer dans la card d'une compétition sur /jeunes, sous le
 * tableau de classement.
 *
 * Volontairement distinct de `ScorersBoard` (podium pleine largeur de
 * /classements) : ici il y a N catégories sur la même page, donc pas de place
 * pour un podium par catégorie. Les deux lisent le même tri, côté query.
 *
 * Les jeunes n'ont souvent qu'un prénom en base (les feuilles de rassemblement
 * ne portent pas le nom de famille des mineurs) : l'affichage passe par
 * `memberFullName`, jamais par une concaténation directe.
 */
export function YouthScorersList({
  scorers,
  mobileVariant = false,
  totalLabel,
}: {
  scorers: YouthScorerRow[];
  mobileVariant?: boolean;
  /** Libellé de contexte affiché à droite du kicker (ex. « 8 buteurs »). */
  totalLabel?: string;
}) {
  if (scorers.length === 0) return null;

  const pad = mobileVariant ? '14px 16px' : '16px 22px';
  const leaderGoals = scorers[0].goalsScored;

  return (
    <section
      style={{
        borderTop: '1px dashed ' + LRH.hairStrong,
        background: LRH.paperWarm,
      }}
      aria-label="Classement des buteurs de la catégorie"
    >
      <header
        style={{
          padding: pad,
          paddingBottom: 10,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h4
          style={{
            ...mono,
            margin: 0,
            fontSize: 10,
            fontWeight: 800,
            color: LRH.red,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          ◎ Meilleurs buteurs
        </h4>
        {totalLabel && (
          <span
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {totalLabel}
          </span>
        )}
      </header>

      <ol style={{ listStyle: 'none', margin: 0, padding: `0 0 ${mobileVariant ? 14 : 18}px` }}>
        {scorers.map((s, i) => {
          const isLeader = s.goalsScored === leaderGoals;
          return (
            <li
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: mobileVariant ? 10 : 12,
                padding: mobileVariant ? '8px 16px' : '8px 22px',
                borderTop: i === 0 ? 'none' : '1px solid ' + LRH.hair,
                // Zone qualif/relégation du projet : strip vertical à gauche.
                // Ici il marque le ou les leaders de la catégorie.
                boxShadow: isLeader ? `inset 3px 0 0 ${LRH.gold}` : undefined,
                minHeight: 40,
              }}
            >
              <span
                style={{
                  ...mono,
                  fontSize: 10,
                  fontWeight: 800,
                  width: 20,
                  flex: '0 0 20px',
                  color: LRH.mute,
                  textAlign: 'right',
                }}
              >
                {i + 1}
              </span>

              {/* Pastille initiales — pas de photo : les feuilles de
                  rassemblement n'en fournissent pas, et une pastille vide
                  vaut mieux qu'un cadre gris. */}
              <span
                aria-hidden="true"
                style={{
                  ...mono,
                  fontSize: 10,
                  fontWeight: 800,
                  width: 26,
                  height: 26,
                  flex: '0 0 26px',
                  display: 'grid',
                  placeItems: 'center',
                  background: LRH.navy,
                  color: '#fff',
                  letterSpacing: 0,
                }}
              >
                {memberInitials(s)}
              </span>

              <span
                style={{
                  ...body,
                  fontSize: mobileVariant ? 13 : 13.5,
                  fontWeight: 600,
                  color: LRH.ink,
                  flex: '1 1 auto',
                  minWidth: 0,
                  overflowWrap: 'break-word',
                }}
              >
                {memberFullName(s)}
                {s.jerseyNumber != null && (
                  <span style={{ ...mono, fontSize: 10, color: LRH.mute, marginLeft: 6 }}>
                    #{s.jerseyNumber}
                  </span>
                )}
              </span>

              <span
                style={{
                  ...mono,
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: LRH.mute,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  flex: '0 0 auto',
                }}
              >
                {s.club.shortCode ?? s.club.name}
              </span>

              <span
                style={{
                  ...display,
                  fontSize: 13,
                  fontWeight: 800,
                  padding: '3px 9px',
                  minWidth: 34,
                  textAlign: 'center',
                  flex: '0 0 auto',
                  background: isLeader ? LRH.gold : LRH.navy,
                  color: isLeader ? LRH.navy : '#fff',
                  letterSpacing: '-0.02em',
                }}
              >
                {s.goalsScored}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
