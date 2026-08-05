import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CACHE_TAGS, cachePublic } from '@/lib/cache/public';

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
 * Version cachée, destinée au **layout racine** — donc à 100 % des pages,
 * dashboard compris (règle n°2).
 *
 * Sans ce cache, la lecture partirait en base à chaque rendu de page dynamique.
 * Avec : une fenêtre d'1 h, invalidée par le tag `competitions` — que
 * `lib/actions/season.ts` déclenche déjà à chaque ouverture ou clôture de
 * saison. Le changement est donc immédiat malgré le cache.
 */
export const getActiveSeasonLabelCached = cachePublic(
  getActiveSeasonLabel,
  ['season:active-label'],
  [CACHE_TAGS.competitions],
);

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

/**
 * Saisons **déclarées** : celles qui portent au moins une compétition, sans
 * exiger qu'elle soit habitée.
 *
 * Pourquoi cette variante existe à côté de `getPublicSeasonLabels` — c'est la
 * même nuance que pour `getYouthCompetitionsWithStandings` : `/jeunes` a pour
 * fonction d'**annoncer** aux parents les championnats à venir. Une saison dont
 * les 4 compétitions jeunes sont déclarées mais n'ont ni match ni équipe
 * inscrite est précisément ce que cet écran doit montrer ; la filtrer le
 * viderait.
 *
 * Reprend exactement le périmètre de l'ancienne `getAllSeasons()` (distinct sur
 * `Competition.season`), mais **triée par `startsAt`** — une vraie date, au lieu
 * du tri lexicographique de chaîne qui ne tenait que par la grâce du format
 * `AAAA-AAAA`.
 */
export async function getDeclaredSeasonLabels(): Promise<string[]> {
  const rows = await prisma.season.findMany({
    where: { competitions: { some: {} } },
    orderBy: { startsAt: 'desc' },
    select: { label: true },
  });
  return rows.map((r) => r.label);
}

/**
 * Une saison est utilisable par un écran de classement si elle a un résultat.
 *
 * Typé explicitement plutôt qu'en `as const` : l'objet deviendrait readonly et
 * l'inférence générique de Prisma décroche, le `select` est ignoré et le type
 * de retour retombe sur le modèle complet (piège rencontré le 2026-08-04 sur
 * INHABITED_COMPETITION, cf. lib/queries/competition.ts).
 */
const HAS_RESULT: Prisma.SeasonWhereInput = {
  competitions: { some: { matches: { some: { status: 'FINISHED' } } } },
};

/**
 * Saison affichée **par défaut** sur `/classements`, par ordre de priorité :
 *
 *   1. `season.current` — forçage explicite depuis /dashboard/ligue/contenu ;
 *   2. la saison `EN_COURS` de l'entité Season ;
 *   3. la plus récente ayant produit un résultat ;
 *   4. la plus récente déclarée — et c'est l'état vide qui parle.
 *
 * Même ordre que le header (app/layout.tsx), à une condition près : les niveaux
 * 1 et 2 ne sont retenus **que si la saison a déjà un match `FINISHED`**.
 *
 * ⚠️ Ce garde-fou n'est pas une précaution théorique, c'est un correctif de
 * production du 2026-08-04 : une saison est créée en base dès que l'admin
 * déclare ses compétitions, donc des mois avant le premier résultat, et la page
 * atterrissait sur « Aucun classement disponible ». Deux critères plus laxistes
 * ont été essayés et écartés le même jour — « la plus récente déclarée » puis
 * « la plus récente qui a des matchs » : au 2026-08-04 la saison 2026-2027
 * comptait 18 matchs tous `SCHEDULED` et 11 lignes `Standing` à zéro. Avoir des
 * rencontres au calendrier et avoir un classement sont deux choses différentes.
 * **Le seul signal fiable est un match terminé.**
 *
 * Le visiteur garde accès à la saison en cours par le sélecteur ; seul le défaut
 * change, et il bascule tout seul au premier match passé en FINISHED.
 *
 * ⚠️ Ne PAS réutiliser tel quel pour `/jeunes` : cf. app/jeunes/page.tsx.
 *
 * Renvoie `null` si la base ne contient aucune saison.
 */
export async function getDefaultStandingsSeasonLabel(
  /** Forçage admin (`season.current`), texte libre — donc validé ici. */
  preferred?: string | null,
): Promise<string | null> {
  if (preferred?.trim()) {
    const forced = await prisma.season.findFirst({
      where: { label: preferred.trim(), ...HAS_RESULT },
      select: { label: true },
    });
    if (forced) return forced.label;
  }

  const current = await prisma.season.findFirst({
    where: { status: 'EN_COURS', ...HAS_RESULT },
    select: { label: true },
  });
  if (current) return current.label;

  const withResults = await prisma.season.findFirst({
    where: HAS_RESULT,
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
