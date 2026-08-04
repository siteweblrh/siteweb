import { prisma } from "@/lib/prisma";
import type { Mode } from "@prisma/client";
import { isValidSeason } from "@/lib/utils/season";

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

export async function getFeaturedMatch(mode: Mode) {
  return prisma.match.findFirst({
    where: {
      competition: { mode },
      status: { in: ["LIVE", "HALFTIME", "SCHEDULED", "FINISHED"] },
    },
    orderBy: [
      { status: "asc" },
      { kickoffAt: "desc" },
    ],
    select: { ...matchCardSelect, goals: { orderBy: { minute: "asc" } } },
  });
}

export async function getLastFinishedMatch(mode: Mode) {
  return prisma.match.findFirst({
    where: { competition: { mode }, status: "FINISHED" },
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

export async function getStandingsTop(mode: Mode, limit = 3) {
  // Scope à UNE seule compétition : le championnat principal du mode pour la
  // saison la plus récente. Sans ça, le findMany renvoie le top global de
  // toutes les compétitions du mode (D1 + Coupe + saisons précédentes)
  // → duplicate ranks et mélange des classements. Les coupes n'ont de toute
  // façon pas de classement (format CUP), mais on filtre explicitement.
  const competition = await prisma.competition.findFirst({
    where: { mode, format: { not: "CUP" } },
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

export async function getStandings(mode: Mode) {
  return prisma.standing.findMany({
    where: { competition: { mode } },
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
  });
}

export async function getUpcomingMatches(mode: Mode, limit = 4) {
  return prisma.match.findMany({
    where: {
      competition: { mode },
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
      competition: { select: { id: true, slug: true, name: true, category: true } },
    },
  });
}

export async function getCompetitionsForMode(mode: Mode, season?: string) {
  return prisma.competition.findMany({
    where: { mode, ...(season ? { season } : {}) },
    orderBy: [{ season: "desc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, category: true, season: true, format: true },
  });
}

export async function getCompetitionsWithStandings(mode: Mode, season?: string) {
  return prisma.competition.findMany({
    where: { mode, ...(season ? { season } : {}) },
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

/** Liste distincte des saisons connues (pour le sélecteur de saison). */
export async function getAllSeasons(): Promise<string[]> {
  const rows = await prisma.competition.findMany({
    select: { season: true },
    distinct: ['season'],
    orderBy: { season: 'desc' },
  });
  return rows.map((r) => r.season);
}

/**
 * Saison à afficher **par défaut** sur `/classements` : la plus récente qui a
 * produit au moins un **résultat** (`MatchStatus.FINISHED`), donc la plus
 * récente capable de remplir un tableau de classement.
 *
 * Pourquoi pas `getAllSeasons()[0]` — c'est ce qui était fait, et la page
 * atterrissait sur « [ VIDE ] — Aucun classement disponible » en prod le
 * 2026-08-04. Une saison est créée en base dès que l'admin déclare ses
 * compétitions, donc des mois avant le premier résultat ; le tri
 * `season: 'desc'` la plaçait en tête.
 *
 * ⚠️ Et pourquoi pas non plus « la plus récente qui a des matchs » — première
 * version de ce correctif, livrée puis corrigée le jour même : au 2026-08-04 la
 * saison 2026-2027 comptait **18 matchs, tous `SCHEDULED`**. Le critère était
 * satisfait, le classement restait vide. Avoir des rencontres au calendrier et
 * avoir un classement sont deux choses différentes. Même remarque pour les
 * lignes `Standing` : 2026-2027 en avait déjà 11, à zéro (équipes inscrites).
 * Le seul signal fiable est un match terminé.
 *
 * Le visiteur garde accès à la saison en cours via le sélecteur ; seul le
 * défaut change. Bascule toute seule au premier match passé en FINISHED.
 *
 * ⚠️ Ne PAS réutiliser tel quel pour `/jeunes` : cf. app/jeunes/page.tsx, les
 * compétitions jeunes n'existent que dans la saison la plus récente.
 *
 * Renvoie `null` si la base ne contient aucune compétition.
 */
export async function getDefaultStandingsSeason(
  /**
   * Saison forcée depuis l'admin (`season.current`). Respectée **si et
   * seulement si** elle a déjà produit un résultat : c'est le garde-fou choisi
   * avec l'user le 2026-08-04, pour qu'un réglage fait en pré-saison ne
   * remette pas un tableau vide en ligne. Le sélecteur de saison reste là pour
   * y aller volontairement.
   */
  preferred?: string | null,
): Promise<string | null> {
  if (preferred && isValidSeason(preferred)) {
    const usable = await prisma.competition.findFirst({
      where: { season: preferred, matches: { some: { status: 'FINISHED' } } },
      select: { id: true },
    });
    if (usable) return preferred;
  }

  const withResults = await prisma.competition.findMany({
    where: { matches: { some: { status: 'FINISHED' } } },
    select: { season: true },
    distinct: ['season'],
    orderBy: { season: 'desc' },
    take: 1,
  });
  if (withResults[0]) return withResults[0].season;
  // Aucun résultat nulle part (site neuf, saison inaugurale pas encore jouée) :
  // la saison la plus récente déclarée, et c'est l'état vide qui parle.
  const seasons = await getAllSeasons();
  return seasons[0] ?? null;
}

export type StandingRow = Awaited<ReturnType<typeof getStandings>>[number];
export type StandingsTopRow = Awaited<ReturnType<typeof getStandingsTop>>[number];
export type FeaturedMatch = NonNullable<Awaited<ReturnType<typeof getFeaturedMatch>>>;
export type LastResultMatch = NonNullable<Awaited<ReturnType<typeof getLastFinishedMatch>>>;
export type AllModeMatch = Awaited<ReturnType<typeof getAllMatchesForMode>>[number];
export type CompetitionForMode = Awaited<ReturnType<typeof getCompetitionsForMode>>[number];
export type CompetitionWithStandings = Awaited<ReturnType<typeof getCompetitionsWithStandings>>[number];
