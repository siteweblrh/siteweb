import { prisma } from "@/lib/prisma";
import {
  getFeaturedMatch,
  getLastFinishedMatch,
  getStandingsTop,
  getUpcomingMatches,
} from "./competition";
import { getTopScorerForMode } from "./scorers";
import { getPlayerOfMonth } from "./playerOfMonth";
import { newsCardSelect, toNewsCardItem } from "./news-card";
import { currentSeason } from "@/lib/utils/season";

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
  const [news, gazon, salle] = await Promise.all([
    getHomeNews(3),
    getModeData("GAZON"),
    getModeData("SALLE"),
  ]);
  // La saison affichée dans le kicker du hero est un fait de CALENDRIER, pas
  // de base — même source que le header (lib/utils/season.ts). Avant, elle
  // valait `getAllSeasons()[0]` : la saison 2026-2027 créée d'avance mais pas
  // encore jouée remontait en tête, et la home annonçait « Saison Gazon
  // 2026-2027 » vingt pixels sous un header disant « SAISON 2025-2026 ».
  // Bénéfice annexe : une requête Neon de moins sur la page la plus visitée.
  return { news, gazon, salle, season: currentSeason() };
}

export type HomeNewsItem = Awaited<ReturnType<typeof getHomeNews>>[number];
export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
export type ModeData = Awaited<ReturnType<typeof getModeData>>;
