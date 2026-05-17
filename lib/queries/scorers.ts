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

/**
 * Top buteur d'un mode (toutes compétitions confondues du mode). Utilisé pour
 * le widget hero d'accueil — pas pour un classement officiel.
 */
export async function getTopScorerForMode(mode: 'GAZON' | 'SALLE') {
  const rows = await prisma.memberCompetitionStats.findMany({
    where: {
      goalsScored: { gt: 0 },
      member: { kind: 'PLAYER' },
      competition: { mode },
    },
    select: {
      goalsScored: true,
      matchesPlayed: true,
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          club: { select: { shortCode: true, name: true, primaryColor: true } },
        },
      },
    },
  });
  if (rows.length === 0) return null;

  // Agrège par joueur si plusieurs compétitions ; sinon prend tel quel.
  const byMember = new Map<string, { goals: number; matches: number; member: typeof rows[number]['member'] }>();
  for (const r of rows) {
    const cur = byMember.get(r.member.id);
    if (cur) {
      cur.goals += r.goalsScored;
      cur.matches += r.matchesPlayed;
    } else {
      byMember.set(r.member.id, {
        goals: r.goalsScored,
        matches: r.matchesPlayed,
        member: r.member,
      });
    }
  }
  const sorted = Array.from(byMember.values()).sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return a.matches - b.matches;
  });
  return sorted[0] ?? null;
}
