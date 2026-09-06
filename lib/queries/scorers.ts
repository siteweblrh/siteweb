import { prisma } from '@/lib/prisma';

/**
 * Top buteurs cross-clubs pour une compétition donnée.
 *
 * Source de vérité : les rangées `Goal` des matchs FINISHED de la compétition.
 * Avant, cette query lisait `MemberCompetitionStats.goalsScored`, alimenté à la
 * main via /dashboard/team. Conséquence observée : on pouvait saisir la feuille
 * de match complète (buts, buteurs, cartons) et le classement des buteurs
 * restait vide — les deux écritures n'étaient reliées par rien.
 *
 * La dérivation reprend exactement les règles de `lib/queries/memberStats.ts`,
 * qui alimente déjà les cards joueur et les fiches club publiques. Les deux
 * écrans affichent donc désormais le même chiffre pour un même joueur.
 *
 *   - goalsScored   : nombre de `Goal` où scorerMemberId = member.id.
 *   - matchesPlayed : nombre de matchs DISTINCTS où le joueur a un fait de jeu
 *                     enregistré (but, carton ou blessure). C'est une BORNE
 *                     BASSE : sans feuille de composition en base, on ne peut
 *                     pas savoir qu'un joueur a joué sans rien faire de notable.
 *
 * `MemberCompetitionStats` reste lu en complément : une rangée saisie à la main
 * pour un joueur qui n'a aucun `Goal` sur la compétition (saisie historique,
 * reprise d'archives) continue d'apparaître. Les buts saisis via les feuilles
 * priment sur la valeur manuelle du même joueur.
 *
 * Coût (règle n°2) — portée : /classements et /dashboard/standings uniquement.
 * Fréquence : /classements passe par `cachePublic` (1 h, tag `competitions`,
 * invalidé par les actions sur les buts), donc ces requêtes ne partent qu'au
 * cache miss. Défaillance : Neon muet = erreur visible, pas de dégradation.
 *
 * Le compte de requêtes monte de 1 à 5 par compétition (buts, cartons,
 * blessures, stats manuelles en parallèle, puis les joueurs). Assumé : Neon
 * facture le temps d'éveil du compute, pas le nombre de requêtes, et les
 * quatre premières partent dans le même `Promise.all` — donc dans la même
 * fenêtre d'éveil qu'auparavant. Si le nombre de compétitions par mode
 * dépassait la dizaine, il faudrait une variante batch prenant N ids.
 */
export async function getTopScorersForCompetition(
  competitionId: string,
  limit = 30,
) {
  const inCompetition = { match: { competitionId, status: 'FINISHED' as const } };

  const [goals, cards, injuries, manual] = await Promise.all([
    prisma.goal.findMany({
      where: { scorerMemberId: { not: null }, ...inCompetition },
      select: { scorerMemberId: true, matchId: true },
    }),
    prisma.matchCard.findMany({
      where: { memberId: { not: null }, ...inCompetition },
      select: { memberId: true, matchId: true },
    }),
    prisma.matchInjury.findMany({
      where: { memberId: { not: null }, ...inCompetition },
      select: { memberId: true, matchId: true },
    }),
    prisma.memberCompetitionStats.findMany({
      where: { competitionId, goalsScored: { gt: 0 } },
      select: { memberId: true, goalsScored: true, matchesPlayed: true },
    }),
  ]);

  const goalsByMember = new Map<string, number>();
  for (const g of goals) {
    if (!g.scorerMemberId) continue;
    goalsByMember.set(g.scorerMemberId, (goalsByMember.get(g.scorerMemberId) ?? 0) + 1);
  }

  // Matchs joués : union des matchIds sur les 3 sources, dédupliquée — un
  // joueur qui marque ET prend un carton sur le même match ne compte qu'une
  // fois. Même logique que getAutoMemberStatsForClub().
  const matchesByMember = new Map<string, Set<string>>();
  const addMatch = (memberId: string | null, matchId: string) => {
    if (!memberId) return;
    let set = matchesByMember.get(memberId);
    if (!set) { set = new Set(); matchesByMember.set(memberId, set); }
    set.add(matchId);
  };
  for (const g of goals) addMatch(g.scorerMemberId, g.matchId);
  for (const c of cards) addMatch(c.memberId, c.matchId);
  for (const i of injuries) addMatch(i.memberId, i.matchId);

  // Repli manuel : uniquement pour les joueurs absents des feuilles de match.
  const manualByMember = new Map(manual.map((m) => [m.memberId, m]));
  const totals = new Map<string, { goalsScored: number; matchesPlayed: number }>();
  for (const [memberId, goalsScored] of goalsByMember) {
    totals.set(memberId, {
      goalsScored,
      matchesPlayed: matchesByMember.get(memberId)?.size ?? 0,
    });
  }
  for (const [memberId, row] of manualByMember) {
    if (totals.has(memberId)) continue;
    totals.set(memberId, { goalsScored: row.goalsScored, matchesPlayed: row.matchesPlayed });
  }
  if (totals.size === 0) return [];

  const members = await prisma.member.findMany({
    where: { id: { in: Array.from(totals.keys()) }, kind: 'PLAYER' },
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
  });

  // Tri : buts décroissants, puis moins de matchs joués, puis nom. Identique à
  // l'ancien comportement pour ne pas déplacer un podium à iso-données.
  return members
    .map((m) => {
      const t = totals.get(m.id)!;
      return {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        position: m.position,
        jerseyNumber: m.jerseyNumber,
        photo: m.photo,
        category: m.category,
        isFeatured: m.isFeatured,
        featuredHeadline: m.featuredHeadline,
        matchesPlayed: t.matchesPlayed,
        goalsScored: t.goalsScored,
        club: m.club,
      };
    })
    .sort((a, b) => {
      if (b.goalsScored !== a.goalsScored) return b.goalsScored - a.goalsScored;
      if (a.matchesPlayed !== b.matchesPlayed)
        return a.matchesPlayed - b.matchesPlayed;
      return a.lastName.localeCompare(b.lastName, 'fr');
    })
    .slice(0, limit);
}

export type TopScorer = Awaited<ReturnType<typeof getTopScorersForCompetition>>[number];

/**
 * Meilleur buteur d'une discipline, agrégé sur ses compétitions. Utilisé pour
 * le widget hero d'accueil — pas pour un classement officiel.
 *
 * `season` scope l'agrégation : sans elle, les buts de toutes les saisons
 * s'additionnaient et la home présentait un cumul historique comme s'il
 * s'agissait du meilleur buteur de la saison en cours.
 *
 * Dérivé des `Goal` comme getTopScorersForCompetition() — les deux lisaient
 * `MemberCompetitionStats`, une table alimentée uniquement à la main. Les
 * laisser diverger donnerait une home vide pendant que /classements affiche
 * un podium.
 */
export async function getTopScorerForMode(mode: 'GAZON' | 'SALLE', season?: string) {
  const goals = await prisma.goal.findMany({
    where: {
      scorerMemberId: { not: null },
      match: {
        status: 'FINISHED',
        competition: { mode, ...(season ? { season } : {}) },
      },
    },
    select: { scorerMemberId: true, matchId: true },
  });
  if (goals.length === 0) return null;

  const goalsByMember = new Map<string, number>();
  const matchesByMember = new Map<string, Set<string>>();
  for (const g of goals) {
    if (!g.scorerMemberId) continue;
    goalsByMember.set(g.scorerMemberId, (goalsByMember.get(g.scorerMemberId) ?? 0) + 1);
    let set = matchesByMember.get(g.scorerMemberId);
    if (!set) { set = new Set(); matchesByMember.set(g.scorerMemberId, set); }
    set.add(g.matchId);
  }

  const members = await prisma.member.findMany({
    where: { id: { in: Array.from(goalsByMember.keys()) }, kind: 'PLAYER' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      club: { select: { shortCode: true, name: true, primaryColor: true } },
    },
  });

  const sorted = members
    .map((member) => ({
      goals: goalsByMember.get(member.id) ?? 0,
      // Borne basse : seuls les matchs où le joueur a marqué. Le widget ne
      // montre pas ce chiffre, il ne sert qu'à départager les ex aequo.
      matches: matchesByMember.get(member.id)?.size ?? 0,
      member,
    }))
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (a.matches !== b.matches) return a.matches - b.matches;
      return a.member.lastName.localeCompare(b.member.lastName, 'fr');
    });
  return sorted[0] ?? null;
}
