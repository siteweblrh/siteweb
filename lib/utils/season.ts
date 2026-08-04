/**
 * Saison sportive — source unique du libellé affiché dans le header et les
 * bandeaux de page.
 *
 * Pourquoi ce module existe (constaté en prod le 2026-08-04) : la valeur était
 * écrite en dur (« 2025–2026 ») dans 5 composants, pendant que le hero
 * d'accueil, `/classements` et `/jeunes` la résolvaient depuis la base via
 * `getAllSeasons()[0]`. La base contenait déjà une saison 2026-2027 créée mais
 * sans aucun match : le header annonçait 2025-2026 et le hero 2026-2027, sur
 * la même page.
 *
 * Deux notions distinctes, à ne pas confondre :
 *
 * - **la saison sportive courante** — un fait de calendrier, sans lecture base.
 *   C'est ce que rend `currentSeason()`, consommé par le header et les tags de
 *   page. Aucun coût Neon, aucune prop à faire descendre dans les 18 clients de
 *   page qui montent le Header.
 * - **la saison affichée par un écran de données** — un fait de base : la plus
 *   récente qui contient réellement des matchs. C'est
 *   `getDefaultStandingsSeason()` dans lib/queries/competition.ts. Un écran de
 *   classement doit montrer des lignes, pas une saison vide créée d'avance.
 *
 * Les deux peuvent diverger entre le 1er septembre et le premier match de la
 * nouvelle saison. C'est assumé : `/classements` affiche alors la dernière
 * saison jouée, explicitement étiquetée par son propre sélecteur de saison.
 *
 * Module volontairement SANS import serveur : il est consommé par des
 * composants `'use client'`.
 */

import { reunionDayKey } from './datetime-reunion';

/**
 * Mois de bascule vers la nouvelle saison, en numérotation humaine (1 = janvier).
 * Septembre : « la saison gazon court de septembre à juin » (texte affiché sur
 * /licence). Avant septembre, on est encore sur la saison qui vient de finir.
 */
const SEASON_START_MONTH = 9;

/**
 * Saison sportive courante au format base (`"2025-2026"`).
 *
 * Calculée en fuseau Réunion, pas dans la TZ du runtime : le serveur Vercel est
 * en UTC et bascule donc 4 h trop tôt le 1er septembre.
 */
export function currentSeason(now: Date = new Date()): string {
  const [year, month] = reunionDayKey(now).split('-').map(Number);
  return month >= SEASON_START_MONTH
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
}

/** `"2025-2026"` → `"2025–2026"` (en-dash typographique). */
export function formatSeasonLabel(season: string | null | undefined): string | null {
  if (!season) return null;
  return season.replace(/-/g, '–');
}

/** `"2025-2026"` → `"'25–'26"`. */
export function formatSeasonLabelShort(season: string | null | undefined): string {
  if (!season) return '';
  const parts = season.split('-');
  if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
    return `'${parts[0].slice(-2)}–'${parts[1].slice(-2)}`;
  }
  return season.replace(/-/g, '–');
}

/** Libellé prêt à afficher pour la saison courante : `"2025–2026"`. */
export function currentSeasonLabel(now?: Date): string {
  return formatSeasonLabel(currentSeason(now)) ?? '';
}

/** Libellé court prêt à afficher pour la saison courante : `"'25–'26"`. */
export function currentSeasonLabelShort(now?: Date): string {
  return formatSeasonLabelShort(currentSeason(now));
}
