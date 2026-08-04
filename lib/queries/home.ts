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
  // Plus de `season` ici : le kicker du hero lit désormais le contexte
  // `useSeason()` comme le header et les tags de page, donc une seule source
  // pour tout le site (surcharge admin `season.current`, sinon calendrier).
  // Avant, cette valeur venait de `getAllSeasons()[0]` et la home annonçait
  // « Saison Gazon 2026-2027 » vingt pixels sous un header disant
  // « SAISON 2025-2026 ». Bénéfice annexe : une requête Neon de moins sur la
  // page la plus visitée.
  return { news, gazon, salle };
}

export type HomeNewsItem = Awaited<ReturnType<typeof getHomeNews>>[number];
export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
export type ModeData = Awaited<ReturnType<typeof getModeData>>;
