import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fetchImageAsDataUri } from '@/lib/social/assets';
import { renderToBuffer } from '@react-pdf/renderer';
import { getSeasonCalendarForPdf, type SeasonCalendarPdfData } from '@/lib/queries/seasonCalendarPdf';
import { SeasonCalendarPDF } from '@/lib/pdf/SeasonCalendarPDF';
import { isValidSeason } from '@/lib/utils/season';
import { CACHE_TAGS, cachePublic, type Serialized } from '@/lib/cache/public';

// @react-pdf/renderer ne marche pas sur Edge — force Node.js runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Coût (règle n°2) — portée : une route publique, appelée sur clic explicite.
// Fréquence : la LECTURE est cachée 1 h et invalidée par le tag `competitions`,
// donc publier une journée rafraîchit le PDF, et un robot qui martèle l'URL
// consomme du CPU Vercel mais ne réveille pas Neon. C'est le même compromis
// que les affiches sociales (cf. project_neon_pages_dynamiques) : on cache la
// donnée, pas la réponse. Mode de défaillance : Neon muet → l'erreur remonte
// en 500, pas de PDF silencieusement vide.
const getSeasonCalendarCached = cachePublic(
  getSeasonCalendarForPdf,
  ['season-calendar-pdf'],
  [CACHE_TAGS.competitions],
);

/**
 * Réhydrate les `kickoffAt` à la sortie du cache.
 *
 * `unstable_cache` ne préserve PAS les `Date`, il rend des chaînes ISO — c'est
 * ce qui avait mis trois routes en 500 le 2026-08-03. Ici le document formate
 * les dates CÔTÉ SERVEUR (`fmtDate`, `fmtTime` dans CompetitionCalendarPDF),
 * donc une chaîne ferait planter le rendu. Le typage `Serialized<T>` a arrêté
 * l'erreur à la compilation cette fois ; cette fonction est la contrepartie.
 */
function reviveCompetitions(
  data: Serialized<SeasonCalendarPdfData>,
): SeasonCalendarPdfData {
  return data.map((comp) => ({
    ...comp,
    matches: comp.matches.map((m) => ({ ...m, kickoffAt: new Date(m.kickoffAt) })),
  }));
}

// Cache du logo officiel en data URI PNG, lu une fois au cold-start de la
// lambda. Même traitement que la route par compétition : le SVG historique
// utilise des transforms matrix que le support SVG partiel de @react-pdf rend
// mal, donc on rasterise avec sharp sans toucher au fichier source.
let cachedLogoDataUri: string | null = null;
async function loadLogoDataUri(): Promise<string | null> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', 'logo-ligue-officiel.svg');
    const raw = await fs.readFile(filePath);
    const png = await sharp(raw, { density: 300 })
      .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    cachedLogoDataUri = `data:image/png;base64,${png.toString('base64')}`;
    return cachedLogoDataUri;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ season: string }> },
) {
  const { season } = await params;
  // `?mode=GAZON|SALLE` restreint le document à une discipline. Absent = la
  // saison entière. Toute autre valeur est ignorée plutôt que refusée : le
  // paramètre est un confort d'affichage, pas une clé d'accès.
  const modeParam = req.nextUrl.searchParams.get('mode')?.toUpperCase();
  const mode = modeParam === 'GAZON' || modeParam === 'SALLE' ? modeParam : undefined;

  // Valider AVANT d'interroger la base : `season` vient de l'URL, donc de
  // n'importe qui. Sans ça, /api/season/<n-importe-quoi>/calendar.pdf déclenche
  // une requête Neon par appel — exactement le genre de porte ouverte qui a
  // vidé le quota en juillet.
  if (!isValidSeason(season)) {
    return NextResponse.json(
      { error: 'Saison invalide. Format attendu : 2025-2026.' },
      { status: 400 },
    );
  }

  const competitions = reviveCompetitions(await getSeasonCalendarCached(season, mode));
  if (competitions.length === 0) {
    return NextResponse.json(
      { error: `Aucun match publié pour la saison ${season}${mode ? ` en ${mode.toLowerCase()}` : ''}.` },
      { status: 404 },
    );
  }

  // Logos des clubs : UNE récupération par club sur TOUTE la saison. Sans
  // déduplication, un club engagé dans trois compétitions serait téléchargé
  // une fois par match — l'écart se creuse bien plus vite ici que sur le PDF
  // d'une seule compétition.
  const distinct = new Map<string, string>();
  for (const comp of competitions) {
    for (const m of comp.matches) {
      for (const c of [m.homeClub, m.awayClub]) {
        if (c?.logo) distinct.set(c.id, c.logo);
      }
    }
  }
  const fetched = await Promise.all(
    [...distinct.entries()].map(async ([clubId, url]) => {
      // Un logo indisponible ne doit jamais faire échouer le PDF : on retombe
      // sur le nom du club, affiché juste à côté.
      try {
        return [clubId, await fetchImageAsDataUri(url)] as const;
      } catch {
        return [clubId, null] as const;
      }
    }),
  );
  const clubLogos = new Map<string, string>();
  for (const [clubId, uri] of fetched) if (uri) clubLogos.set(clubId, uri);

  const logoDataUri = await loadLogoDataUri();

  const pdfBuffer = await renderToBuffer(
    <SeasonCalendarPDF
      season={season}
      competitions={competitions}
      logoDataUri={logoDataUri ?? undefined}
      clubLogos={clubLogos}
    />,
  );

  const filename = `calendrier-saison-${slugify(season)}${mode ? "-" + mode.toLowerCase() : ""}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
