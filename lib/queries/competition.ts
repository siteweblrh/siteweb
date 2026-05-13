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
  competition: { select: { name: true, slug: true, mode: true } },
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

export type StandingRow = Awaited<ReturnType<typeof getStandings>>[number];
export type StandingsTopRow = Awaited<ReturnType<typeof getStandingsTop>>[number];
export type FeaturedMatch = NonNullable<Awaited<ReturnType<typeof getFeaturedMatch>>>;
export type LastResultMatch = NonNullable<Awaited<ReturnType<typeof getLastFinishedMatch>>>;
