import type React from 'react';
import { LRH, body } from '@/components/lrh/tokens';

/**
 * Styles de boutons de l'écran Saisons, factorisés parce qu'ils étaient
 * identiques dans SeasonsAdmin et SeasonCard — et qu'une cible tactile qui
 * dérive d'un fichier à l'autre est précisément ce qu'on ne veut pas.
 *
 * `minHeight: 48` n'est pas décoratif : c'est la cible tactile minimale du
 * projet. Ne pas la réduire pour gagner de la place — sur mobile, un bouton
 * de 36 px se rate une fois sur trois.
 */
const BASE: React.CSSProperties = {
  ...body,
  fontSize: 12,
  fontWeight: 700,
  minHeight: 48,
  padding: '0 16px',
  borderRadius: 4,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

export const btnPrimary: React.CSSProperties = {
  ...BASE,
  padding: '0 18px',
  background: LRH.navy,
  color: '#fff',
  border: 'none',
};

export const btnGhost: React.CSSProperties = {
  ...BASE,
  background: 'transparent',
  color: LRH.ink2,
  border: '1px solid ' + LRH.hairStrong,
};

export const btnDanger: React.CSSProperties = {
  ...BASE,
  background: 'transparent',
  color: LRH.red,
  border: '1px solid ' + LRH.red,
};

/** Bouton neutralisé : gris, curseur explicite, opacité conservée lisible. */
export const btnDisabled: React.CSSProperties = {
  ...BASE,
  background: 'transparent',
  color: LRH.mute,
  border: '1px solid ' + LRH.hairStrong,
  cursor: 'not-allowed',
};

/** Espacement entre actions — l'écart compte autant que la taille de cible. */
export const ACTION_GAP = 24;
