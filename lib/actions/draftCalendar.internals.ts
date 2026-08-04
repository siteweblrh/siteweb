// Internes partagés par les actions du calendrier provisoire.
//
// Ce fichier n'est PAS 'use server' : une directive 'use server' interdit
// d'exporter autre chose que des fonctions async, or on partage ici un garde
// d'autorisation et des helpers d'invalidation. Les deux fichiers d'actions
// (draftCalendar.ts et draftDraw.ts) l'importent.

import { prisma } from '@/lib/prisma';
import { CACHE_TAGS, revalidatePublic } from '@/lib/cache/public';
import { revalidatePath } from 'next/cache';

// Re-export du garde partagé (lib/auth/require-admin.ts) : le chemin d'import
// reste stable pour draftCalendar.ts et draftDraw.ts, qui l'utilisent sur
// plusieurs sites — inutile de les toucher pour supprimer un doublon.
export { requireAdmin } from '@/lib/auth/require-admin';

export function revalidateDraft() {
  // /provisoire redirige vers /calendar?mode=brouillon : c'est cette dernière
  // qui rend réellement le calendrier. Sans elle, une action réussie ne se
  // voyait pas à l'écran.
  revalidatePath('/dashboard/matches/provisoire');
  revalidatePath('/dashboard/matches/calendar');
}

export function revalidateMatch() {
  // ⚠️ Homonyme de `revalidateMatch()` dans lib/actions/competition.ts — deux
  // fonctions distinctes dans deux fichiers. Toute règle appliquée à l'une
  // doit l'être à l'autre ; l'oubli de cette ligne-ci est passé inaperçu le
  // 2026-08-03 précisément à cause de ce nom partagé.
  //
  // Publier/dépublier une journée crée ou supprime de vrais matchs. Sans
  // l'invalidation du cache de DONNÉES, `/classements` et `/jeunes` — qui sont
  // dynamiques et servis par `cachePublic` — gardaient jusqu'à 1 h des matchs
  // obsolètes, alors même que les `revalidatePath` ci-dessous réussissaient.
  // Cf. lib/cache/public.ts.
  revalidatePublic(CACHE_TAGS.competitions);
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/matches');
  revalidatePath('/dashboard/matches/calendar');
  revalidatePath('/dashboard/standings');
  revalidatePath('/competitions');
  revalidatePath('/classements');
  revalidatePath('/');
  revalidatePath('/clubs/[slug]', 'page');
  revalidatePath('/match/[id]', 'page');
}
