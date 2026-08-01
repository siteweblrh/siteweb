// Tableau à élimination directe (coupes). Fonctions pures, sans I/O.
//
// Pourquoi séparé de roundRobin.ts : une coupe et un championnat ne comptent
// pas leurs matchs de la même façon, et c'est cette confusion qui faisait
// annoncer « 6 affiches » au panneau pour une coupe à 4 équipes.
//
//   championnat 4 équipes aller simple  →  N(N-1)/2 = 6 matchs
//   coupe 4 équipes avec 3e place       →  2 demies + finale + 3e place = 4
//
// Seul le PREMIER TOUR est tirable à l'avance : les tours suivants dépendent
// des vainqueurs. Le calendrier réserve leurs créneaux, la saisie vient après.

import type { Pair } from './roundRobin';

/**
 * Nombre total de matchs d'un tableau à élimination directe.
 * N-1 pour désigner un vainqueur, +1 si l'on joue la petite finale.
 */
export function expectedCupMatchCount(teamCount: number, includeThirdPlace: boolean): number {
  if (teamCount < 2) return 0;
  return teamCount - 1 + (includeThirdPlace && teamCount >= 4 ? 1 : 0);
}

/** Nombre de matchs du premier tour — les seuls que le tirage peut poser. */
export function firstRoundMatchCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return Math.floor(teamCount / 2);
}

/** Le tableau est-il équilibré (puissance de 2) ? Sinon il faudrait des exempts. */
export function isBalancedBracket(teamCount: number): boolean {
  return teamCount >= 2 && (teamCount & (teamCount - 1)) === 0;
}

/**
 * Nombre de matchs par journée d'une coupe, du premier tour à la finale.
 * La petite finale se joue le même jour que la finale.
 *
 *   4 équipes avec 3e place  →  [2, 2]   (2 demies, puis finale + 3e place)
 *   8 équipes avec 3e place  →  [4, 2, 2]
 *
 * Sert à l'ajustement automatique du calendrier : c'est la structure de dates
 * qu'une coupe réclame.
 */
export function cupLayout(teamCount: number, includeThirdPlace: boolean): number[] {
  if (!isBalancedBracket(teamCount)) return [];
  const rounds: number[] = [];
  for (let n = teamCount; n >= 2; n = n / 2) rounds.push(n / 2);
  if (includeThirdPlace && teamCount >= 4) rounds[rounds.length - 1] += 1;
  return rounds;
}

/**
 * Tire au sort les affiches du premier tour : mélange puis apparie deux à deux.
 *
 * C'est un vrai tirage, pas un placement par têtes de série — la ligue veut
 * pouvoir le faire devant les clubs. Déterministe à graine égale, donc
 * reproductible et vérifiable.
 */
export function drawFirstRound(teamIds: string[], seed?: number): Pair[] {
  if (teamIds.length < 2) return [];
  const order = seed != null ? seededShuffle(teamIds, seed) : [...teamIds];
  const pairs: Pair[] = [];
  for (let i = 0; i + 1 < order.length; i += 2) {
    pairs.push({ home: order[i], away: order[i + 1] });
  }
  return pairs;
}

// Même PRNG que roundRobin.ts / distribute.ts : mulberry32, déterministe.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed >>> 0;
  const rand = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
