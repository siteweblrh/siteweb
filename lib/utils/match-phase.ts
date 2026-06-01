/**
 * Source unique de la règle « quelles phases de match sont valides pour quel
 * format de compétition ». Client-safe (aucun import prisma) → utilisable à la
 * fois dans le form admin (filtrage du select) et dans les actions serveur
 * (garde-fou avant écriture).
 *
 * Pourquoi cette règle existe : un championnat PUR (format CHAMPIONSHIP) n'a
 * pas de phase finale. Si on saisit un match en phase d'élimination (FINAL,
 * SEMI, …) sur un tel championnat, il devient invisible partout :
 *   - le classement (updateStandings) ne compte que les matchs phase=REGULAR ;
 *   - le panneau « Phase finale » / bracket n'est rendu que pour les formats
 *     CUP et CHAMPIONSHIP_PLAYOFFS (cf. app/dashboard/standings/page.tsx).
 * Résultat : le résultat est saisi mais n'apparaît ni dans le classement ni
 * dans un bracket. On bloque donc cette combinaison à la source.
 */

export type MatchPhase =
  | 'REGULAR'
  | 'R32'
  | 'R16'
  | 'QUARTER'
  | 'SEMI'
  | 'THIRD_PLACE'
  | 'FINAL';

export const ALL_PHASES: MatchPhase[] = [
  'REGULAR',
  'R32',
  'R16',
  'QUARTER',
  'SEMI',
  'THIRD_PLACE',
  'FINAL',
];

/**
 * Phases autorisées pour un format donné.
 * - CHAMPIONSHIP : uniquement REGULAR (pas de phase finale).
 * - CHAMPIONSHIP_PLAYOFFS / CUP : toutes les phases.
 * - format inconnu / non fourni : permissif (toutes), pour ne pas casser
 *   d'éventuels appels legacy.
 */
export function allowedPhasesForFormat(format?: string | null): MatchPhase[] {
  return format === 'CHAMPIONSHIP' ? ['REGULAR'] : ALL_PHASES;
}

export function isPhaseAllowedForFormat(phase: MatchPhase, format?: string | null): boolean {
  return allowedPhasesForFormat(format).includes(phase);
}
