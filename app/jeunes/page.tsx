import type { Metadata } from "next";
import {
  getYouthCompetitionsWithStandings,
  getAllMatchesForMode,
  getAllSeasons,
} from "@/lib/queries/competition";
import { getAllContent } from "@/lib/queries/siteContent";
import { JeunesPageClient } from "@/components/lrh/pages/JeunesPageClient";
import { CACHE_TAGS, cachePublic } from "@/lib/cache/public";

export const revalidate = 3600;

// ⚠️ Le `revalidate` ci-dessus ne s'applique PAS : lire `searchParams` rend la
// page dynamique, Next ignore alors le cache de segment. C'est le cache de
// données ci-dessous qui protège Neon. Cf. lib/cache/public.ts.
//
// Les trois lectures sont cachées séparément : `getAllMatchesForMode` est
// partagée avec /classements, mais les clés diffèrent, donc pas de collision.
const getYouthCompetitionsCached = cachePublic(
  getYouthCompetitionsWithStandings,
  ["jeunes:competitions"],
  [CACHE_TAGS.competitions],
);

const getMatchesCached = cachePublic(getAllMatchesForMode, ["jeunes:matches"], [
  CACHE_TAGS.competitions,
]);

const getAllSeasonsCached = cachePublic(getAllSeasons, ["jeunes:seasons"], [
  CACHE_TAGS.competitions,
]);

export const metadata: Metadata = {
  title: "Championnat Jeunes | Ligue Réunionnaise de Hockey",
  description:
    "Tous les classements jeunes de la Ligue Réunionnaise de Hockey — U11, U14, U17, U19 — gazon et salle, mis à jour en direct après chaque match.",
};

type PageProps = {
  searchParams: Promise<{ season?: string }>;
};

export default async function JeunesPage({ searchParams }: PageProps) {
  const { season: seasonParam } = await searchParams;

  // Saison active : param URL si valide, sinon la plus récente.
  const allSeasons = await getAllSeasonsCached();
  const activeSeason =
    seasonParam && allSeasons.includes(seasonParam) ? seasonParam : (allSeasons[0] ?? null);

  // En parallèle : compétitions jeunes (filtrées par isYouthCategory côté
  // server) + tous les matches des 2 modes (utilisés par StandingsBoard pour
  // la colonne « forme · 5 derniers »).
  const [competitions, matchesGazon, matchesSalle, content] = await Promise.all([
    getYouthCompetitionsCached(activeSeason ?? undefined),
    getMatchesCached("GAZON"),
    getMatchesCached("SALLE"),
    getAllContent(),
  ]);

  return (
    <JeunesPageClient
      competitions={competitions}
      matchesByMode={{ GAZON: matchesGazon, SALLE: matchesSalle }}
      seasons={allSeasons}
      activeSeason={activeSeason}
      content={content}
      heroSubtitle={content['hero.jeunes.subtitle']}
    />
  );
}
