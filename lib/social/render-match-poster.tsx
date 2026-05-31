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
  fetchImageAsDataUri,
  pickSilhouettePath,
  posterLogoUrl,
  publicFileAsDataUri,
} from '@/lib/social/assets';
import { rasterizeSvgToPngDataUri } from '@/lib/social/rasterize';
import {
  MatchPoster,
  POSTER_DIMENSIONS,
  type MatchPosterData,
  type PosterRatio,
} from '@/components/social/MatchPoster';

/**
 * Cache stratégie : court max-age côté browser (60s) + long s-maxage côté
 * CDN avec stale-while-revalidate. La fraîcheur côté admin est garantie
 * par le query param `?v=<match.updatedAt>` injecté dans les liens —
 * chaque édition change l'URL et bust le cache naturellement.
 *
 * 60s en max-age évite à l'admin de devoir hard-refresh quand il vient
 * de cliquer "modifier le match" puis re-télécharge l'affiche.
 */
const CACHE_HEADER = 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400';

export async function renderMatchPoster(matchId: string, ratio: PosterRatio) {
  // Log explicite pour confirmer que la route est bien atteinte (vs servi
  // depuis cache browser). Si tu fais une requête mais que tu ne vois pas
  // ce log côté serveur, c'est que ton browser sert une réponse cachée.
  console.log(`[social-poster] BEGIN render match=${matchId} ratio=${ratio}`);
  const t0 = Date.now();
  try {
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

    // Pré-fetch côté server : tous les logos (clubs + sponsors) convertis en
    // data URI base64, avec Accept header strict (refuse AVIF/WebP). Ça
    // contourne le crash silencieux Satori quand un CDN sert un format
    // non-supporté. Parallel pour minimiser la latence cold.
    //
    // En plus : rasterisation SVG → PNG (sharp) pour le badge LRH et la
    // silhouette. Satori a un support partiel de SVG (paths complexes,
    // text element et certains styles cassent silencieusement). Passer
    // par du PNG pré-rendu élimine toutes ces incompatibilités.
    const silhouettePath = pickSilhouettePath(match.id);
    const badgeUri = publicFileAsDataUri('/assets/badge-lrh-officiel.png', 'image/png');
    const [homeLogoUri, awayLogoUri, silhouetteUri, ...sponsorLogoUris] =
      await Promise.all([
        fetchImageAsDataUri(posterLogoUrl(match.homeClub.logo)),
        fetchImageAsDataUri(posterLogoUrl(match.awayClub.logo)),
        rasterizeSvgToPngDataUri(silhouettePath, 1080, (svg) =>
          svg.replace(/fill:#010100/gi, 'fill:#ffffff').replace(/fill="#010100"/gi, 'fill="#ffffff"'),
        ),
        ...sponsors.map((s) => fetchImageAsDataUri(s.logo)),
      ]);

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
        logo: homeLogoUri, // ← data URI (ou null → pastille couleur fallback)
        primaryColor: match.homeClub.primaryColor,
      },
      awayClub: {
        shortCode: match.awayClub.shortCode,
        name: match.awayClub.name,
        logo: awayLogoUri,
        primaryColor: match.awayClub.primaryColor,
      },
      competition: {
        name: match.competition.name,
        season: match.competition.season,
        mode: match.competition.mode,
        category: match.competition.category,
      },
      sponsors: sponsors.map((s, i) => ({ name: s.name, logo: sponsorLogoUris[i] })),
    };

    const dims = POSTER_DIMENSIONS[ratio];
    const fonts = await loadPosterFonts();

    console.log(
      `[social-poster] DATA OK match=${matchId} home-logo=${homeLogoUri ? 'OK' : 'MISSING'} away-logo=${awayLogoUri ? 'OK' : 'MISSING'} sponsors=${sponsorLogoUris.filter(Boolean).length}/${sponsorLogoUris.length} (${Date.now() - t0}ms)`,
    );

    const response = new ImageResponse(
      <MatchPoster
        match={data}
        ratio={ratio}
        badgeUri={badgeUri}
        silhouetteUri={silhouetteUri}
      />,
      {
        width: dims.width,
        height: dims.height,
        fonts,
        headers: {
          'Cache-Control': CACHE_HEADER,
        },
      },
    );
    console.log(`[social-poster] DONE match=${matchId} ratio=${ratio} (${Date.now() - t0}ms total)`);
    return response;
  } catch (err) {
    // Satori échoue silencieusement (image blanche) si on ne logue pas
    // explicitement les erreurs de rendu. On les remonte ici + on rend
    // un PNG d'erreur visible (rouge, message) pour pas masquer le bug.
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[social-poster] render failed:', message, stack);

    const dims = POSTER_DIMENSIONS[ratio];
    return new ImageResponse(
      (
        <div
          style={{
            width: dims.width,
            height: dims.height,
            display: 'flex',
            flexDirection: 'column',
            background: '#A8202F',
            color: '#fff',
            padding: 60,
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 800, marginBottom: 20 }}>
            ⚠ Erreur de génération
          </div>
          <div style={{ display: 'flex', fontSize: 24, lineHeight: 1.4, opacity: 0.95 }}>
            {message}
          </div>
          <div style={{ display: 'flex', fontSize: 16, marginTop: 30, opacity: 0.7 }}>
            Voir les logs serveur pour la stack complète.
          </div>
        </div>
      ),
      {
        width: dims.width,
        height: dims.height,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
