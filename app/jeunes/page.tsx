import type { Metadata } from "next";
import {
  getYouthCompetitionsWithStandings,
  getAllMatchesForMode,
  getAllSeasons,
} from "@/lib/queries/competition";
import { getAllContent } from "@/lib/queries/siteContent";
import { JeunesPageClient } from "@/components/lrh/pages/JeunesPageClient";

export const revalidate = 60;

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
  const allSeasons = await getAllSeasons();
  const activeSeason =
    seasonParam && allSeasons.includes(seasonParam) ? seasonParam : (allSeasons[0] ?? null);

  // En parallèle : compétitions jeunes (filtrées par isYouthCategory côté
  // server) + tous les matches des 2 modes (utilisés par StandingsBoard pour
  // la colonne « forme · 5 derniers »).
  const [competitions, matchesGazon, matchesSalle, content] = await Promise.all([
    getYouthCompetitionsWithStandings(activeSeason ?? undefined),
    getAllMatchesForMode("GAZON"),
    getAllMatchesForMode("SALLE"),
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
