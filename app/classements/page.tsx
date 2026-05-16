import { getAllMatchesForMode, getCompetitionsWithStandings } from '@/lib/queries/competition';
import { getTopScorersForCompetition } from '@/lib/queries/scorers';
import { ClassementsPageClient } from '@/components/lrh/pages/ClassementsPageClient';

export const metadata = {
  title: 'Classements · Ligue Réunionnaise de Hockey',
  description: 'Classements officiels et meilleurs buteurs — Gazon et Salle, par compétition.',
};

async function loadModeData(mode: 'GAZON' | 'SALLE') {
  const [competitions, matches] = await Promise.all([
    getCompetitionsWithStandings(mode),
    getAllMatchesForMode(mode),
  ]);
  // Charger les buteurs pour chaque compétition en parallèle. Le jeu de
  // données est petit (top 30 par compet × N compets par mode) — pas la peine
  // de différer côté client.
  const scorerEntries = await Promise.all(
    competitions.map(async (c) => [c.id, await getTopScorersForCompetition(c.id, 30)] as const),
  );
  const scorersByCompetition = Object.fromEntries(scorerEntries);
  return { competitions, matches, scorersByCompetition };
}

export default async function ClassementsPage() {
  const [gazon, salle] = await Promise.all([
    loadModeData('GAZON'),
    loadModeData('SALLE'),
  ]);

  return (
    <ClassementsPageClient gazon={gazon} salle={salle} />
  );
}
