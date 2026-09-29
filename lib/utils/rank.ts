/**
 * Rangs partagés à égalité (« classement olympique ») : 1, 2, 2, 4.
 *
 * Pourquoi : les classements individuels (buteurs, jeunes arbitres) étaient
 * numérotés par position — 1, 2, 3, 4 — alors que la ligue classe ex aequo deux
 * joueurs au même total (feuille « Classements de la journée » du rassemblement
 * du 26/09/2026). Le départage d'affichage (matchs joués, nom) reste celui de
 * la query : il fixe l'ORDRE des lignes, pas leur rang.
 *
 * `values` doit déjà être trié par ordre décroissant ; le rang d'une ligne est
 * la position de la première ligne portant la même valeur.
 *
 * Fichier neutre (aucun import Prisma) : consommé par des composants client.
 */
export function sharedRanks(values: readonly number[]): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < values.length; i++) {
    ranks.push(i > 0 && values[i] === values[i - 1] ? ranks[i - 1] : i + 1);
  }
  return ranks;
}
