import { revalidatePath } from "next/cache";
import { CACHE_TAGS, revalidatePublic } from "@/lib/cache/public";

/**
 * Pages à rafraîchir après un changement de match (score, buts, cartons).
 *
 * Extrait de lib/actions/competition.ts pour être partagé avec la saisie rapide
 * de journée (lib/actions/matchsheet.ts) : un fichier 'use server' ne peut
 * exporter que des fonctions async, et dupliquer cette liste, c'est la
 * garantie qu'une des deux copies oublie un jour une page (cf. `/m`).
 */
export function revalidateMatchPages() {
  // Cache de DONNÉES d'abord — `/classements` et `/jeunes` sont des pages
  // dynamiques (searchParams), leurs données viennent de `cachePublic` et
  // aucun `revalidatePath` ne les atteint. Cf. lib/cache/public.ts.
  revalidatePublic(CACHE_TAGS.competitions);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/matches");
  revalidatePath("/dashboard/matches/calendar");
  revalidatePath("/dashboard/standings");
  revalidatePath("/dashboard/competitions");
  revalidatePath("/competitions");
  revalidatePath("/classements");
  revalidatePath("/");
  // `/m` est la variante MOBILE de la home (rewrite UA dans proxy.ts). C'est une
  // route distincte : sans cette ligne elle ne se rafraîchit QUE sur son ISR de
  // 1 h, donc un visiteur mobile voyait un classement périmé pendant que le
  // desktop était à jour. Écart invisible en développement, où l'on regarde la
  // home en desktop.
  revalidatePath("/m");
  // Pages dynamiques : un changement de match touche AUSSI la fiche club
  // (/clubs/[slug] affiche le calendrier du club) et la page match elle-même
  // (/match/[id]). La syntaxe ('/path/[param]', 'page') invalide toutes
  // les variantes dynamiques de cette page en un appel — pas besoin de
  // connaître les slugs/ids exacts.
  revalidatePath("/clubs/[slug]", "page");
  revalidatePath("/match/[id]", "page");
}
