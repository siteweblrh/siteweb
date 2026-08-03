import type { Metadata } from 'next';
import { sideName } from '@/lib/utils/match-side';
import { notFound } from 'next/navigation';
import { getMatchPublic } from '@/lib/queries/match';
import { MatchPublicPageClient } from '@/components/lrh/pages/MatchPublicPageClient';
import { JsonLd } from '@/components/lrh/seo/JsonLd';
import { breadcrumbListJsonLd, sportsEventJsonLd } from '@/lib/seo/jsonLd';
import { getMatchWeather } from '@/lib/weather/matchWeather';

export const revalidate = 3600;
export const dynamicParams = true;

type RouteParams = { id: string };

/**
 * Indispensable pour que `revalidate` ci-dessus produise quoi que ce soit.
 *
 * Doc Next 16 (`generate-static-params.md`) : « You must return an empty array
 * from generateStaticParams or utilize export const dynamic = 'force-static' in
 * order to revalidate (ISR) paths at runtime. » Sans cette fonction, la route
 * restait purement dynamique et repartait en base à CHAQUE visite, `revalidate`
 * ou pas — un des principaux réveils de Neon (cf. lib/cache/public.ts).
 *
 * On retourne volontairement un tableau VIDE plutôt que la liste des matchs :
 * - rien n'est prérendu au build, donc le build ne touche pas la base. C'est ce
 *   qui avait bloqué tous les déploiements du 27/07 au 01/08 — la collecte des
 *   pages échouait sur Prisma pendant que la base était suspendue, rendant le
 *   correctif indéployable. On ne réintroduit pas cette dépendance.
 * - chaque page de match est rendue à la première visite puis servie depuis le
 *   cache pendant 1 h, ce qui donne exactement le comportement recherché.
 */
export async function generateStaticParams(): Promise<RouteParams[]> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = await getMatchPublic(id);
  if (!match) return { title: 'Match introuvable', robots: { index: false, follow: false } };
  const homeName = sideName({ club: match.homeClub, label: match.homeLabel });
  const awayName = sideName({ club: match.awayClub, label: match.awayLabel });
  const isIndexableResult =
    match.status === 'FINISHED' &&
    match.homeClub != null &&
    match.awayClub != null &&
    match.homeScore != null &&
    match.awayScore != null;
  const score =
    match.homeScore != null && match.awayScore != null
      ? ` (${match.homeScore}-${match.awayScore})`
      : '';
  const date = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Indian/Reunion',
  }).format(match.kickoffAt);
  const time = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Indian/Reunion',
  }).format(match.kickoffAt);
  const description = `${homeName} contre ${awayName} — ${match.competition.name} ${match.competition.season}, le ${date} à ${time}${score ? `, score ${match.homeScore}-${match.awayScore}` : ''}.`;
  return {
    title: `${homeName} vs ${awayName}${score}`,
    description,
    alternates: { canonical: `/match/${match.id}` },
    robots: { index: isIndexableResult, follow: true },
    openGraph: {
      title: `${homeName} vs ${awayName}${score}`,
      description,
      type: 'website',
      url: `/match/${match.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${homeName} vs ${awayName}${score}`,
      description,
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
    city: match.venueRef?.city ?? match.homeClub?.city,
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
            name: sideName({ club: match.homeClub, label: match.homeLabel }),
            slug: match.homeClub?.slug ?? '',
            shortCode: match.homeClub?.shortCode ?? null,
          },
          awayTeam: {
            name: sideName({ club: match.awayClub, label: match.awayLabel }),
            slug: match.awayClub?.slug ?? '',
            shortCode: match.awayClub?.shortCode ?? null,
          },
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          competitionName: match.competition.name,
          competitionSeason: match.competition.season,
          venueName: match.venueRef?.name ?? match.venue,
          venueCity: match.venueRef?.city,
        })}
      />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: 'Accueil', url: '/' },
          { name: 'Compétitions', url: '/competitions' },
          {
            name: `${sideName({ club: match.homeClub, label: match.homeLabel })} – ${sideName({ club: match.awayClub, label: match.awayLabel })}`,
            url: `/match/${match.id}`,
          },
        ])}
      />
      <MatchPublicPageClient match={match} weather={weather} />
    </>
  );
}
