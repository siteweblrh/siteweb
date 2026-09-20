/**
 * Championnat de la Réunion Salle 2026-2027 — saisie de la journée J02
 * (dimanche 20 septembre 2026).
 *
 * Même contrat que scripts/salle-2026-j01.mjs :
 *   - idempotent : les faits de jeu des matchs COUVERTS sont purgés puis
 *     réécrits, le score et le statut sont réaffirmés ;
 *   - ne touche QUE les matchs listés dans MATCHES. Les rencontres de la
 *     journée pas encore saisies sont laissées strictement intactes ;
 *   - ne charge PAS .env : on lui passe DATABASE_URL explicitement.
 *
 *   # dry-run (affiche le plan, n'écrit rien)
 *   node scripts/salle-2026-j02.mjs --dry-run
 *   # dev
 *   node scripts/salle-2026-j02.mjs
 *   # prod
 *   DATABASE_URL=$(grep -oE '^DATABASE_URL=.*' .env.neon | sed 's/^DATABASE_URL=//; s/"//g') \
 *     node scripts/salle-2026-j02.mjs
 *
 * ⚠️ Écrire en base ne rafraîchit PAS les pages publiques : le cache de
 * données (lib/cache/public.ts) n'est invalidé que par revalidatePublic(),
 * appelé depuis les server actions. Après ce script, soit on attend la durée
 * de filet (1 h), soit on rouvre le match au dashboard et on le ré-enregistre.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';

// Même choix d'adaptateur que lib/prisma.ts : c'est l'hôte de l'URL qui décide,
// pas NODE_ENV. Le driver Neon parle WebSocket et ne sait pas joindre le
// Postgres local de dev.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL manquant — cf. en-tête du script.');
const isNeon = new URL(connectionString).hostname.endsWith('.neon.tech');
const prisma = new PrismaClient({
  adapter: isNeon ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString }),
});
const DRY = process.argv.includes('--dry-run');

const COMPETITION = { name: 'Championnat de la Réunion Salle', season: '2026-2027' };
const MATCHDAY = 2;

/**
 * Matchs de J02 couverts par ce script, avec leur score officiel.
 *
 * Les 3 autres rencontres de la journée (HCP-USPG, HCP-Entente, USPG-HCO) ne
 * sont pas encore saisies : on les ajoutera ici au fur et à mesure. Tant
 * qu'une clé n'est pas présente, le match n'est ni touché ni purgé.
 */
const MATCHES = {
  // 09:00 — Entente SDHC/HHS/AZO 0-8 HCO
  m1: { id: 'cmsab88dd000004l125sbehio', home: 0, away: 8 },
};

/**
 * Buteurs, par match. `member` = licence FFH (clé unique en base), résolue
 * plus bas ; `member: null` = but sans buteur identifié.
 *
 * La minute reste nulle : les feuilles FFH de la salle ne portent pas le
 * chrono (cf. Goal.minute, nullable à dessein).
 */
const GOALS = [
  // MATCH 1 — Entente 0-8 HCO. Aucun buteur côté Entente (0 but).
  ...Array(4).fill({ match: 'm1', club: 'HCO', member: '00031970' }), // Fabien Paulo (#9)
  ...Array(2).fill({ match: 'm1', club: 'HCO', member: '00027652' }), // Julien Michel (#2)
  { match: 'm1', club: 'HCO', member: '00018568' }, // Jean Charles Hoarau (#10)
  { match: 'm1', club: 'HCO', member: '00014686' }, // Mickael Ranaivoson (#5)
];

/** Cartons et blessures : rien de relevé sur ce match. */
const CARDS = [];
const INJURIES = [];

async function main() {
  const log = (...a) => console.log(DRY ? '[dry-run]' : '[write]  ', ...a);

  /* ─────────── 0. Résolution des entités ─────────── */

  const competition = await prisma.competition.findFirst({
    where: COMPETITION,
    select: { id: true, name: true, season: true },
  });
  if (!competition) throw new Error(`Compétition introuvable : ${COMPETITION.name} ${COMPETITION.season}`);

  const bySlug = Object.fromEntries(
    (await prisma.club.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
  );
  const clubIds = {
    HCO: bySlug['hco'],
    HCP: bySlug['hcp'],
    USPG: bySlug['uspg'],
    ENTENTE: bySlug['entente-sdhc-hhs-azo'],
  };
  for (const [key, id] of Object.entries(clubIds)) {
    if (!id) throw new Error(`Club introuvable pour la clé ${key}`);
  }

  // Garde-fou : les matchs visés appartiennent bien à cette compétition et à
  // cette journée. Un ID recopié de travers ne doit pas écraser un autre match.
  const rows = await prisma.match.findMany({
    where: { id: { in: Object.values(MATCHES).map((m) => m.id) } },
    select: { id: true, competitionId: true, matchday: true, homeClubId: true, awayClubId: true },
  });
  if (rows.length !== Object.keys(MATCHES).length) {
    throw new Error('Un des IDs de MATCHES est introuvable en base.');
  }
  for (const r of rows) {
    if (r.competitionId !== competition.id) {
      throw new Error(`Le match ${r.id} n'appartient pas à « ${competition.name} ${competition.season} ».`);
    }
    if (r.matchday !== MATCHDAY) {
      throw new Error(`Le match ${r.id} est de la journée ${r.matchday}, pas J${MATCHDAY}.`);
    }
  }

  // Joueurs : résolus par licence, jamais par nom.
  const licenses = [...new Set([...GOALS, ...CARDS, ...INJURIES].map((e) => e.member).filter(Boolean))];
  const members = {};
  for (const license of licenses) {
    const row = await prisma.member.findUnique({
      where: { license },
      select: { id: true, firstName: true, lastName: true, jerseyNumber: true, clubId: true },
    });
    if (!row) throw new Error(`Membre introuvable pour la licence ${license}`);
    members[license] = row;
  }
  const M = (license) => members[license].id;
  log(
    `${licenses.length} joueurs résolus :`,
    licenses.map((l) => `${members[l].firstName} ${members[l].lastName} (#${members[l].jerseyNumber})`).join(', '),
  );

  /* ─────────── 1. Cohérence buts listés / score officiel ─────────── */
  // Un écart ici veut dire qu'on s'apprête à publier un classement de buteurs
  // qui contredit le score affiché. On préfère s'arrêter.

  for (const [key, m] of Object.entries(MATCHES)) {
    const row = rows.find((r) => r.id === m.id);
    const counted = { home: 0, away: 0 };
    for (const g of GOALS.filter((g) => g.match === key)) {
      if (clubIds[g.club] === row.homeClubId) counted.home++;
      else if (clubIds[g.club] === row.awayClubId) counted.away++;
      else throw new Error(`But attribué à un club qui ne joue pas le match ${key} (${g.club}).`);
    }
    if (counted.home !== m.home || counted.away !== m.away) {
      throw new Error(
        `Match ${key} : ${counted.home}-${counted.away} buts listés pour un score de ${m.home}-${m.away}.`,
      );
    }
    log(`match ${key} : score ${m.home}-${m.away}, ${counted.home + counted.away} buts listés ✓`);
  }

  /* ─────────── 2. Écriture ─────────── */

  const matchIds = Object.values(MATCHES).map((m) => m.id);

  if (!DRY) {
    await prisma.$transaction([
      // Score + statut réaffirmés : sans FINISHED, le match sort du classement
      // sans lever d'erreur (cf. l'incident du match 4 de J01).
      ...Object.values(MATCHES).map((m) =>
        prisma.match.update({
          where: { id: m.id },
          data: { homeScore: m.home, awayScore: m.away, status: 'FINISHED' },
        }),
      ),
      // Purge d'abord : rend le script rejouable.
      prisma.goal.deleteMany({ where: { matchId: { in: matchIds } } }),
      prisma.matchCard.deleteMany({ where: { matchId: { in: matchIds } } }),
      prisma.matchInjury.deleteMany({ where: { matchId: { in: matchIds } } }),
      prisma.goal.createMany({
        data: GOALS.map((g) => ({
          matchId: MATCHES[g.match].id,
          scoringClubId: clubIds[g.club],
          scorerMemberId: g.member ? M(g.member) : null,
          scorerName: g.name ?? null,
          minute: g.minute ?? null,
        })),
      }),
      prisma.matchCard.createMany({
        data: CARDS.map((c) => ({
          matchId: MATCHES[c.match].id,
          clubId: clubIds[c.club],
          memberId: M(c.member),
          kind: c.kind,
          minute: c.minute ?? null,
        })),
      }),
      prisma.matchInjury.createMany({
        data: INJURIES.map((i) => ({
          matchId: MATCHES[i.match].id,
          clubId: clubIds[i.club],
          memberId: M(i.member),
          zone: i.zone,
          notes: i.notes ?? null,
          severity: i.severity,
          minute: i.minute ?? null,
        })),
      }),
    ]);
  }
  log(`${GOALS.length} buts, ${CARDS.length} cartons, ${INJURIES.length} blessures`);

  /* ─────────── 3. Recalcul du classement ─────────── */
  // Réplique de updateStandings() (lib/actions/competition.ts) : la server
  // action passe par requireAdmin() et n'est pas appelable hors requête HTTP.

  if (!DRY) await recomputeStandings(competition.id);
  log('classement recalculé');

  const table = await prisma.standing.findMany({
    where: { competitionId: competition.id },
    orderBy: { rank: 'asc' },
    select: {
      rank: true, played: true, wins: true, draws: true, losses: true,
      goalsFor: true, goalsAgainst: true, points: true,
      club: { select: { name: true } },
    },
  });
  console.table(table.map((r) => ({
    R: r.rank, Club: r.club.name, J: r.played, V: r.wins, N: r.draws, D: r.losses,
    BP: r.goalsFor, BC: r.goalsAgainst, Pts: r.points,
  })));

  // Classement des buteurs, dérivé des rangées Goal (project_stats_joueurs).
  const scorers = await prisma.goal.groupBy({
    by: ['scorerMemberId'],
    where: { match: { competitionId: competition.id }, scorerMemberId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { scorerMemberId: 'desc' } },
    take: 10,
  });
  const scorerRows = await prisma.member.findMany({
    where: { id: { in: scorers.map((s) => s.scorerMemberId) } },
    select: { id: true, firstName: true, lastName: true, club: { select: { shortCode: true } } },
  });
  console.table(scorers.map((s, i) => {
    const m = scorerRows.find((r) => r.id === s.scorerMemberId);
    return { R: i + 1, Joueur: `${m.firstName} ${m.lastName}`, Club: m.club.shortCode, Buts: s._count._all };
  }));
}

/** Copie fidèle de updateStandings() : phase REGULAR + statut FINISHED. */
async function recomputeStandings(competitionId) {
  const finished = await prisma.match.findMany({
    where: { competitionId, status: 'FINISHED', phase: 'REGULAR' },
  });
  const clubs = await prisma.club.findMany({
    where: {
      OR: [
        { homeMatches: { some: { competitionId } } },
        { awayMatches: { some: { competitionId } } },
        { standings: { some: { competitionId } } },
      ],
    },
    select: { id: true },
  });

  const stats = new Map(clubs.map((c) => [c.id, {
    played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
  }]));

  for (const m of finished) {
    if (!m.homeClubId || !m.awayClubId) continue;
    const h = stats.get(m.homeClubId);
    const a = stats.get(m.awayClubId);
    if (!h || !a) continue;
    const hs = m.homeScore || 0;
    const as = m.awayScore || 0;
    h.played++; a.played++;
    h.goalsFor += hs; h.goalsAgainst += as;
    a.goalsFor += as; a.goalsAgainst += hs;
    if (hs > as) { h.wins++; h.points += 3; a.losses++; }
    else if (hs < as) { a.wins++; a.points += 3; h.losses++; }
    else { h.draws++; h.points++; a.draws++; a.points++; }
  }

  const sorted = Array.from(stats.entries())
    .map(([clubId, s]) => ({ clubId, ...s }))
    .sort((x, y) => {
      if (y.points !== x.points) return y.points - x.points;
      const yd = y.goalsFor - y.goalsAgainst;
      const xd = x.goalsFor - x.goalsAgainst;
      if (yd !== xd) return yd - xd;
      return y.goalsFor - x.goalsFor;
    });

  await prisma.$transaction(
    sorted.map((s, i) =>
      prisma.standing.upsert({
        where: { competitionId_clubId: { competitionId, clubId: s.clubId } },
        update: { rank: i + 1, played: s.played, wins: s.wins, draws: s.draws, losses: s.losses, goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst, points: s.points },
        create: { competitionId, clubId: s.clubId, rank: i + 1, played: s.played, wins: s.wins, draws: s.draws, losses: s.losses, goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst, points: s.points },
      }),
    ),
  );
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
