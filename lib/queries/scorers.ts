import { prisma } from '@/lib/prisma';

// Top buteurs cross-clubs pour une compétition donnée.
//
// La query lit les `MemberCompetitionStats` filtrés sur la compétition,
// trie par buts décroissant, et joint le joueur + son club. Si plus tard les
// feuilles de match alimentent ces rangées automatiquement, la query reste
// identique.
export async function getTopScorersForCompetition(
  competitionId: string,
  limit = 30,
) {
  const rows = await prisma.memberCompetitionStats.findMany({
    where: {
      competitionId,
      goalsScored: { gt: 0 },
      member: { kind: 'PLAYER' },
    },
    orderBy: [
      { goalsScored: 'desc' },
      { matchesPlayed: 'asc' },
    ],
    take: limit,
    select: {
      matchesPlayed: true,
      goalsScored: true,
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          jerseyNumber: true,
          photo: true,
          category: true,
          isFeatured: true,
          featuredHeadline: true,
          club: {
            select: {
              id: true,
              slug: true,
              shortCode: true,
              name: true,
              logo: true,
              primaryColor: true,
            },
          },
        },
      },
    },
  });

  // Aplatir pour exposer un shape stable aux composants. Le tri secondaire par
  // lastName est appliqué côté JS pour départager les ex-aequo (Prisma ne sait
  // pas trier sur un champ d'une relation imbriquée en mode findMany simple).
  return rows
    .map((r) => ({
      id: r.member.id,
      firstName: r.member.firstName,
      lastName: r.member.lastName,
      position: r.member.position,
      jerseyNumber: r.member.jerseyNumber,
      photo: r.member.photo,
      category: r.member.category,
      isFeatured: r.member.isFeatured,
      featuredHeadline: r.member.featuredHeadline,
      matchesPlayed: r.matchesPlayed,
      goalsScored: r.goalsScored,
      club: r.member.club,
    }))
    .sort((a, b) => {
      if (b.goalsScored !== a.goalsScored) return b.goalsScored - a.goalsScored;
      if (a.matchesPlayed !== b.matchesPlayed)
        return a.matchesPlayed - b.matchesPlayed;
      return a.lastName.localeCompare(b.lastName, 'fr');
    });
}

export type TopScorer = Awaited<ReturnType<typeof getTopScorersForCompetition>>[number];
