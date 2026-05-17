import { prisma } from "@/lib/prisma";
import type { Mode } from "@prisma/client";

export async function getAllReferees() {
  return prisma.referee.findMany({
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      license: true,
      email: true,
      phone: true,
      notes: true,
      level: true,
      photo: true,
      clubId: true,
      club: {
        select: { id: true, slug: true, shortCode: true, name: true, primaryColor: true },
      },
      _count: { select: { matches: true } },
    },
  });
}

export async function getMatchReferees(matchId: string) {
  return prisma.matchReferee.findMany({
    where: { matchId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      role: true,
      referee: {
        select: { id: true, fullName: true, license: true },
      },
    },
  });
}

/**
 * Page publique /arbitrage : effectif arbitres (groupés par niveau côté UI).
 * On expose juste ce qui est public — pas email/téléphone par défaut.
 */
export async function getPublicReferees() {
  return prisma.referee.findMany({
    orderBy: [{ level: "desc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      level: true,
      photo: true,
      license: true,
      club: {
        select: { id: true, slug: true, shortCode: true, name: true, primaryColor: true, logo: true },
      },
      _count: { select: { matches: true } },
    },
  });
}

/**
 * Désignations à venir : matchs avec ≥ 1 arbitre désigné, kickoffAt futur.
 * Filtré par mode (gazon/salle) côté caller.
 */
export async function getUpcomingDesignations(mode: Mode, limit = 12) {
  return prisma.match.findMany({
    where: {
      competition: { mode },
      kickoffAt: { gte: new Date() },
      referees: { some: {} },
    },
    orderBy: { kickoffAt: "asc" },
    take: limit,
    select: {
      id: true,
      kickoffAt: true,
      status: true,
      homeScore: true,
      awayScore: true,
      competition: { select: { id: true, slug: true, name: true, category: true } },
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true, primaryColor: true } },
      awayClub: { select: { id: true, slug: true, shortCode: true, name: true, primaryColor: true } },
      venueRef: { select: { id: true, name: true, city: true } },
      referees: {
        orderBy: [{ role: "asc" }],
        select: {
          role: true,
          referee: { select: { id: true, fullName: true, level: true } },
        },
      },
    },
  });
}

/**
 * Désignations récentes : matchs passés avec ≥ 1 arbitre désigné.
 */
export async function getRecentDesignations(mode: Mode, limit = 8) {
  return prisma.match.findMany({
    where: {
      competition: { mode },
      kickoffAt: { lt: new Date() },
      referees: { some: {} },
    },
    orderBy: { kickoffAt: "desc" },
    take: limit,
    select: {
      id: true,
      kickoffAt: true,
      status: true,
      homeScore: true,
      awayScore: true,
      competition: { select: { id: true, slug: true, name: true, category: true } },
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true, primaryColor: true } },
      awayClub: { select: { id: true, slug: true, shortCode: true, name: true, primaryColor: true } },
      venueRef: { select: { id: true, name: true, city: true } },
      referees: {
        orderBy: [{ role: "asc" }],
        select: {
          role: true,
          referee: { select: { id: true, fullName: true, level: true } },
        },
      },
    },
  });
}

export type RefereeAdminRow = Awaited<ReturnType<typeof getAllReferees>>[number];
export type MatchRefereeRow = Awaited<ReturnType<typeof getMatchReferees>>[number];
export type PublicRefereeRow = Awaited<ReturnType<typeof getPublicReferees>>[number];
export type DesignationRow = Awaited<ReturnType<typeof getUpcomingDesignations>>[number];
