import type { Metadata } from "next";
import {
  getYouthCompetitionsWithStandings,
  getAllMatchesForMode,
  getAllSeasons,
} from "@/lib/queries/competition";
import { getAllContent } from "@/lib/queries/siteContent";
import { JeunesPageClient } from "@/components/lrh/pages/JeunesPageClient";
import { CACHE_TAGS, cachePublic, type Serialized } from "@/lib/cache/public";

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

// Réhydratation des dates — cf. lib/cache/public.ts : le cache de données rend
// les `Date` en chaînes ISO. On restitue le contrat attendu par StandingsBoard.
type MatchList = Awaited<ReturnType<typeof getAllMatchesForMode>>;

function reviveMatches(matches: Serialized<MatchList>): MatchList {
  return matches.map((m) => ({ ...m, kickoffAt: new Date(m.kickoffAt) }));
}

export const metadata: Metadata = {
  // Nom du site ajouté par `title.template` (app/layout.tsx) — pas de suffixe ici.
  title: "Championnat Jeunes",
  description:
    "Tous les classements jeunes de la Ligue Réunionnaise de Hockey — U11, U14, U17, U19 — gazon et salle, mis à jour en direct après chaque match.",
};

type PageProps = {
  searchParams: Promise<{ season?: string }>;
};

export default async function JeunesPage({ searchParams }: PageProps) {
  const { season: seasonParam } = await searchParams;

  // Saison active : param URL si valide, sinon la plus récente.
  //
  // ⚠️ Ne PAS remplacer par getDefaultStandingsSeason() comme sur /classements.
  // Essayé le 2026-08-04, écarté après lecture des données de prod : les
  // compétitions jeunes n'existent QUE dans la saison la plus récente (au
  // 2026-08-04 : 4 compétitions U10-U12/U14 en 2026-2027, zéro en 2025-2026).
  // Basculer sur « la dernière saison avec des résultats » n'afficherait pas un
  // classement de l'an dernier, mais une page sans aucune compétition.
  // L'état vide d'ici est de toute façon explicite (« Classement à venir — les
  // premières journées n'ont pas encore été jouées »), contrairement au
  // « Aucun classement disponible » nu de /classements.
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
      matchesByMode={{
        GAZON: reviveMatches(matchesGazon),
        SALLE: reviveMatches(matchesSalle),
      }}
      seasons={allSeasons}
      activeSeason={activeSeason}
      content={content}
      heroSubtitle={content['hero.jeunes.subtitle']}
    />
  );
}
