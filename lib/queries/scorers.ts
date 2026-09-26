import { prisma } from '@/lib/prisma';
import { isYouthCategory } from './competition';
import { memberFullName } from '@/lib/utils/member-name';

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
  const allGoals = await prisma.goal.findMany({
    where: {
      scorerMemberId: { not: null },
      match: {
        status: 'FINISHED',
        competition: { mode, ...(season ? { season } : {}) },
      },
    },
    // `category` est sélectionnée pour écarter les compétitions jeunes juste
    // après — une jointure de plus dans la même requête, pas un aller-retour
    // supplémentaire.
    select: {
      scorerMemberId: true,
      matchId: true,
      match: { select: { competition: { select: { category: true } } } },
    },
  });

  // Les catégories jeunes sont EXCLUES, exactement comme dans getStandingsTop :
  // « les jeunes ont leur page dédiée ». Sans ce filtre les deux widgets voisins
  // du strip de la home se contredisaient — le podium montrait le championnat
  // sénior pendant que « Top buteur » affichait un U11. Constaté en préparant
  // la saisie du rassemblement du 26/09/2026 : 9 buts en U10-U12 suffisaient à
  // dépasser tous les buteurs séniors du gazon.
  const goals = allGoals.filter((g) => !isYouthCategory(g.match.competition.category));
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

/**
 * Classement des buteurs de TOUTES les compétitions jeunes d'une saison, en un
 * seul aller-retour, indexé par `competitionId`.
 *
 * Pourquoi une query dédiée plutôt que d'appeler `getTopScorersForCompetition`
 * une fois par catégorie : /jeunes affiche N compétitions sur la même page (4
 * en 2026-2027, une par catégorie × mode). La fonction par compétition part en
 * 5 requêtes ; la boucle aurait donc coûté 20 requêtes pour un écran, et ce
 * nombre grandit avec le catalogue de la ligue — exactement le motif que la
 * règle n°2 demande d'évaluer AVANT.
 *
 * Coût (règle n°2) :
 *   - Portée      : la page /jeunes uniquement. Aucun composant de Header ou de
 *                   Footer ne l'appelle, donc zéro requête sur les autres pages.
 *   - Fréquence   : consommée derrière `cachePublic` (1 h, tag `competitions`),
 *                   comme les trois autres lectures de la page. Un but saisi au
 *                   dashboard invalide le tag et la page se rafraîchit ; sinon
 *                   la requête ne part qu'au cache miss. Neon garde ses fenêtres
 *                   de silence.
 *   - Défaillance : aucune tentative de repli. Si Neon ne répond pas, l'erreur
 *                   remonte comme pour les classements de la même page — une
 *                   liste vide silencieuse laisserait croire qu'aucun jeune n'a
 *                   marqué.
 *
 * `matchesPlayed` est ici dérivé des seuls buts (pas des cartons ni des
 * blessures, contrairement à `getTopScorersForCompetition`) : il ne sert qu'à
 * départager les ex aequo et n'est pas affiché. C'est une borne basse assumée.
 */
export async function getYouthScorersByCompetition(
  season?: string,
  // Même plafond que getTopScorersForCompetition : assez haut pour qu'une
  // catégorie réelle ne soit pas tronquée (8 et 9 buteurs sur le rassemblement
  // du 26/09/2026), assez bas pour borner la page si une compétition gonfle.
  limitPerCompetition = 30,
) {
  const competitions = await prisma.competition.findMany({
    where: season ? { season } : undefined,
    select: { id: true, category: true },
  });
  const youthIds = competitions
    .filter((c) => isYouthCategory(c.category))
    .map((c) => c.id);
  if (youthIds.length === 0) return {};

  const goals = await prisma.goal.findMany({
    where: {
      scorerMemberId: { not: null },
      match: { competitionId: { in: youthIds }, status: 'FINISHED' },
    },
    select: {
      scorerMemberId: true,
      matchId: true,
      match: { select: { competitionId: true } },
    },
  });
  if (goals.length === 0) return {};

  // Agrégation en mémoire : compétition → joueur → { buts, matchs distincts }.
  const perCompetition = new Map<
    string,
    Map<string, { goals: number; matches: Set<string> }>
  >();
  for (const g of goals) {
    if (!g.scorerMemberId) continue;
    const competitionId = g.match.competitionId;
    let byMember = perCompetition.get(competitionId);
    if (!byMember) {
      byMember = new Map();
      perCompetition.set(competitionId, byMember);
    }
    let row = byMember.get(g.scorerMemberId);
    if (!row) {
      row = { goals: 0, matches: new Set() };
      byMember.set(g.scorerMemberId, row);
    }
    row.goals += 1;
    row.matches.add(g.matchId);
  }

  const memberIds = [
    ...new Set(goals.map((g) => g.scorerMemberId).filter((id): id is string => !!id)),
  ];
  const members = await prisma.member.findMany({
    where: { id: { in: memberIds }, kind: 'PLAYER' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jerseyNumber: true,
      photo: true,
      club: { select: { id: true, slug: true, shortCode: true, name: true, primaryColor: true } },
    },
  });
  const byId = new Map(members.map((m) => [m.id, m]));

  const result: Record<string, YouthScorerRow[]> = {};
  for (const [competitionId, byMember] of perCompetition) {
    const rows: YouthScorerRow[] = [];
    for (const [memberId, agg] of byMember) {
      const member = byId.get(memberId);
      // Un `Goal` peut pointer un COACH ou un membre supprimé entre-temps :
      // absent du findMany ci-dessus, on l'ignore plutôt que de rendre une
      // ligne sans nom.
      if (!member) continue;
      rows.push({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        jerseyNumber: member.jerseyNumber,
        photo: member.photo,
        club: member.club,
        goalsScored: agg.goals,
        matchesPlayed: agg.matches.size,
      });
    }
    // Même ordre que getTopScorersForCompetition : buts décroissants, puis
    // moins de matchs joués, puis nom — pour que les deux écrans ne présentent
    // jamais deux podiums différents à données égales.
    rows.sort((a, b) => {
      if (b.goalsScored !== a.goalsScored) return b.goalsScored - a.goalsScored;
      if (a.matchesPlayed !== b.matchesPlayed) return a.matchesPlayed - b.matchesPlayed;
      return memberFullName(a).localeCompare(memberFullName(b), 'fr');
    });
    result[competitionId] = rows.slice(0, limitPerCompetition);
  }
  return result;
}

export type YouthScorerRow = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  photo: string | null;
  club: {
    id: string;
    slug: string;
    shortCode: string | null;
    name: string;
    primaryColor: string | null;
  };
  goalsScored: number;
  matchesPlayed: number;
};

/**
 * Bloc « Championnat Jeunes » de la PAGE D'ACCUEIL : pour chaque compétition
 * jeune qui a réellement joué, son classement et son meilleur buteur — les
 * deux modes rendus en une seule fois.
 *
 * Pourquoi cette fonction plutôt que de réutiliser celles de /jeunes : la home
 * n'a besoin que du haut du tableau et d'UN buteur par catégorie, et elle est
 * rendue pour les deux disciplines à chaque régénération (`getHomeData` appelle
 * `getModeData` pour GAZON et SALLE). Découper par mode aurait donc doublé le
 * coût ; ici les deux modes sortent des mêmes trois requêtes et l'appelant
 * choisit ensuite.
 *
 * Coût (règle n°2) — c'est la page la plus visitée du site, donc :
 *   - Portée      : `/` et `/m`, une fois par RÉGÉNÉRATION, jamais par
 *                   visiteur. Les deux routes sont en ISR (`revalidate = 3600`)
 *                   et ne lisent aucun `searchParams`, donc leur HTML est
 *                   statique et servi depuis le cache Vercel.
 *   - Fréquence   : 3 requêtes ajoutées au `Promise.all` existant de
 *                   `getHomeData`, donc dans la MÊME fenêtre d'éveil Neon que
 *                   les requêtes déjà présentes — pas de réveil supplémentaire,
 *                   ce qui est la seule métrique qui compte (cf. règle n°2).
 *                   La fraîcheur vient de `revalidateMatch()`, pas du TTL.
 *   - Défaillance : l'erreur remonte comme pour le reste de la home. Un
 *                   `try/catch` muet afficherait un bloc « aucun classement »
 *                   alors que la base est en panne.
 *
 * `standings.played > 0` et pas seulement « a des lignes » : inscrire un club
 * crée déjà son `Standing` à zéro, et un podium de deux équipes à « 0 pt »
 * serait pire qu'un bloc absent (même critère que `getStandingsTop`).
 */
export async function getYouthHomeSummary(season?: string, standingsLimit = 4) {
  const competitions = await prisma.competition.findMany({
    where: {
      ...(season ? { season } : {}),
      format: { not: 'CUP' },
      standings: { some: { played: { gt: 0 } } },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      mode: true,
      season: true,
      standings: {
        where: { played: { gt: 0 } },
        orderBy: { rank: 'asc' },
        take: standingsLimit,
        select: {
          rank: true,
          played: true,
          wins: true,
          draws: true,
          losses: true,
          goalsFor: true,
          goalsAgainst: true,
          points: true,
          club: { select: { id: true, slug: true, shortCode: true, name: true } },
        },
      },
    },
  });

  const youth = competitions.filter((c) => isYouthCategory(c.category));
  const empty = { GAZON: [] as YouthHomeBlock[], SALLE: [] as YouthHomeBlock[] };
  if (youth.length === 0) return empty;

  const goals = await prisma.goal.findMany({
    where: {
      scorerMemberId: { not: null },
      match: { competitionId: { in: youth.map((c) => c.id) }, status: 'FINISHED' },
    },
    select: {
      scorerMemberId: true,
      matchId: true,
      match: { select: { competitionId: true } },
    },
  });

  const perCompetition = new Map<string, Map<string, { goals: number; matches: Set<string> }>>();
  for (const g of goals) {
    if (!g.scorerMemberId) continue;
    let byMember = perCompetition.get(g.match.competitionId);
    if (!byMember) {
      byMember = new Map();
      perCompetition.set(g.match.competitionId, byMember);
    }
    let row = byMember.get(g.scorerMemberId);
    if (!row) {
      row = { goals: 0, matches: new Set() };
      byMember.set(g.scorerMemberId, row);
    }
    row.goals += 1;
    row.matches.add(g.matchId);
  }

  const memberIds = [
    ...new Set(goals.map((g) => g.scorerMemberId).filter((id): id is string => !!id)),
  ];
  const members = memberIds.length
    ? await prisma.member.findMany({
        where: { id: { in: memberIds }, kind: 'PLAYER' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          club: { select: { shortCode: true, name: true } },
        },
      })
    : [];
  const byId = new Map(members.map((m) => [m.id, m]));

  const result = { GAZON: [] as YouthHomeBlock[], SALLE: [] as YouthHomeBlock[] };
  for (const c of youth) {
    let best: YouthHomeBlock['topScorer'] = null;
    const byMember = perCompetition.get(c.id);
    if (byMember) {
      const ranked = [...byMember.entries()]
        .map(([memberId, agg]) => ({ member: byId.get(memberId), ...agg }))
        .filter((r) => r.member)
        // Même départage que les deux autres classements de buteurs, pour que
        // la home et /jeunes ne désignent jamais deux joueurs différents.
        .sort((a, b) => {
          if (b.goals !== a.goals) return b.goals - a.goals;
          if (a.matches.size !== b.matches.size) return a.matches.size - b.matches.size;
          return memberFullName(a.member!).localeCompare(memberFullName(b.member!), 'fr');
        });
      const top = ranked[0];
      if (top) {
        best = {
          id: top.member!.id,
          firstName: top.member!.firstName,
          lastName: top.member!.lastName,
          clubLabel: top.member!.club.shortCode ?? top.member!.club.name,
          goals: top.goals,
        };
      }
    }
    result[c.mode].push({
      id: c.id,
      slug: c.slug,
      name: c.name,
      category: c.category,
      mode: c.mode,
      season: c.season,
      standings: c.standings,
      topScorer: best,
    });
  }
  return result;
}

export type YouthHomeBlock = {
  id: string;
  slug: string;
  name: string;
  category: string;
  mode: 'GAZON' | 'SALLE';
  season: string;
  standings: {
    rank: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
    club: { id: string; slug: string; shortCode: string | null; name: string };
  }[];
  topScorer: {
    id: string;
    firstName: string;
    lastName: string;
    clubLabel: string;
    goals: number;
  } | null;
};
