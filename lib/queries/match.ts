import { prisma } from '@/lib/prisma';

/**
 * Fetch un match avec tous ses faits marquants publics (goals + cards),
 * sans les blessures qui restent admin-only (suivi médical).
 *
 * Retourne null si match introuvable. Pas d'auth — page publique.
 */
export async function getMatchPublic(id: string) {
  return prisma.match.findUnique({
    where: { id },
    select: {
      id: true,
      kickoffAt: true,
      status: true,
      matchday: true,
      phase: true,
      homeScore: true,
      awayScore: true,
      venue: true,
      homeClubId: true,
      awayClubId: true,
      organizerClubId: true,
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true, logo: true, primaryColor: true } },
      awayClub: { select: { id: true, slug: true, shortCode: true, name: true, logo: true, primaryColor: true } },
      organizerClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      competition: {
        select: {
          id: true,
          slug: true,
          name: true,
          season: true,
          mode: true,
          category: true,
          format: true,
        },
      },
      venueRef: { select: { id: true, name: true, city: true } },
      goals: {
        orderBy: { minute: 'asc' },
        select: {
          id: true,
          minute: true,
          scoringClubId: true,
          scorerName: true,
          kind: true,
          scorerMember: {
            select: { id: true, firstName: true, lastName: true, jerseyNumber: true, clubId: true },
          },
        },
      },
      cards: {
        orderBy: { minute: 'asc' },
        select: {
          id: true,
          minute: true,
          kind: true,
          reason: true,
          clubId: true,
          memberName: true,
          member: {
            select: { id: true, firstName: true, lastName: true, jerseyNumber: true, clubId: true },
          },
        },
      },
      referees: {
        orderBy: [{ role: 'asc' }],
        select: {
          role: true,
          referee: { select: { id: true, fullName: true } },
        },
      },
    },
  });
}

export type PublicMatch = NonNullable<Awaited<ReturnType<typeof getMatchPublic>>>;
export type PublicMatchGoal = PublicMatch['goals'][number];
export type PublicMatchCard = PublicMatch['cards'][number];
