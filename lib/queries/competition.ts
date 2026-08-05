import { prisma } from "@/lib/prisma";
import { Prisma, type Mode } from "@prisma/client";

const matchCardSelect = {
  id: true,
  homeScore: true,
  awayScore: true,
  kickoffAt: true,
  venue: true,
  status: true,
  matchday: true,
  homeLabel: true,
  homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
  awayLabel: true,
  awayClub: { select: { id: true, slug: true, shortCode: true, name: true } },
  competition: { select: { id: true, name: true, slug: true, mode: true } },
  sponsor: { select: { name: true, logo: true } },
} as const;

export type MatchCard = Awaited<ReturnType<typeof getUpcomingMatches>>[number];

/** Filtre de saison réutilisable, appliqué via la relation `competition`. */
function seasonScope(mode: Mode, season?: string) {
  return { mode, ...(season ? { season } : {}) };
}

/**
 * Match mis en avant sur la home, par ordre de pertinence :
 *   1. une rencontre EN COURS (live/mi-temps) — rien ne prime dessus ;
 *   2. sinon la PROCHAINE à jouer ;
 *   3. sinon le dernier résultat, faute de futur à annoncer.
 *
 * ⚠️ Corrigé le 2026-08-04 sur signalement de l'user : « le hero n'affiche pas
 * la première journée de chaque discipline ». L'ordre précédent était
 * `[{ status: 'asc' }, { kickoffAt: 'desc' }]`. `status: 'asc'` trie sur
 * l'ordre de déclaration de l'enum, donc SCHEDULED d'abord — puis `desc`
 * retenait le match programmé **le plus lointain**. Le hero annonçait J6 du
 * 20 mars 2027 au lieu de J1 du 5 décembre 2026.
 *
 * La leçon générale : `orderBy` sur un enum trie sur l'ordre de déclaration,
 * pas sur une pertinence métier. Exprimer la préférence par des requêtes
 * successives est plus long mais lisible et vérifiable.
 */
export async function getFeaturedMatch(mode: Mode, season?: string) {
  const select = { ...matchCardSelect, goals: { orderBy: { minute: "asc" as const } } };
  const competition = seasonScope(mode, season);

  const live = await prisma.match.findFirst({
    where: { competition, status: { in: ["LIVE", "HALFTIME"] } },
    orderBy: { kickoffAt: "asc" },
    select,
  });
  if (live) return live;

  const next = await prisma.match.findFirst({
    where: {
      competition,
      status: "SCHEDULED",
      // Tolérance de 6 h : un match commencé mais pas encore passé en LIVE
      // reste « le match du moment » plutôt que de disparaître de la home.
      kickoffAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 6) },
    },
    orderBy: { kickoffAt: "asc" },
    select,
  });
  if (next) return next;

  return prisma.match.findFirst({
    where: { competition, status: "FINISHED" },
    orderBy: { kickoffAt: "desc" },
    select,
  });
}

export async function getLastFinishedMatch(mode: Mode, season?: string) {
  return prisma.match.findFirst({
    where: { competition: seasonScope(mode, season), status: "FINISHED" },
    orderBy: { kickoffAt: "desc" },
    select: {
      ...matchCardSelect,
      goals: {
        orderBy: { minute: "asc" },
        select: { minute: true, scoringClubId: true, scorerName: true },
      },
      homeLabel: true,
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      awayLabel: true,
      awayClub: { select: { id: true, slug: true, shortCode: true, name: true } },
    },
  });
}

export async function getStandingsTop(mode: Mode, limit = 3, season?: string) {
  // Scope à UNE seule compétition : le championnat principal du mode. Sans ça,
  // le findMany renvoie le top global de toutes les compétitions du mode
  // (championnat + coupe + saisons précédentes) → rangs dupliqués et
  // classements mélangés. Les coupes n'ont de toute façon pas de classement
  // (format CUP), mais on filtre explicitement.
  //
  // La saison est désormais passée explicitement. Le tri de repli
  // `season: 'desc'` est LEXICOGRAPHIQUE sur une chaîne — il ne fonctionnait
  // que par chance avec le format AAAA-AAAA, et ne survivrait pas à une saisie
  // « 2026-27 ». Il ne sert plus que si l'appelant omet la saison.
  const competition = await prisma.competition.findFirst({
    where: { ...seasonScope(mode, season), format: { not: "CUP" } },
    orderBy: { season: "desc" },
    select: { id: true },
  });
  if (!competition) return [];
  return prisma.standing.findMany({
    where: { competitionId: competition.id },
    orderBy: { rank: "asc" },
    take: limit,
    select: {
      rank: true,
      points: true,
      goalsFor: true,
      goalsAgainst: true,
      club: { select: { id: true, slug: true, shortCode: true, name: true } },
      competition: { select: { name: true } },
    },
  });
}

// `getStandings(mode)` a été SUPPRIMÉE ici le 2026-08-04. Elle n'avait ni
// scope de saison ni scope de compétition : elle renvoyait les classements de
// TOUTES les compétitions d'un mode et de TOUTES les saisons dans une seule
// liste triée par `rank`, donc avec des rangs dupliqués et des équipes de
// compétitions différentes mélangées. Aucun appelant — seul son type était
// réexporté, lui aussi sans consommateur. La laisser, c'était laisser une mine
// à quelqu'un qui l'aurait prise pour la requête de classement légitime.
// Les vraies sont `getStandingsTop` (home, scopée à une compétition) et
// `getCompetitionsWithStandings` (page /classements, scopée saison+mode).

export async function getUpcomingMatches(mode: Mode, limit = 4, season?: string) {
  return prisma.match.findMany({
    where: {
      competition: seasonScope(mode, season),
      status: { in: ["SCHEDULED", "LIVE", "HALFTIME"] },
      kickoffAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 6) },
    },
    orderBy: { kickoffAt: "asc" },
    take: limit,
    select: matchCardSelect,
  });
}

export async function getClubMatches(clubId: string, opts?: { upcomingLimit?: number; pastLimit?: number }) {
  const [upcoming, past] = await Promise.all([
    prisma.match.findMany({
      where: {
        OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
        status: { in: ["SCHEDULED", "LIVE", "HALFTIME"] },
      },
      orderBy: { kickoffAt: "asc" },
      take: opts?.upcomingLimit ?? 5,
      select: matchCardSelect,
    }),
    prisma.match.findMany({
      where: {
        OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
        status: "FINISHED",
      },
      orderBy: { kickoffAt: "desc" },
      take: opts?.pastLimit ?? 5,
      select: matchCardSelect,
    }),
  ]);
  return { upcoming, past };
}

export async function getAllMatchesForMode(mode: Mode) {
  // ⚠️ Pas de subquery `goals` ici : les consommateurs (CompetitionsPageClient,
  // ClassementsPageClient, JeunesPageClient, CalendarBoard) n'utilisent que
  // homeScore/awayScore agrégés et n'affichent jamais les buts individuels.
  // Les buts détaillés sont chargés à la demande sur /match/[id] (cf.
  // PublicMatch via getMatchById) et sur le LastResultCard de la home
  // (getLastFinishedMatch qui charge les goals).
  // Économie : 1 subquery par match évitée → ~100 matchs × 2 modes = ~200
  // sous-requêtes en moins par render de /competitions ou /classements.
  return prisma.match.findMany({
    where: { competition: { mode } },
    orderBy: { kickoffAt: "asc" },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      kickoffAt: true,
      venue: true,
      status: true,
      matchday: true,
      homeClubId: true,
      awayClubId: true,
      homeLabel: true,
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      awayLabel: true,
      awayClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      // `season` embarquée avec le match : elle permet à /competitions de
      // grouper et filtrer par saison SANS rendre la page dynamique. Un
      // `searchParams` aurait annulé le `revalidate` de segment et remis
      // chaque visite sur Neon (règle n°2, incident du 27 juillet).
      // Coût : une chaîne de 9 caractères par match.
      competition: { select: { id: true, slug: true, name: true, category: true, season: true } },
    },
  });
}

/**
 * Une compétition « habitée » : elle a au moins un match OU au moins une équipe
 * inscrite. Sert à écarter les coquilles vides des écrans publics de navigation.
 *
 * Pourquoi ce critère et pas « au moins un match » : une compétition dont les
 * équipes sont engagées mais dont le calendrier n'est pas encore tiré a un
 * contenu réel à annoncer (le championnat existe, voici les engagés). La
 * masquer serait une perte d'information. Une compétition sans match ET sans
 * équipe, elle, n'a strictement rien à montrer — la masquer ne cache rien.
 *
 * Relevé prod du 2026-08-04 : 11 compétitions sur 18 étaient dans ce cas (0
 * match, 0 équipe, 0 ligne de classement), toutes en 2026-2027, créées
 * d'avance. Elles produisaient 9 chips de filtre sur /competitions en Gazon
 * dont 6 ne menaient nulle part.
 *
 * ⚠️ Réservé aux écrans PUBLICS de navigation. Un écran d'admin doit continuer
 * à voir les compétitions vides — c'est précisément là qu'on va les remplir.
 */
// Typé explicitement en `Prisma.CompetitionWhereInput` : avec un `as const`,
// l'objet devient readonly et l'inférence générique de Prisma décroche — le
// `select` est ignoré et le type de retour retombe sur le modèle complet, ce
// qui casse tous les consommateurs. Le compilateur l'a signalé immédiatement.
const INHABITED_COMPETITION: Prisma.CompetitionWhereInput = {
  OR: [{ matches: { some: {} } }, { entries: { some: {} } }],
};

export async function getCompetitionsForMode(mode: Mode, season?: string) {
  return prisma.competition.findMany({
    where: { mode, ...(season ? { season } : {}), ...INHABITED_COMPETITION },
    orderBy: [{ season: "desc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, category: true, season: true, format: true },
  });
}

export async function getCompetitionsWithStandings(mode: Mode, season?: string) {
  return prisma.competition.findMany({
    where: { mode, ...(season ? { season } : {}), ...INHABITED_COMPETITION },
    orderBy: [{ season: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      season: true,
      format: true,
      standings: {
        orderBy: { rank: "asc" },
        select: {
          rank: true,
          played: true,
          wins: true,
          draws: true,
          losses: true,
          goalsFor: true,
          goalsAgainst: true,
          points: true,
          club: { select: { id: true, slug: true, shortCode: true, name: true } },
        },
      },
    },
  });
}

/**
 * Détection « catégorie jeune ». Sert à filtrer la page /jeunes sans hardcoder
 * la liste des catégories — toute nouvelle catégorie d'âge créée par l'admin
 * (U13, U21, etc.) sera automatiquement prise en compte.
 *
 * Règle : tout libellé qui commence par "U" suivi de chiffres (U9 à U23, etc.),
 * OU qui contient "junior" / "jeune" / "cadet" / "minime" / "benjamin" /
 * "poussin" (case-insensitive). Couvre la nomenclature FFH (U*) + les libellés
 * historiques. Volontairement permissif : faux positifs négligeables, on rate
 * jamais une vraie catégorie jeune.
 */
const YOUTH_HINTS = /\b(junior|jeune|cadet|minime|benjamin|poussin)/i;
export function isYouthCategory(category: string): boolean {
  if (/^U\d+/i.test(category.trim())) return true;
  if (YOUTH_HINTS.test(category)) return true;
  return false;
}

/**
 * Toutes les compétitions « jeunes » (toutes modes confondues), avec leur
 * standings. Utilisée par /jeunes pour afficher en live les classements de
 * chaque catégorie d'âge présente en DB. Si `season` est fourni, scope à
 * cette saison.
 *
 * ⚠️ N'applique VOLONTAIREMENT PAS `INHABITED_COMPETITION`, contrairement à
 * `getCompetitionsForMode` et `getCompetitionsWithStandings`. Vérifié sur les
 * données de prod le 2026-08-04 : les 4 compétitions jeunes de 2026-2027 sont
 * toutes à 0 match et 0 équipe. Filtrer ici viderait entièrement la page.
 *
 * Et ce serait une perte de sens, pas seulement d'affichage : `/jeunes`
 * s'adresse à des parents qui cherchent si le championnat de la catégorie de
 * leur enfant existe. « Classement à venir — les premières journées n'ont pas
 * encore été jouées » est exactement la réponse qu'ils attendent ; une page
 * vide ne leur apprend rien. Annoncer une compétition à venir est ici la
 * fonction de l'écran, pas un défaut.
 */
export async function getYouthCompetitionsWithStandings(season?: string) {
  const all = await prisma.competition.findMany({
    where: season ? { season } : undefined,
    orderBy: [{ season: "desc" }, { category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      season: true,
      mode: true,
      format: true,
      _count: { select: { entries: true } },
      standings: {
        orderBy: { rank: "asc" },
        select: {
          rank: true,
          played: true,
          wins: true,
          draws: true,
          losses: true,
          goalsFor: true,
          goalsAgainst: true,
          points: true,
          club: { select: { id: true, slug: true, shortCode: true, name: true } },
        },
      },
    },
  });
  return all.filter((c) => isYouthCategory(c.category));
}

export type YouthCompetition = Awaited<ReturnType<typeof getYouthCompetitionsWithStandings>>[number];

/**
 * Bracket d'une compétition : tous les matchs avec phase != REGULAR, groupés
 * par phase. Utilisé pour le BracketBoard (coupe ou phase finale de playoffs).
 */
export async function getBracket(competitionId: string) {
  const matches = await prisma.match.findMany({
    where: { competitionId, phase: { not: 'REGULAR' } },
    orderBy: { kickoffAt: 'asc' },
    select: {
      id: true,
      phase: true,
      kickoffAt: true,
      status: true,
      homeScore: true,
      awayScore: true,
      venue: true,
      homeLabel: true,
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true, primaryColor: true } },
      awayLabel: true,
      awayClub: { select: { id: true, slug: true, shortCode: true, name: true, primaryColor: true } },
      venueRef: { select: { name: true, city: true } },
    },
  });
  return matches;
}

export type BracketMatch = Awaited<ReturnType<typeof getBracket>>[number];

// `getAllSeasons()` et `getDefaultStandingsSeason()` vivaient ici. Supprimées le
// 2026-08-05 : elles lisaient la chaîne `Competition.season` avec un tri
// lexicographique, alors que la saison est désormais une entité. Remplacées par
// `getDeclaredSeasonLabels` / `getPublicSeasonLabels` /
// `getDefaultStandingsSeasonLabel` dans lib/queries/season.ts, triées par
// `Season.startsAt`. Cf. project_saison_entite_migration.

export type StandingsTopRow = Awaited<ReturnType<typeof getStandingsTop>>[number];
export type FeaturedMatch = NonNullable<Awaited<ReturnType<typeof getFeaturedMatch>>>;
export type LastResultMatch = NonNullable<Awaited<ReturnType<typeof getLastFinishedMatch>>>;
export type AllModeMatch = Awaited<ReturnType<typeof getAllMatchesForMode>>[number];
export type CompetitionForMode = Awaited<ReturnType<typeof getCompetitionsForMode>>[number];
export type CompetitionWithStandings = Awaited<ReturnType<typeof getCompetitionsWithStandings>>[number];
