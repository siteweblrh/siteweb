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
import { getActiveSeasonLabel } from "./season";

export async function getHomeNews(limit = 3) {
  const rows = await prisma.news.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: newsCardSelect,
  });
  return rows.map(toNewsCardItem);
}

/**
 * `season` scope TOUT le bloc d'une discipline sur la home. Sans elle, la page
 * mélangeait les saisons sans le signaler : au 2026-08-04 elle affichait un
 * « dernier résultat » de 2025-2026 juste à côté d'un « prochain match » de
 * 2026-2027.
 *
 * `getPlayerOfMonth` fait exception et n'est pas scopée : une nomination porte
 * sa propre date d'effet et la plus récente EST la courante, par construction.
 */
export async function getModeData(mode: "GAZON" | "SALLE", season?: string) {
  const [featured, lastResult, standingsTop, upcoming, topScorer, playerOfMonth] = await Promise.all([
    getFeaturedMatch(mode, season),
    getLastFinishedMatch(mode, season),
    getStandingsTop(mode, 3, season),
    getUpcomingMatches(mode, 12, season),
    getTopScorerForMode(mode, season),
    getPlayerOfMonth(mode),
  ]);
  return { featured, lastResult, standingsTop, upcoming, topScorer, playerOfMonth };
}

export async function getHomeData() {
  // La saison vient de l'entité Season (statut EN_COURS), pilotée depuis
  // /dashboard/ligue/saisons — même source que le header et /competitions.
  const season = (await getActiveSeasonLabel()) ?? undefined;
  const [news, gazon, salle] = await Promise.all([
    getHomeNews(3),
    getModeData("GAZON", season),
    getModeData("SALLE", season),
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
