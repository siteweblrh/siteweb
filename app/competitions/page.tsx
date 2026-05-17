import { getAllMatchesForMode, getCompetitionsForMode } from '@/lib/queries/competition';
import { getContent } from '@/lib/siteContent';
import { CompetitionsPageClient } from '@/components/lrh/pages/CompetitionsPageClient';

export const metadata = {
  title: 'Compétitions · Ligue Réunionnaise de Hockey',
  description: 'Calendrier officiel de la Ligue Réunionnaise de Hockey — tous les matchs gazon et salle, journée par journée.',
};

export default async function CompetitionsPage() {
  const [gazonMatches, gazonCompetitions, salleMatches, salleCompetitions, heroSubtitle] =
    await Promise.all([
      getAllMatchesForMode('GAZON'),
      getCompetitionsForMode('GAZON'),
      getAllMatchesForMode('SALLE'),
      getCompetitionsForMode('SALLE'),
      getContent('hero.competitions.subtitle'),
    ]);

  return (
    <CompetitionsPageClient
      gazon={{ matches: gazonMatches, competitions: gazonCompetitions }}
      salle={{ matches: salleMatches, competitions: salleCompetitions }}
      heroSubtitle={heroSubtitle}
    />
  );
}
