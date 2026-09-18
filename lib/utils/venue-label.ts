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

export type VenueCandidate = VenueSurfaces & { name: string; city: string };
export type ExistingVenue = VenueCandidate & { id: string };

export type VenueDuplicate = {
  id: string;
  name: string;
  city: string;
  /** `true` = même libellé à la casse et aux accents près ; `false` = à une particule près. */
  exact: boolean;
};

/**
 * Cherche, parmi les terrains existants, celui qui ferait doublon avec
 * `candidate`. Rend `null` si la saisie est inédite.
 *
 * `ignoreId` exclut la ligne en cours de modification. Sans lui, corriger
 * l'adresse d'un terrain se verrait refusé au motif qu'il ressemble à
 * lui-même — le garde-fou rendrait la fiche impossible à éditer.
 *
 * Fonction pure : l'appelant fournit la liste. C'est ce qui la rend testable
 * sans base, et c'est aussi ce qui garantit que `createVenue` et
 * `updateVenue` appliquent exactement la même règle.
 */
export function findVenueDuplicate(
  candidate: VenueCandidate,
  existing: readonly ExistingVenue[],
  ignoreId?: string,
): VenueDuplicate | null {
  const sameCity = existing.filter(
    (v) =>
      v.id !== ignoreId &&
      normalizeVenueLabel(v.city) === normalizeVenueLabel(candidate.city) &&
      sharesSurface(candidate, v),
  );

  const exact = sameCity.find(
    (v) => normalizeVenueLabel(v.name) === normalizeVenueLabel(candidate.name),
  );
  if (exact) return { id: exact.id, name: exact.name, city: exact.city, exact: true };

  const near = sameCity.find(
    (v) => normalizeVenueLabelLoose(v.name) === normalizeVenueLabelLoose(candidate.name),
  );
  if (near) return { id: near.id, name: near.name, city: near.city, exact: false };

  return null;
}

/** Message affiché à l'admin. Vaut pour une création comme pour un renommage. */
export function venueDuplicateMessage(hit: VenueDuplicate): string {
  return hit.exact
    ? `« ${hit.name} » existe déjà à ${hit.city} pour cette surface. Utilisez cette ligne plutôt que d'en avoir deux — son adresse et ses notes restent modifiables.`
    : `Un terrain très proche existe déjà à ${hit.city} : « ${hit.name} ». Si c'est le même, utilisez-le. Si c'en est vraiment un autre, donnez-lui un nom qui les distingue.`;
}
