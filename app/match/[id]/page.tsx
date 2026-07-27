import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMatchPublic } from '@/lib/queries/match';
import { MatchPublicPageClient } from '@/components/lrh/pages/MatchPublicPageClient';
import { JsonLd } from '@/components/lrh/seo/JsonLd';
import { sportsEventJsonLd } from '@/lib/seo/jsonLd';
import { getMatchWeather } from '@/lib/weather/matchWeather';

export const revalidate = 300;
export const dynamicParams = true;

type RouteParams = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = await getMatchPublic(id);
  if (!match) return { title: 'Match introuvable' };
  const score =
    match.homeScore != null && match.awayScore != null
      ? ` (${match.homeScore}-${match.awayScore})`
      : '';
  return {
    title: `${match.homeClub.name} vs ${match.awayClub.name}${score} | LRH`,
    description: `${match.homeClub.name} vs ${match.awayClub.name} — ${match.competition.name} ${match.competition.season}, hockey ${match.competition.mode === 'GAZON' ? 'gazon' : 'salle'} à La Réunion.`,
    openGraph: {
      title: `${match.homeClub.name} vs ${match.awayClub.name}${score}`,
      description: `${match.competition.name} · ${match.competition.season}`,
      type: 'website',
    },
  };
}

export default async function MatchPublicPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  const match = await getMatchPublic(id);
  if (!match) notFound();

  // Météo du coup d'envoi : uniquement gazon (extérieur) et match à venir —
  // getMatchWeather renvoie null dans tous les autres cas. Pas de requête base,
  // pas de JS client : le résultat descend en prop.
  const weather = await getMatchWeather({
    city: match.venueRef?.city ?? match.homeClub.city,
    kickoffAt: match.kickoffAt,
    mode: match.competition.mode,
    status: match.status,
  });

  return (
    <>
      <JsonLd
        data={sportsEventJsonLd({
          matchId: match.id,
          kickoffAt: match.kickoffAt,
          status: match.status as Parameters<typeof sportsEventJsonLd>[0]['status'],
          homeTeam: {
            name: match.homeClub.name,
            slug: match.homeClub.slug,
            shortCode: match.homeClub.shortCode,
          },
          awayTeam: {
            name: match.awayClub.name,
            slug: match.awayClub.slug,
            shortCode: match.awayClub.shortCode,
          },
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          competitionName: match.competition.name,
          competitionSeason: match.competition.season,
          venueName: match.venueRef?.name ?? match.venue,
          venueCity: match.venueRef?.city,
        })}
      />
      <MatchPublicPageClient match={match} weather={weather} />
    </>
  );
}
