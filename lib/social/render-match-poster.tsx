/**
 * Helper partagé entre les routes `/api/social/match/[id]/square.png`
 * et `.../story.png`. Fait le fetch DB (match + sponsors LIGUE), rend via
 * Satori et renvoie une `Response` PNG.
 */

import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { getMatchPublic } from '@/lib/queries/match';
import { loadPosterFonts } from '@/lib/social/fonts';
import {
  MatchPoster,
  POSTER_DIMENSIONS,
  type MatchPosterData,
  type PosterRatio,
} from '@/components/social/MatchPoster';

/**
 * Cache-Control fort : 1h sur edge + browser, stale-while-revalidate 1 jour.
 * Les affiches changent rarement (sauf score live). Si on veut forcer une
 * regen côté admin, on append `?t=<timestamp>` à l'URL (busts le cache).
 */
const CACHE_HEADER = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';

export async function renderMatchPoster(matchId: string, ratio: PosterRatio) {
  const match = await getMatchPublic(matchId);
  if (!match) {
    return new Response('Match introuvable', { status: 404 });
  }

  // Sponsors LIGUE — affichés sur toutes les affiches. Tri stable par
  // createdAt pour que l'ordre soit déterministe entre regens.
  const sponsors = await prisma.sponsor.findMany({
    where: { scope: 'LIGUE' },
    select: { name: true, logo: true },
    orderBy: { createdAt: 'asc' },
  });

  const data: MatchPosterData = {
    id: match.id,
    kickoffAt: match.kickoffAt,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    matchday: match.matchday,
    venue: match.venue,
    venueRef: match.venueRef,
    homeClub: {
      shortCode: match.homeClub.shortCode,
      name: match.homeClub.name,
      logo: match.homeClub.logo,
      primaryColor: match.homeClub.primaryColor,
    },
    awayClub: {
      shortCode: match.awayClub.shortCode,
      name: match.awayClub.name,
      logo: match.awayClub.logo,
      primaryColor: match.awayClub.primaryColor,
    },
    competition: {
      name: match.competition.name,
      season: match.competition.season,
      mode: match.competition.mode,
      category: match.competition.category,
    },
    sponsors,
  };

  const dims = POSTER_DIMENSIONS[ratio];
  const fonts = await loadPosterFonts();

  const response = new ImageResponse(<MatchPoster match={data} ratio={ratio} />, {
    width: dims.width,
    height: dims.height,
    fonts,
    headers: {
      'Cache-Control': CACHE_HEADER,
    },
  });

  return response;
}
