import { prisma } from '@/lib/prisma';

/**
 * Stats joueur calculées automatiquement depuis les feuilles de match.
 *
 *   - goalsScored : count de Goal où Goal.scorerMemberId = member.id, sur les
 *                   matchs FINISHED uniquement.
 *   - matchesPlayed : nombre de matchs distincts FINISHED où le joueur apparaît
 *                     dans Goal, MatchCard, ou MatchInjury. Proxy faute de
 *                     "feuille de match" avec liste des présents — sous-estime
 *                     un joueur qui a joué sans rien faire de notable.
 *
 * Remplace l'agrégation manuelle de MemberCompetitionStats sur les cards
 * joueur (effectif dashboard + fiche publique). MemberCompetitionStats reste
 * exposé pour le top buteurs /classements et reste éditable côté admin si on
 * veut un override historique.
 */

export type MemberAutoStats = {
  goalsScored: number;
  matchesPlayed: number;
};

/**
 * Stats batch pour tous les members d'un club. Préférer cette fonction aux
 * appels individuels pour éviter les round-trips Neon (3 → 3 totaux au lieu
 * de 3×N).
 */
export async function getAutoMemberStatsForClub(
  clubId: string,
): Promise<Map<string, MemberAutoStats>> {
  const members = await prisma.member.findMany({
    where: { clubId },
    select: { id: true },
  });
  const memberIds = members.map((m) => m.id);
  if (memberIds.length === 0) return new Map();

  // 3 queries parallèles : buts marqués, cartons, blessures. Toutes filtrées
  // sur matchs FINISHED pour éviter de compter les matchs en cours ou annulés.
  const [goals, cards, injuries] = await Promise.all([
    prisma.goal.findMany({
      where: {
        scorerMemberId: { in: memberIds },
        match: { status: 'FINISHED' },
      },
      select: { scorerMemberId: true, matchId: true },
    }),
    prisma.matchCard.findMany({
      where: {
        memberId: { in: memberIds },
        match: { status: 'FINISHED' },
      },
      select: { memberId: true, matchId: true },
    }),
    prisma.matchInjury.findMany({
      where: {
        memberId: { in: memberIds },
        match: { status: 'FINISHED' },
      },
      select: { memberId: true, matchId: true },
    }),
  ]);

  // Buts : count direct par member.
  const goalsMap = new Map<string, number>();
  for (const g of goals) {
    if (!g.scorerMemberId) continue;
    goalsMap.set(g.scorerMemberId, (goalsMap.get(g.scorerMemberId) ?? 0) + 1);
  }

  // Matchs joués : union des matchIds par member sur les 3 sources.
  // On utilise Set<matchId> pour dédupliquer (un joueur qui marque ET reçoit
  // un carton sur le même match ne compte qu'une fois).
  const matchSets = new Map<string, Set<string>>();
  const addMatch = (memberId: string | null, matchId: string) => {
    if (!memberId) return;
    let set = matchSets.get(memberId);
    if (!set) { set = new Set(); matchSets.set(memberId, set); }
    set.add(matchId);
  };
  for (const g of goals) addMatch(g.scorerMemberId, g.matchId);
  for (const c of cards) addMatch(c.memberId, c.matchId);
  for (const i of injuries) addMatch(i.memberId, i.matchId);

  const result = new Map<string, MemberAutoStats>();
  for (const m of members) {
    result.set(m.id, {
      goalsScored: goalsMap.get(m.id) ?? 0,
      matchesPlayed: matchSets.get(m.id)?.size ?? 0,
    });
  }
  return result;
}
