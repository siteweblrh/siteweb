/**
 * Comparaison de libellés de terrains, pour détecter un doublon avant
 * création. Client-safe (pas d'import prisma) et testable — c'est pourquoi ces
 * helpers vivent ici et non dans `lib/actions/venue.ts`, où la directive
 * `'use server'` interdit d'exporter autre chose que des fonctions async.
 *
 * Deux niveaux de normalisation, parce que les deux grappes de doublons
 * nettoyées en prod le 2026-09-18 n'avaient pas la même cause :
 *
 *   - `normalizeVenueLabel` (strict) : « Ravine à Malheur » ressaisi cinq fois
 *     à l'identique — seule l'adresse changeait d'un essai à l'autre, et une
 *     saisie portait la ville en minuscules. Casse et accents suffisent à les
 *     rapprocher.
 *   - `normalizeVenueLabelLoose` (souple) : « Stade Manès » et « Stade de
 *     Manès », cinq matchs répartis entre les deux lignes. Une particule
 *     d'écart, que le niveau strict ne voit pas.
 */

/** Minuscules, sans accents, ponctuation réduite à des espaces simples. */
export function normalizeVenueLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ') // ponctuation, apostrophes, tirets
    .trim();
}

/** Articles et particules : tout ce qui sépare « Manès » de « de Manès ». */
const LABEL_PARTICLES = new Set(['a', 'au', 'aux', 'd', 'de', 'des', 'du', 'l', 'la', 'le', 'les']);

export function normalizeVenueLabelLoose(value: string): string {
  return normalizeVenueLabel(value)
    .split(' ')
    .filter((word) => word.length > 0 && !LABEL_PARTICLES.has(word))
    .join(' ');
}

export type VenueSurfaces = { supportsGazon: boolean; supportsSalle: boolean };

/**
 * Deux terrains homonymes ne sont des doublons que s'ils partagent une
 * surface. La Possession a légitimement une ligne gazon ET une ligne salle
 * nommées « Ravine à Malheur » : bloquer sur le seul couple (nom, ville)
 * rendrait ce cas réel impossible à saisir.
 */
export function sharesSurface(a: VenueSurfaces, b: VenueSurfaces): boolean {
  return (a.supportsGazon && b.supportsGazon) || (a.supportsSalle && b.supportsSalle);
}
