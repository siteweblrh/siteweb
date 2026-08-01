// Correspondance état → apparence. Isolée pour rester la référence unique :
// la couleur ne porte JAMAIS le sens seule, elle est toujours doublée d'un
// symbole et d'un libellé (accessibilité, daltonisme, impression N&B).

import { LRH } from '@/components/lrh/tokens';
import { type CoverageStatus } from '@/lib/scheduling/coverage';

export type Tone = { color: string; bg: string; mark: string; label: string };

/** Couleur d'état — jamais seule porteuse du sens, toujours doublée d'un texte. */
export const TONE: Record<CoverageStatus, { color: string; bg: string; mark: string; label: string }> = {
  'no-teams':      { color: LRH.red,  bg: '#FDF2F3', mark: '!', label: 'Équipes manquantes' },
  'no-slots':      { color: LRH.red,  bg: '#FDF2F3', mark: '!', label: 'Aucun créneau' },
  'missing-slots': { color: LRH.red,  bg: '#FDF2F3', mark: '!', label: 'Créneaux manquants' },
  'extra-slots':   { color: '#B45309', bg: '#FFFBEB', mark: '~', label: 'Créneaux en trop' },
  'partial':       { color: '#B45309', bg: '#FFFBEB', mark: '~', label: 'Tirage incomplet' },
  'unbalanced-bracket': { color: LRH.red, bg: '#FDF2F3', mark: '!', label: 'Effectif incompatible' },
  'not-drawn':     { color: LRH.navy, bg: '#F1F5F9', mark: '·', label: 'Prêt à tirer' },
  'ready':         { color: '#1d6b3f', bg: '#F0FDF4', mark: '✓', label: 'Tirage complet' },
};

