/**
 * Palette étendue pour les affiches sociales LRH.
 *
 * Hérite les couleurs de `lib/seo/og.tsx` (OG_COLORS) et ajoute des variantes
 * sport-specific : overlays, ombres profondes, gradients de mode.
 *
 * Les couleurs de base RESTENT la charte officielle :
 *   - navy #002244, gold #F3BC1C, red #A8202F
 */

import { OG_COLORS } from '@/lib/seo/og';

export const SOCIAL_COLORS = {
  ...OG_COLORS,
  navyDarker: '#001120',
  // Gold "live" plus saturé pour les scores et accents critiques (≠ gold logo).
  goldHot: '#FFC83D',
  // Overlay noir pour textures (à composer sur l'image de fond).
  inkOverlay50: 'rgba(0, 8, 20, 0.50)',
  inkOverlay70: 'rgba(0, 8, 20, 0.70)',
  inkOverlay85: 'rgba(0, 8, 20, 0.85)',
  // Halo radial centré (utilisé derrière les logos clubs pour les "faire décoller").
  haloGold: 'radial-gradient(ellipse at center, rgba(243,188,28,0.35), transparent 60%)',
  haloRed: 'radial-gradient(ellipse at center, rgba(168,32,47,0.32), transparent 60%)',
  // Stripes diagonales LRH (plus visible que la version OG SEO).
  stripesStrong:
    'repeating-linear-gradient(112deg, rgba(255,255,255,0.05) 0 22px, transparent 22px 44px)',
} as const;

/**
 * Couleur d'accent selon le mode de la compétition.
 * - Gazon : vert profond (rappel du terrain)
 * - Salle : ambre terre cuite (rappel du parquet)
 *
 * Aligné avec MODE_COLOR de `components/lrh/tokens.tsx` mais dupliqué ici
 * pour éviter d'importer tokens.tsx (qui contient des composants React
 * incompatibles avec Satori).
 */
export function modeAccent(mode: 'GAZON' | 'SALLE') {
  return mode === 'GAZON'
    ? { bg: '#1d6b3f', fg: '#fff', label: 'GAZON' }
    : { bg: '#C9531A', fg: '#fff', label: 'SALLE' };
}

/**
 * Chemin de la texture de fond selon le mode. Servies depuis `/public/social/textures/`.
 * Si une texture spécifique au mode n'est pas trouvée, fallback sur beton-grunge.
 */
export function modeBackgroundTexture(mode: 'GAZON' | 'SALLE'): string {
  return mode === 'GAZON' ? '/social/textures/gazon-synthetique.png' : '/social/textures/parquet.png';
}
