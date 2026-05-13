import { prisma } from "@/lib/prisma";
import { getClubMatches } from "./competition";

export async function getClubBySlug(slug: string) {
  return prisma.club.findUnique({ where: { slug } });
}

export async function getAllClubs() {
  return prisma.club.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, shortCode: true, name: true, city: true },
  });
}

export async function getClubPageData(slug: string) {
  const club = await prisma.club.findUnique({
    where: { slug },
    include: {
      sponsors: { orderBy: { name: "asc" } },
    },
  });
  if (!club) return null;

  const [standings, matches, news, memberCount] = await Promise.all([
    prisma.standing.findMany({
      where: { clubId: club.id },
      select: {
        rank: true,
        points: true,
        played: true,
        wins: true,
        draws: true,
        losses: true,
        goalsFor: true,
        goalsAgainst: true,
        competition: { select: { id: true, slug: true, name: true, mode: true, season: true } },
      },
      orderBy: { competition: { mode: "asc" } },
    }),
    getClubMatches(club.id, { upcomingLimit: 5, pastLimit: 5 }),
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
    prisma.member.count({ where: { clubId: club.id } }),
  ]);

  return { club, standings, matches, news, memberCount };
}

export type ClubPageData = NonNullable<Awaited<ReturnType<typeof getClubPageData>>>;
