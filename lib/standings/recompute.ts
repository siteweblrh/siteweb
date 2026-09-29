import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * Recalcule le classement d'une compétition à partir de ses matchs terminés.
 *
 * ⚠️ Volontairement HORS d'un fichier 'use server'. Jusqu'au 2026-09-29, cette
 * fonction s'appelait `updateStandings` et était exportée depuis
 * lib/actions/competition.ts : toute fonction exportée d'un fichier
 * 'use server' est une route HTTP appelable par n'importe qui, et celle-ci
 * n'avait aucun contrôle d'accès.
 *
 * On ne pouvait pas simplement y ajouter `requireAdmin()` : `updateMatch`,
 * `createMatch` et `deleteMatch` l'appellent pour des RESPONSABLES DE CLUB
 * (saisie du score de leur match), qui ne sont pas admins. Le contrôle
 * d'accès appartient donc à chaque appelant, qui le fait déjà ; ce module,
 * lui, n'est importable que côté serveur et n'est exposé à aucune requête.
 */
export async function recomputeStandings(competitionId: string) {
  // Le classement ne tient compte que de la phase régulière (REGULAR).
  // Les matchs d'élimination (QUARTER → FINAL) sont affichés via le bracket
  // mais n'attribuent pas de points au classement.
  const finishedMatches = await prisma.match.findMany({
    where: { competitionId, status: "FINISHED", phase: "REGULAR" },
  });

  const clubs = await prisma.club.findMany({
    where: {
      OR: [
        { homeMatches: { some: { competitionId } } },
        { awayMatches: { some: { competitionId } } },
        { standings: { some: { competitionId } } },
      ],
    },
  });

  const statsMap = new Map<string, {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }>();

  clubs.forEach((club) => {
    statsMap.set(club.id, {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  });

  finishedMatches.forEach((match) => {
    // Un match de phase finale planifie sans participants connus ne pese pas
    // sur le classement : il n-a qu-une existence logistique.
    if (!match.homeClubId || !match.awayClubId) return;
    const homeStats = statsMap.get(match.homeClubId);
    const awayStats = statsMap.get(match.awayClubId);

    if (homeStats && awayStats) {
      homeStats.played++;
      awayStats.played++;
      homeStats.goalsFor += match.homeScore || 0;
      homeStats.goalsAgainst += match.awayScore || 0;
      awayStats.goalsFor += match.awayScore || 0;
      awayStats.goalsAgainst += match.homeScore || 0;

      if ((match.homeScore || 0) > (match.awayScore || 0)) {
        homeStats.wins++;
        homeStats.points += 3;
        awayStats.losses++;
      } else if ((match.homeScore || 0) < (match.awayScore || 0)) {
        awayStats.wins++;
        awayStats.points += 3;
        homeStats.losses++;
      } else {
        homeStats.draws++;
        homeStats.points += 1;
        awayStats.draws++;
        awayStats.points += 1;
      }
    }
  });

  const sortedStats = Array.from(statsMap.entries())
    .map(([clubId, stats]) => ({ clubId, ...stats }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const bGD = b.goalsFor - b.goalsAgainst;
      const aGD = a.goalsFor - a.goalsAgainst;
      if (bGD !== aGD) return bGD - aGD;
      return b.goalsFor - a.goalsFor;
    });

  await prisma.$transaction(
    sortedStats.map((stats, index) =>
      prisma.standing.upsert({
        where: {
          competitionId_clubId: {
            competitionId,
            clubId: stats.clubId,
          },
        },
        update: {
          rank: index + 1,
          played: stats.played,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          goalsFor: stats.goalsFor,
          goalsAgainst: stats.goalsAgainst,
          points: stats.points,
        },
        create: {
          competitionId,
          clubId: stats.clubId,
          rank: index + 1,
          played: stats.played,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          goalsFor: stats.goalsFor,
          goalsAgainst: stats.goalsAgainst,
          points: stats.points,
        },
      })
    )
  );
}
