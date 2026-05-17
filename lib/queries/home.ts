import { prisma } from "@/lib/prisma";
import {
  getFeaturedMatch,
  getLastFinishedMatch,
  getStandingsTop,
  getUpcomingMatches,
} from "./competition";
import { getTopScorerForMode } from "./scorers";

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
  const [featured, lastResult, standingsTop, upcoming, topScorer] = await Promise.all([
    getFeaturedMatch(mode),
    getLastFinishedMatch(mode),
    getStandingsTop(mode, 3),
    getUpcomingMatches(mode, 4),
    getTopScorerForMode(mode),
  ]);
  return { featured, lastResult, standingsTop, upcoming, topScorer };
}

export async function getHomeData() {
  const [news, gazon, salle] = await Promise.all([
    getHomeNews(3),
    getModeData("GAZON"),
    getModeData("SALLE"),
  ]);
  return { news, gazon, salle };
}

export type HomeNewsItem = Awaited<ReturnType<typeof getHomeNews>>[number];
export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
export type ModeData = Awaited<ReturnType<typeof getModeData>>;
