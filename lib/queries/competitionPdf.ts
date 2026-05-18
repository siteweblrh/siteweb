import { prisma } from '@/lib/prisma';

/**
 * Fetch complet d'une compétition pour générer son calendrier PDF officiel :
 * compétition + matchs (avec clubs et terrain) + entries (clubs engagés).
 *
 * Retourne null si compétition introuvable.
 */
export async function getCompetitionForPdf(id: string) {
  const competition = await prisma.competition.findUnique({
    where: { id },
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
          homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
          awayClub: { select: { id: true, slug: true, shortCode: true, name: true } },
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
  return competition;
}

export type CompetitionPdfData = NonNullable<Awaited<ReturnType<typeof getCompetitionForPdf>>>;
export type CompetitionPdfMatch = CompetitionPdfData['matches'][number];
