import { getAllMatchesForMode, getCompetitionsWithStandings } from '@/lib/queries/competition';
import { ClassementsPageClient } from '@/components/lrh/pages/ClassementsPageClient';

export const metadata = {
  title: 'Classements · Ligue Réunionnaise de Hockey',
  description: 'Classements officiels Gazon et Salle — points, différence de buts, forme récente.',
};

export default async function ClassementsPage() {
  const [gazonComps, gazonMatches, salleComps, salleMatches] = await Promise.all([
    getCompetitionsWithStandings('GAZON'),
    getAllMatchesForMode('GAZON'),
    getCompetitionsWithStandings('SALLE'),
    getAllMatchesForMode('SALLE'),
  ]);

  return (
    <ClassementsPageClient
      gazon={{ competitions: gazonComps, matches: gazonMatches }}
      salle={{ competitions: salleComps, matches: salleMatches }}
    />
  );
}
