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
import { newsCardSelect, toNewsCardItem } from "./news-card";

export async function getHomeNews(limit = 3) {
  const rows = await prisma.news.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: newsCardSelect,
  });
  return rows.map(toNewsCardItem);
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
