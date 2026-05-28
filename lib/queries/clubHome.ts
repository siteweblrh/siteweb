import { prisma } from '@/lib/prisma';

/**
 * Synthèse "écran d'accueil" pour un club manager :
 *   - prochain match (status SCHEDULED, kickoffAt > now, plus proche)
 *   - dernier match terminé (status FINISHED, le plus récent)
 *   - positions au classement (toutes compétitions où le club a un Standing)
 *
 * Retourne null sur les sections vides plutôt que des objets vides → simplifie
 * le rendu côté UI (`if (data.nextMatch)` au lieu de checks profonds).
 */
export async function getClubHomeSummary(clubId: string) {
  const now = new Date();

  const [nextMatch, lastMatch, standings] = await Promise.all([
    prisma.match.findFirst({
      where: {
        OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
        kickoffAt: { gte: now },
        status: { in: ['SCHEDULED', 'LIVE', 'HALFTIME'] },
      },
      orderBy: { kickoffAt: 'asc' },
      select: {
        id: true,
        kickoffAt: true,
        status: true,
        matchday: true,
        phase: true,
        homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
        awayClub: { select: { id: true, slug: true, shortCode: true, name: true } },
        competition: { select: { name: true, mode: true, category: true } },
        venueRef: { select: { name: true, city: true } },
        venue: true,
      },
    }),
    prisma.match.findFirst({
      where: {
        OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
        status: 'FINISHED',
      },
      orderBy: { kickoffAt: 'desc' },
      select: {
        id: true,
        kickoffAt: true,
        homeScore: true,
        awayScore: true,
        homeClubId: true,
        awayClubId: true,
        homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
        awayClub: { select: { id: true, slug: true, shortCode: true, name: true } },
        competition: { select: { name: true, mode: true, category: true } },
      },
    }),
    // Standings du club : on remonte seulement les compés où le club a
    // joué au moins 1 match (played > 0). Aligné avec le filtre /dashboard/standings.
    prisma.standing.findMany({
      where: { clubId, played: { gt: 0 } },
      select: {
        rank: true,
        played: true,
        wins: true,
        draws: true,
        losses: true,
        points: true,
        competition: { select: { id: true, slug: true, name: true, mode: true, season: true } },
      },
      orderBy: [{ competition: { season: 'desc' } }, { rank: 'asc' }],
    }),
  ]);

  return { nextMatch, lastMatch, standings };
}

export type ClubHomeSummary = Awaited<ReturnType<typeof getClubHomeSummary>>;
