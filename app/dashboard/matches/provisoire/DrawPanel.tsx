'use client';

// Panneau de tirage au sort d'un calendrier provisoire.
//
// Rôle : rendre lisible, pour quelqu'un qui ne connaît pas la théorie des
// round-robins, l'écart entre « ce qu'il y a à jouer » et « ce qui est
// configuré ». L'admin lit un compte, corrige sa configuration, puis lance le
// tirage. Aucun calcul mental n'est demandé.
//
// Ce fichier n'est que la coquille : une section et la liste des compétitions.
// Le détail vit dans ./draw — une responsabilité par fichier.

import React from 'react';
import { LRH, mono } from '@/components/lrh/tokens';
import { CompetitionRow } from './draw/CompetitionRow';
import {
  type DrawPanelSlot,
  type DrawPanelClub,
  type DrawPanelCompetition,
} from './draw/types';

export type { DrawPanelSlot, DrawPanelClub, DrawPanelCompetition };

export function DrawPanel({
  calendarId,
  competitions,
  slots,
  clubs,
  teamCountByCompetition,
}: {
  calendarId: string;
  competitions: DrawPanelCompetition[];
  slots: DrawPanelSlot[];
  clubs: DrawPanelClub[];
  /** Nombre d'équipes inscrites, par compétition. */
  teamCountByCompetition: Record<string, number>;
}) {
  if (competitions.length === 0) return null;

  return (
    <section
      aria-label="Tirage au sort"
      style={{ border: `1px dashed ${LRH.hairStrong}`, padding: 16, marginTop: 16 }}
    >
      <h3
        style={{
          ...mono, fontSize: 10, fontWeight: 700, color: LRH.red,
          letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 12px',
        }}
      >
        Tirage au sort
      </h3>

      <div style={{ display: 'grid', gap: 12 }}>
        {competitions.map((c) => (
          <CompetitionRow
            key={c.competitionId}
            calendarId={calendarId}
            competition={c}
            slots={slots.filter((s) => s.competitionId === c.competitionId)}
            clubs={clubs}
            teamCount={teamCountByCompetition[c.competitionId] ?? 0}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Progression en quatre étapes. Ce n'est pas décoratif : c'est ce qui répond
 * à « je ne sais pas où cliquer ni dans quel ordre ». L'étape courante est
 * mise en avant, les autres restent lisibles.
 */
