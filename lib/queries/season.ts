import { prisma } from '@/lib/prisma';

/**
 * Lectures publiques de l'entité `Season` — phase 2 de la migration
 * (cf. project_saison_entite_migration).
 *
 * Ces fonctions remplacent progressivement les contournements de la phase 0 :
 * la constante « bascule au 1er septembre » de `lib/utils/season.ts` et la clé
 * SiteContent `season.current`. La saison affichée devient une **donnée**
 * pilotée par l'admin depuis /dashboard/ligue/saisons, plus une règle déduite.
 */

/**
 * Saison que le site public présente par défaut : celle marquée `EN_COURS`.
 *
 * Repli si aucune n'est ouverte (cas transitoire, entre une clôture et
 * l'ouverture de la suivante) : la plus récente ayant produit un résultat —
 * mieux vaut un écran plein d'une saison passée qu'un écran vide. Puis, à
 * défaut, la plus récente déclarée.
 *
 * Renvoie `null` si la base ne contient aucune saison.
 */
export async function getActiveSeasonLabel(): Promise<string | null> {
  const current = await prisma.season.findFirst({
    where: { status: 'EN_COURS' },
    select: { label: true },
  });
  if (current) return current.label;

  const withResults = await prisma.season.findFirst({
    where: { competitions: { some: { matches: { some: { status: 'FINISHED' } } } } },
    orderBy: { startsAt: 'desc' },
    select: { label: true },
  });
  if (withResults) return withResults.label;

  const latest = await prisma.season.findFirst({
    orderBy: { startsAt: 'desc' },
    select: { label: true },
  });
  return latest?.label ?? null;
}

/**
 * Saisons proposées au visiteur, de la plus récente à la plus ancienne.
 *
 * Filtrées sur celles qui ont au moins une compétition **habitée** : proposer
 * une saison qui n'affichera rien serait le pendant du défaut corrigé sur les
 * chips de compétition (cf. INHABITED_COMPETITION dans queries/competition.ts).
 *
 * Tri par `startsAt` — une vraie date, plus le tri lexicographique de chaîne
 * qui ne fonctionnait que par chance.
 */
export async function getPublicSeasonLabels(): Promise<string[]> {
  const rows = await prisma.season.findMany({
    where: {
      competitions: {
        some: { OR: [{ matches: { some: {} } }, { entries: { some: {} } }] },
      },
    },
    orderBy: { startsAt: 'desc' },
    select: { label: true },
  });
  return rows.map((r) => r.label);
}
