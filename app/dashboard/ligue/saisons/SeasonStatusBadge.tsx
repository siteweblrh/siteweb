'use client';

import React from 'react';
import { LRH, mono } from '@/components/lrh/tokens';

export type SeasonStatus = 'PREPARATION' | 'EN_COURS' | 'TERMINEE';

/**
 * Source unique du rendu d'un statut de saison : libellé, couleur, et surtout
 * la phrase qui explique ce que le statut IMPLIQUE pour le site public.
 *
 * Accessibilité : le statut n'est jamais porté par la seule couleur. Chaque
 * pastille affiche son libellé en toutes lettres, et le marqueur géométrique
 * (● ▸ ■) distingue les trois états même en niveaux de gris ou en cas de
 * daltonisme.
 */
export const SEASON_STATUS: Record<
  SeasonStatus,
  { label: string; mark: string; fg: string; bg: string; border: string; help: string }
> = {
  EN_COURS: {
    label: 'En cours',
    mark: '●',
    fg: '#14532d',
    bg: '#dcfce7',
    border: '#86efac',
    help: 'Affichée par défaut sur tout le site public.',
  },
  PREPARATION: {
    label: 'En préparation',
    mark: '▸',
    fg: LRH.navy,
    bg: '#e8eef6',
    border: '#b9cbe2',
    help: 'Visible ici seulement. Le public ne la voit pas par défaut.',
  },
  TERMINEE: {
    label: 'Terminée',
    mark: '■',
    fg: LRH.mute,
    bg: '#f1f2f4',
    border: LRH.hairStrong,
    help: 'Archivée. Reste consultable via le sélecteur de saison.',
  },
};

export function SeasonStatusBadge({ status }: { status: SeasonStatus }) {
  const s = SEASON_STATUS[status];
  return (
    <span
      style={{
        ...mono,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: s.fg,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 3,
        padding: '4px 9px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{s.mark}</span>
      {s.label}
    </span>
  );
}
