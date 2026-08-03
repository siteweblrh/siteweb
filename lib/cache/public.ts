import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Cache de données des pages publiques — le rempart entre le trafic et Neon.
 *
 * POURQUOI CE MODULE EXISTE (incident du 2026-08-03, cf. règle n°2 du CLAUDE.md)
 * -----------------------------------------------------------------------------
 * Neon facture le TEMPS D'ÉVEIL du compute, pas les requêtes. Le endpoint
 * s'endort après 5 min de silence ; n'importe quelle requête isolée relance le
 * minuteur. Relevé du 2026-08-03 : 11,82 CU-h sur 53 h, soit 88 % du temps
 * éveillé, pour un quota mensuel de 100 CU-h.
 *
 * La cause n'était pas le volume mais le fait que `/classements`, `/actualites`
 * et `/jeunes` lisent `searchParams` : cela les rend DYNAMIQUES, donc leur
 * `revalidate` de segment est ignoré et Prisma repart à chaque visite — y
 * compris pour chaque passage de robot d'indexation, 24 h/24.
 *
 * L'objectif n'est donc PAS « rendre les pages statiques » (on perdrait les
 * query params et les URLs indexées), mais « qu'un rendu dynamique ne touche
 * plus Neon ». Une page peut rester dynamique gratuitement si ses données
 * viennent du cache de données de Next. C'est ce que fait ce module.
 *
 * FRAÎCHEUR — pourquoi des tags et pas seulement une durée
 * -------------------------------------------------------
 * Les 116 `revalidatePath` de `lib/actions/` invalident le cache de PAGES ;
 * ils ne touchent pas le cache de DONNÉES créé ici. Sans tags, une correction
 * de score mettrait jusqu'à `revalidate` secondes à s'afficher — une
 * régression fonctionnelle. Chaque action doit donc appeler `revalidatePublic`
 * avec les tags concernés, en plus de ses `revalidatePath`.
 *
 * API : `unstable_cache` est marquée « replaced by `use cache` » dans la doc de
 * Next 16 (`03-api-reference/04-functions/unstable_cache.md`). On ne migre pas :
 * `use cache` suppose `cacheComponents: true`, c'est-à-dire le PPR sur
 * l'ensemble du site — trop risqué pour un site en production (règle n°1).
 * `unstable_cache` reste fonctionnel en 16. À revoir si Next la retire.
 */

export const CACHE_TAGS = {
  /** Compétitions, classements, matchs, buteurs, brackets. */
  competitions: "public-competitions",
  /** Articles publiés. */
  news: "public-news",
  /** Clubs, terrains, membres du bureau. */
  clubs: "public-clubs",
  /** Textes éditables (SiteContent). */
  siteContent: "public-site-content",
  /** Créneaux d'entraînement et catégories. */
  training: "public-training",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Durée par défaut : 1 h. C'est un filet, pas le mécanisme de fraîcheur —
 * celui-ci passe par les tags. Une valeur longue est donc sans danger et c'est
 * exactement ce qu'on veut : plus la fenêtre est large, plus la base dort.
 */
export const PUBLIC_CACHE_TTL = 3600;

/**
 * Enveloppe une lecture Prisma dans le cache de données de Next.
 *
 * Les arguments de la fonction entrent automatiquement dans la clé de cache —
 * inutile de les répéter dans `keyParts`, mais IL FAUT que la fonction soit
 * pure vis-à-vis d'eux (pas de lecture de `headers()`/`cookies()` à
 * l'intérieur : `unstable_cache` l'interdit).
 *
 * @param keyParts Identifiant stable de l'appelant. Deux enveloppes distinctes
 *                 ne doivent jamais partager la même clé.
 */
export function cachePublic<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  tags: CacheTag[],
  revalidate: number = PUBLIC_CACHE_TTL,
): (...args: Args) => Promise<Result> {
  return unstable_cache(fn, keyParts, { tags, revalidate });
}

/**
 * Invalide le cache de données des pages publiques.
 *
 * À appeler dans TOUTE action `lib/actions/*` qui modifie des données
 * affichées publiquement, EN PLUS des `revalidatePath` existants — les deux
 * caches sont distincts et `revalidatePath` seul laisserait les données en
 * place jusqu'à expiration du TTL.
 *
 * Ce n'est pas une fonction `'use server'` : elle est appelée DEPUIS des
 * actions, jamais depuis un client (cf. la règle « n'exporter que des fonctions
 * async depuis un fichier 'use server' » — celui-ci n'en est pas un).
 */
export function revalidatePublic(...tags: CacheTag[]): void {
  // `{ expire: 0 }` et non le profil `'max'` que recommande la doc de Next 16.
  // `'max'` applique du stale-while-revalidate : la première requête après
  // l'invalidation reçoit encore l'ANCIENNE donnée pendant que la nouvelle se
  // calcule en arrière-plan. Concrètement, un admin qui saisit un score et va
  // vérifier la page publique verrait l'ancien — une régression fonctionnelle,
  // et le rafraîchissement de fond réveille Neon de toute façon. `expire: 0`
  // purge l'entrée : le prochain rendu relit la base et affiche le bon score.
  //
  // La signature à un argument est dépréciée en Next 16 (revalidateTag.md).
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}
