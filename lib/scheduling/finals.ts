// Calcule les paires de la phase finale à partir du classement actuel
// d'une compétition en format CHAMPIONSHIP_PLAYOFFS.
//
// Règle : top 1 vs top 2 (FINAL), top 3 vs top 4 (THIRD_PLACE).
// L'équipe la mieux classée joue à domicile.

export type StandingRow = {
  clubId: string;
  rank: number;
};

export type FinalsPairings = {
  final: { homeClubId: string; awayClubId: string };
  thirdPlace: { homeClubId: string; awayClubId: string };
};

/**
 * Retourne les paires FINAL et THIRD_PLACE à partir du classement.
 * Retourne null si le classement contient moins de 4 équipes (pas de
 * phase finale possible).
 */
export function computeFinalsPairings(standings: StandingRow[]): FinalsPairings | null {
  if (standings.length < 4) return null;

  const sorted = [...standings].sort((a, b) => a.rank - b.rank);
  const [p1, p2, p3, p4] = sorted;

  return {
    final: { homeClubId: p1.clubId, awayClubId: p2.clubId },
    thirdPlace: { homeClubId: p3.clubId, awayClubId: p4.clubId },
  };
}
