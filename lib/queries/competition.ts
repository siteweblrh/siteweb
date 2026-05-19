import { prisma } from "@/lib/prisma";
import type { Mode } from "@prisma/client";

const matchCardSelect = {
  id: true,
  homeScore: true,
  awayScore: true,
  kickoffAt: true,
  venue: true,
  status: true,
  matchday: true,
  homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
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
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      awayClub: { select: { id: true, slug: true, shortCode: true, name: true } },
    },
  });
}

export async function getStandingsTop(mode: Mode, limit = 3) {
  return prisma.standing.findMany({
    where: { competition: { mode } },
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
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      awayClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      competition: { select: { id: true, slug: true, name: true, category: true } },
      goals: {
        orderBy: { minute: "asc" },
        select: { minute: true, scoringClubId: true, scorerName: true },
      },
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
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true, primaryColor: true } },
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

export type StandingRow = Awaited<ReturnType<typeof getStandings>>[number];
export type StandingsTopRow = Awaited<ReturnType<typeof getStandingsTop>>[number];
export type FeaturedMatch = NonNullable<Awaited<ReturnType<typeof getFeaturedMatch>>>;
export type LastResultMatch = NonNullable<Awaited<ReturnType<typeof getLastFinishedMatch>>>;
export type AllModeMatch = Awaited<ReturnType<typeof getAllMatchesForMode>>[number];
export type CompetitionForMode = Awaited<ReturnType<typeof getCompetitionsForMode>>[number];
export type CompetitionWithStandings = Awaited<ReturnType<typeof getCompetitionsWithStandings>>[number];
