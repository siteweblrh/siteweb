import {
  getAllMatchesForMode,
  getCompetitionsWithStandings,
  getBracket,
  getAllSeasons,
} from '@/lib/queries/competition';
import { getTopScorersForCompetition } from '@/lib/queries/scorers';
import { getContent } from '@/lib/queries/siteContent';
import { ClassementsPageClient } from '@/components/lrh/pages/ClassementsPageClient';

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

type PageProps = {
  searchParams: Promise<{ season?: string }>;
};

export default async function ClassementsPage({ searchParams }: PageProps) {
  const { season: seasonParam } = await searchParams;

  // Saisons disponibles + résolution de la saison active (param URL ou la
  // plus récente par défaut).
  const allSeasons = await getAllSeasons();
  const activeSeason =
    seasonParam && allSeasons.includes(seasonParam) ? seasonParam : allSeasons[0];

  const [gazon, salle, heroSubtitle] = await Promise.all([
    loadModeData('GAZON', activeSeason),
    loadModeData('SALLE', activeSeason),
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
