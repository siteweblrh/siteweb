import { prisma } from "@/lib/prisma";
import {
  getAllSeasons,
  getFeaturedMatch,
  getLastFinishedMatch,
  getStandingsTop,
  getUpcomingMatches,
} from "./competition";
import { getTopScorerForMode } from "./scorers";
import { getPlayerOfMonth } from "./playerOfMonth";

export async function getHomeNews(limit = 3) {
  return prisma.news.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
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
  });
}

export async function getModeData(mode: "GAZON" | "SALLE") {
  const [featured, lastResult, standingsTop, upcoming, topScorer, playerOfMonth] = await Promise.all([
    getFeaturedMatch(mode),
    getLastFinishedMatch(mode),
    getStandingsTop(mode, 3),
    getUpcomingMatches(mode, 12),
    getTopScorerForMode(mode),
    getPlayerOfMonth(mode),
  ]);
  return { featured, lastResult, standingsTop, upcoming, topScorer, playerOfMonth };
}

export async function getHomeData() {
  const [news, gazon, salle, seasons] = await Promise.all([
    getHomeNews(3),
    getModeData("GAZON"),
    getModeData("SALLE"),
    getAllSeasons(),
  ]);
  return { news, gazon, salle, season: seasons[0] ?? null };
}

export type HomeNewsItem = Awaited<ReturnType<typeof getHomeNews>>[number];
export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
export type ModeData = Awaited<ReturnType<typeof getModeData>>;
