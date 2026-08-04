import { prisma } from '@/lib/prisma';
import type { CompetitionPdfData } from '@/lib/queries/competitionPdf';

/**
 * Fetch de TOUTES les compétitions d'une saison pour le calendrier PDF complet.
 *
 * Le `select` est volontairement identique à `getCompetitionForPdf` : le
 * document de saison réutilise tels quels `buildRounds` et `MatchLine` de
 * `CompetitionCalendarPDF`, qui attendent cette forme exacte. Toute évolution
 * du select doit rester alignée entre les deux fichiers.
 *
 * ⚠️ « Matchs publiés » n'est pas un filtre : sur ce projet, publier une
 * journée **crée** les lignes `Match` et dépublier les **supprime**
 * (lib/actions/draftCalendar.ts). Une ligne dans `Match` est donc, par
 * construction, un match publié. Le seul filtre utile est d'écarter les
 * compétitions qui n'ont aucun match, pour ne pas imprimer des sections vides.
 */
export async function getSeasonCalendarForPdf(season: string, mode?: 'GAZON' | 'SALLE') {
  const competitions = await prisma.competition.findMany({
    // `mode` optionnel : sans lui, le document couvre la saison entière
    // (gazon + salle). Avec, il colle à la discipline affichée à l'écran —
    // c'est le périmètre choisi avec l'user, « exactement ce que la page
    // montre ». Cf. project_pdf_calendrier_saison.
    where: { season, ...(mode ? { mode } : {}), matches: { some: {} } },
    orderBy: [{ mode: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      mode: true,
      season: true,
      category: true,
      format: true,
      matches: {
        orderBy: [{ kickoffAt: 'asc' }],
        select: {
          id: true,
          kickoffAt: true,
          venue: true,
          status: true,
          matchday: true,
          phase: true,
          homeScore: true,
          awayScore: true,
          homeClubId: true,
          awayClubId: true,
          homeLabel: true,
          homeClub: { select: { id: true, slug: true, shortCode: true, name: true, logo: true } },
          awayLabel: true,
          awayClub: { select: { id: true, slug: true, shortCode: true, name: true, logo: true } },
          organizerClub: { select: { id: true, slug: true, shortCode: true, name: true } },
          venueRef: { select: { id: true, name: true, city: true } },
          referees: {
            orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
            select: {
              role: true,
              referee: { select: { fullName: true } },
            },
          },
        },
      },
      entries: {
        orderBy: { club: { name: 'asc' } },
        select: {
          club: { select: { id: true, slug: true, shortCode: true, name: true, city: true } },
        },
      },
    },
  });

  // Le type est identique à celui du PDF par compétition — garanti par le
  // select ci-dessus, et vérifié par le compilateur via cette annotation.
  return competitions satisfies CompetitionPdfData[];
}

export type SeasonCalendarPdfData = Awaited<ReturnType<typeof getSeasonCalendarForPdf>>;
