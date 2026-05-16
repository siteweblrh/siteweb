import { prisma } from "@/lib/prisma";
import type { Mode } from "@prisma/client";

const clubMatchSelect = {
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
} as const;

const standingsSelect = {
  rank: true,
  played: true,
  wins: true,
  draws: true,
  losses: true,
  goalsFor: true,
  goalsAgainst: true,
  points: true,
  club: { select: { id: true, slug: true, shortCode: true, name: true } },
} as const;

export async function getClubBySlug(slug: string) {
  return prisma.club.findUnique({ where: { slug } });
}

export async function getAllClubs() {
  return prisma.club.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, shortCode: true, name: true, city: true },
  });
}

async function getMatchesForClubInMode(clubId: string, mode: Mode) {
  return prisma.match.findMany({
    where: {
      competition: { mode },
      OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
    },
    orderBy: { kickoffAt: "asc" },
    select: clubMatchSelect,
  });
}

async function getStandingsContextForClubInMode(clubId: string, mode: Mode) {
  // Toutes les compétitions de ce mode où le club est référencé via un Standing.
  // On charge le classement complet pour permettre de situer le club dans
  // l'ensemble (StandingsBoard avec highlightClubId).
  return prisma.competition.findMany({
    where: {
      mode,
      standings: { some: { clubId } },
    },
    orderBy: [{ season: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      season: true,
      standings: {
        orderBy: { rank: "asc" },
        select: standingsSelect,
      },
    },
  });
}

const publicMemberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  kind: true,
  category: true,
  position: true,
  jerseyNumber: true,
  photo: true,
  isFeatured: true,
  featuredHeadline: true,
  matchesPlayed: true,
  goalsScored: true,
} as const;

async function getPublicMembersForClub(clubId: string) {
  return prisma.member.findMany({
    where: { clubId },
    orderBy: [
      { isFeatured: "desc" },
      { kind: "asc" },
      { category: "asc" },
      { jerseyNumber: "asc" },
      { lastName: "asc" },
    ],
    select: publicMemberSelect,
  });
}

export async function getClubPageDataByMode(slug: string) {
  const club = await prisma.club.findUnique({
    where: { slug },
    include: { sponsors: { orderBy: { name: "asc" } } },
  });
  if (!club) return null;

  const [
    matchesGazon,
    matchesSalle,
    standingsGazon,
    standingsSalle,
    news,
    members,
  ] = await Promise.all([
    getMatchesForClubInMode(club.id, "GAZON"),
    getMatchesForClubInMode(club.id, "SALLE"),
    getStandingsContextForClubInMode(club.id, "GAZON"),
    getStandingsContextForClubInMode(club.id, "SALLE"),
    prisma.news.findMany({
      where: { published: true, clubId: club.id },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 4,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        coverImage: true,
        category: true,
        publishedAt: true,
        createdAt: true,
        club: { select: { name: true, city: true } },
      },
    }),
    getPublicMembersForClub(club.id),
  ]);

  return {
    club,
    matchesByMode: { GAZON: matchesGazon, SALLE: matchesSalle },
    standingsByMode: { GAZON: standingsGazon, SALLE: standingsSalle },
    news,
    members,
    memberCount: members.length,
  };
}

export type ClubPageByModeData = NonNullable<Awaited<ReturnType<typeof getClubPageDataByMode>>>;
export type ClubMatch = ClubPageByModeData["matchesByMode"]["GAZON"][number];
export type ClubStandingsCompetition = ClubPageByModeData["standingsByMode"]["GAZON"][number];
export type ClubPublicMember = ClubPageByModeData["members"][number];
