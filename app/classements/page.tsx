import {
  getAllMatchesForMode,
  getCompetitionsWithStandings,
  getBracket,
  getAllSeasons,
} from '@/lib/queries/competition';
import { getTopScorersForCompetition } from '@/lib/queries/scorers';
import { getContent } from '@/lib/queries/siteContent';
import { ClassementsPageClient } from '@/components/lrh/pages/ClassementsPageClient';
import { CACHE_TAGS, cachePublic } from '@/lib/cache/public';

export const metadata = {
  title: 'Classements · Ligue Réunionnaise de Hockey',
  description: 'Classements officiels et meilleurs buteurs — Gazon et Salle, par compétition.',
};

async function loadModeData(mode: 'GAZON' | 'SALLE', season?: string) {
  const [competitions, matches] = await Promise.all([
    getCompetitionsWithStandings(mode, season),
    getAllMatchesForMode(mode),
  ]);
  // Charger les buteurs ET les brackets pour chaque compétition en parallèle.
  // Le jeu de données reste petit (≤ 5 compets par mode).
  const [scorerEntries, bracketEntries] = await Promise.all([
    Promise.all(
      competitions.map(
        async (c) => [c.id, await getTopScorersForCompetition(c.id, 30)] as const,
      ),
    ),
    Promise.all(
      competitions
        .filter((c) => c.format === 'CHAMPIONSHIP_PLAYOFFS' || c.format === 'CUP')
        .map(async (c) => [c.id, await getBracket(c.id)] as const),
    ),
  ]);
  const scorersByCompetition = Object.fromEntries(scorerEntries);
  const bracketsByCompetition = Object.fromEntries(bracketEntries);
  return { competitions, matches, scorersByCompetition, bracketsByCompetition };
}

// Coût (règle n°2) — portée : 1 page. Fréquence : cache de données 1 h, invalidé
// par tag à chaque action sur une compétition. Défaillance : Neon muet = erreur
// visible, pas de dégradation silencieuse.
//
// Cette page était la première consommatrice de Neon du site : `searchParams`
// la rend dynamique, donc AUCUN `revalidate` de segment ne s'y applique et
// `loadModeData` repartait en base à chaque visite — pour les deux modes, avec
// classements + buteurs + brackets de chaque compétition. Au relevé du
// 2026-08-03, ses tables occupaient les 5 premières places des lectures de la
// base (MemberCompetitionStats : 670 731). Le cache ci-dessous ne change rien
// au rendu : la page reste dynamique, elle ne touche simplement plus la base.
const loadModeDataCached = cachePublic(loadModeData, ['classements:mode-data'], [
  CACHE_TAGS.competitions,
]);

const getAllSeasonsCached = cachePublic(getAllSeasons, ['classements:seasons'], [
  CACHE_TAGS.competitions,
]);

type PageProps = {
  searchParams: Promise<{ season?: string }>;
};

export default async function ClassementsPage({ searchParams }: PageProps) {
  const { season: seasonParam } = await searchParams;

  // Saisons disponibles + résolution de la saison active (param URL ou la
  // plus récente par défaut).
  const allSeasons = await getAllSeasonsCached();
  const activeSeason =
    seasonParam && allSeasons.includes(seasonParam) ? seasonParam : allSeasons[0];

  const [gazon, salle, heroSubtitle] = await Promise.all([
    loadModeDataCached('GAZON', activeSeason),
    loadModeDataCached('SALLE', activeSeason),
    getContent('hero.classements.subtitle'),
  ]);

  return (
    <ClassementsPageClient
      gazon={gazon}
      salle={salle}
      heroSubtitle={heroSubtitle}
      seasons={allSeasons}
      activeSeason={activeSeason ?? null}
    />
  );
}
