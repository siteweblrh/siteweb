/**
 * Championnat de la Réunion Salle 2026-2027 — mise en place de l'entente
 * Saint-Denis et saisie de la journée J01.
 *
 * Idempotent : relançable sans doublonner. Les clubs et membres sont upsertés
 * sur leur clé unique (slug / licence) ; les événements des 4 matchs de J01
 * sont purgés puis réécrits.
 *
 * Cible explicite : ce script ne charge PAS .env. On lui passe DATABASE_URL.
 *
 *   # dev
 *   node scripts/salle-2026-j01.mjs
 *   # prod
 *   DATABASE_URL=$(grep -oE '^DATABASE_URL=.*' .env.neon | sed 's/^DATABASE_URL=//; s/"//g') \
 *     node scripts/salle-2026-j01.mjs
 *
 * Passer --dry-run pour n'afficher que le plan sans rien écrire.
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

/** Les 4 rencontres de J01, dans l'ordre chronologique des feuilles FFH. */
const MATCH_IDS = {
  m1: 'cmsa0va84000004jwiz18iotb', // 09:00 SDHC 1-7 HCP
  m2: 'cmsa0vadp000104jwnc4801t7', // 10:00 HCO  3-8 USPG (feuille #201153)
  m3: 'cmsa0vaiz000204jwmg0h985f', // 11:00 HCO  6-5 HCP  (feuille #201154)
  m4: 'cmsa0vao9000304jw62agpb4b', // 12:00 USPG 5-1 SDHC (feuille #201155)
};

/**
 * Joueurs à créer, par club, avec leur licence FFH (clé unique en base).
 *
 * ⚠️ LEDOUX et LEBEAU : la feuille de match ne portait pas leur licence. On
 * leur pose une licence provisoire préfixée PROV- pour qu'ils apparaissent au
 * classement des buteurs (LEDOUX est co-meilleur buteur avec 3 buts). À
 * corriger dans /dashboard/team dès que la vraie licence est connue.
 */
const ROSTER = {
  HCP: [
    { license: '00005559', firstName: 'Cedric', lastName: 'Hoarau', jerseyNumber: 11 },
    { license: '00083241', firstName: 'Anthony', lastName: 'Rebeca', jerseyNumber: 19 },
    { license: '00004309', firstName: 'Jean Yves', lastName: 'Filo', jerseyNumber: 22 },
    { license: 'PROV-HCP-LEDOUX-M', firstName: 'Mathieu', lastName: 'Ledoux', jerseyNumber: null },
    { license: 'PROV-HCP-LEBEAU-L', firstName: 'Louis', lastName: 'Lebeau', jerseyNumber: null },
  ],
  USPG: [
    { license: '00025580', firstName: 'Johannick', lastName: 'Futol', jerseyNumber: 9 },
    { license: '00091868', firstName: 'Lucas', lastName: 'Dubois', jerseyNumber: 22 },
    { license: '00026271', firstName: 'Deva', lastName: 'Maunier', jerseyNumber: 8 },
    { license: '00011001', firstName: 'Bertrand', lastName: 'Vidot', jerseyNumber: 81 },
    { license: '00065107', firstName: 'Quentin', lastName: 'Celestin', jerseyNumber: 1 },
  ],
  SDHC: [
    { license: '00032109', firstName: 'Alexandre', lastName: 'Orange', jerseyNumber: 11 },
  ],
};

/**
 * Corrections de numéros de maillot sur des joueurs DÉJÀ en base, relevées sur
 * les feuilles de match. Appliquées par licence, jamais par nom.
 *
 * Thomas Saminadin et Julien Michel portaient tous les deux le 2 en base ; le
 * 2 est à Julien Michel, Thomas Saminadin porte le 11 (confirmé par la ligue
 * le 2026-09-06).
 *
 * Les deux collisions que ça créait ont été arbitrées par la ligue le même
 * jour : Ranaivoson libère le 11 pour le 5, Pourrier libère le 13 pour le 3
 * (seul numéro libre sous 14 une fois les déplacements faits ; le 14 est à
 * Pierre-Henry Siva et devait être évité).
 *
 * ⚠️ `jerseyNumber` n'a AUCUNE contrainte d'unicité par club : un doublon ne
 * lève pas d'erreur, il faut le repérer à l'œil. Il en reste un, antérieur et
 * non arbitré — Michel Julie et René-Paul Fontaine portent tous deux le 0.
 */
const JERSEY_FIXES = [
  { license: '00045759', jerseyNumber: 11 }, // Thomas Saminadin (HCO), était 2
  { license: '00027652', jerseyNumber: 2 },  // Julien Michel (HCO), garde le 2
  { license: '00014686', jerseyNumber: 5 },  // Mickael Ranaivoson (HCO), était 11
  { license: '00015805', jerseyNumber: 3 },  // Teddy Pourrier (HCO), était 13
];

async function main() {
  const log = (...a) => console.log(DRY ? '[dry-run]' : '[write]  ', ...a);

  /* ─────────── 0. Résolution des entités existantes ─────────── */

  const competition = await prisma.competition.findFirst({
    where: COMPETITION,
    select: { id: true, name: true, season: true },
  });
  if (!competition) throw new Error(`Compétition introuvable : ${COMPETITION.name} ${COMPETITION.season}`);

  const clubBySlug = Object.fromEntries(
    (await prisma.club.findMany({ select: { id: true, slug: true, shortCode: true, name: true } }))
      .map((c) => [c.slug, c]),
  );
  const need = (slug) => {
    const c = clubBySlug[slug];
    if (!c) throw new Error(`Club introuvable : ${slug}`);
    return c;
  };
  const SDHC = need('sdhc');
  const HHS = need('hhs');
  const HCO = need('hco');
  const HCP = need('hcp');
  const USPG = need('uspg');

  /* ─────────── 1. Association Zarlors de l'Ouest ─────────── */

  const azo = DRY
    ? { id: '<AZO>', name: 'Association Zarlors de l’Ouest' }
    : await prisma.club.upsert({
        where: { slug: 'zarlors-ouest' },
        update: {},
        create: {
          slug: 'zarlors-ouest',
          shortCode: 'AZO',
          name: 'Association Zarlors de l’Ouest',
          city: 'Saint-Paul',
          kind: 'STANDALONE',
        },
        select: { id: true, name: true },
      });
  log('club AZO :', azo.name, azo.id);

  /* ─────────── 2. Entente SDHC / HHS / AZO ─────────── */

  const entente = DRY
    ? { id: '<ENTENTE>', name: 'Entente SDHC / HHS / AZO' }
    : await prisma.club.upsert({
        where: { slug: 'entente-sdhc-hhs-azo' },
        update: {
          parentClubs: { set: [{ id: SDHC.id }, { id: HHS.id }, { id: azo.id }] },
        },
        create: {
          slug: 'entente-sdhc-hhs-azo',
          shortCode: 'SDHC_HHS_AZO',
          name: 'Entente SDHC / HHS / AZO',
          // Saint-Denis reste la commune d'ancrage : le SDHC est le club porteur
          // et les matchs salle se jouent sur son bassin. Sert au placement sur
          // la carte /clubs.
          city: 'Saint-Denis',
          kind: 'ENTENTE',
          parentClubs: { connect: [{ id: SDHC.id }, { id: HHS.id }, { id: azo.id }] },
        },
        select: { id: true, name: true },
      });
  log('entente :', entente.name, entente.id);

  /* ─────────── 3. Bascule SDHC → entente sur CETTE compétition ─────────── */
  // Portée volontairement limitée au championnat. La Coupe de la Ligue Salle,
  // où le SDHC est aussi engagé, n'est PAS touchée.

  if (!DRY) {
    await prisma.$transaction([
      prisma.match.updateMany({
        where: { competitionId: competition.id, homeClubId: SDHC.id },
        data: { homeClubId: entente.id },
      }),
      prisma.match.updateMany({
        where: { competitionId: competition.id, awayClubId: SDHC.id },
        data: { awayClubId: entente.id },
      }),
      prisma.match.updateMany({
        where: { competitionId: competition.id, organizerClubId: SDHC.id },
        data: { organizerClubId: entente.id },
      }),
      // Créneaux du calendrier provisoire, scopés à cette compétition.
      prisma.draftSlot.updateMany({
        where: { competitionId: competition.id, plannedHomeClubId: SDHC.id },
        data: { plannedHomeClubId: entente.id },
      }),
      prisma.draftSlot.updateMany({
        where: { competitionId: competition.id, plannedAwayClubId: SDHC.id },
        data: { plannedAwayClubId: entente.id },
      }),
      // Engagement + rangée de classement : @@unique([competitionId, clubId])
      // rend un updateMany sûr tant que l'entente n'y est pas déjà.
      prisma.competitionEntry.updateMany({
        where: { competitionId: competition.id, clubId: SDHC.id },
        data: { clubId: entente.id },
      }),
      prisma.standing.updateMany({
        where: { competitionId: competition.id, clubId: SDHC.id },
        data: { clubId: entente.id },
      }),
    ]);
  }
  log(`bascule SDHC → entente sur « ${competition.name} ${competition.season} »`);

  /* ─────────── 4. Le match 4 avait un score mais pas le statut ─────────── */
  // USPG 5-1 SDHC : les deux scores étaient saisis, le statut était resté
  // SCHEDULED. updateStandings() ne compte que les matchs FINISHED — ce match
  // manquait donc au classement sans qu'aucune erreur ne soit levée.

  if (!DRY) {
    await prisma.match.update({
      where: { id: MATCH_IDS.m4 },
      data: { status: 'FINISHED' },
    });
  }
  log('match 4 (USPG 5-1 entente) → FINISHED');

  /* ─────────── 5. Effectifs manquants ─────────── */

  const clubForRoster = { HCP: HCP.id, USPG: USPG.id, SDHC: SDHC.id };
  const members = {};
  for (const [key, players] of Object.entries(ROSTER)) {
    for (const p of players) {
      const row = DRY
        ? { id: `<${p.lastName}>`, ...p }
        : await prisma.member.upsert({
            where: { license: p.license },
            update: { jerseyNumber: p.jerseyNumber },
            create: {
              license: p.license,
              firstName: p.firstName,
              lastName: p.lastName,
              jerseyNumber: p.jerseyNumber,
              // Les joueurs restent licenciés de leur club réel, pas de
              // l'entente : c'est le club qui délivre la licence.
              clubId: clubForRoster[key],
              kind: 'PLAYER',
              category: 'SENIOR',
            },
            select: { id: true, firstName: true, lastName: true },
          });
      members[p.license] = row;
    }
  }
  // Joueurs HCO déjà en base : résolus par licence.
  for (const lic of ['00045759', '00018568', '00031970', '00058246', '00027652']) {
    const row = await prisma.member.findUnique({
      where: { license: lic },
      select: { id: true, firstName: true, lastName: true, jerseyNumber: true },
    });
    if (!row) throw new Error(`Membre HCO introuvable pour la licence ${lic}`);
    members[lic] = row;
  }
  log(`${Object.keys(members).length} joueurs résolus`);

  for (const fix of JERSEY_FIXES) {
    if (!DRY) {
      await prisma.member.update({
        where: { license: fix.license },
        data: { jerseyNumber: fix.jerseyNumber },
      });
    }
    log(`maillot ${fix.license} → n°${fix.jerseyNumber}`);
  }

  /* ─────────── 6. Faits de jeu de J01 ─────────── */
  // La minute n'est jamais renseignée sur ces feuilles, sauf le 1er but de
  // FUTOL (min. 2) déjà saisi manuellement. `minute: null` est désormais
  // accepté par le schéma — cf. Goal.minute / MatchCard.minute /
  // MatchInjury.minute.

  const M = (lic) => members[lic].id;

  const goals = [
    // MATCH 1 — entente 1-7 HCP
    // ⚠️ Répartition HCP DÉDUITE du cumul officiel de la compétition, pas lue
    // sur une feuille. Elle est cohérente (12 buts HCP au total, dont 5 sur le
    // match 3 dûment listés), mais reste une reconstitution.
    { match: MATCH_IDS.m1, club: 'ENTENTE', member: null, name: null },
    ...Array(3).fill({ match: MATCH_IDS.m1, club: 'HCP', member: 'PROV-HCP-LEDOUX-M' }),
    ...Array(2).fill({ match: MATCH_IDS.m1, club: 'HCP', member: 'PROV-HCP-LEBEAU-L' }),
    { match: MATCH_IDS.m1, club: 'HCP', member: '00004309' }, // Filo
    { match: MATCH_IDS.m1, club: 'HCP', member: '00083241' }, // Rebeca

    // MATCH 2 — HCO 3-8 USPG (feuille #201153)
    { match: MATCH_IDS.m2, club: 'HCO', member: '00045759' }, // Saminadin
    { match: MATCH_IDS.m2, club: 'HCO', member: '00018568' }, // Hoarau J-C
    { match: MATCH_IDS.m2, club: 'HCO', member: '00031970' }, // Paulo
    ...Array(4).fill({ match: MATCH_IDS.m2, club: 'USPG', member: '00025580' }), // Futol
    ...Array(2).fill({ match: MATCH_IDS.m2, club: 'USPG', member: '00091868' }), // Dubois
    { match: MATCH_IDS.m2, club: 'USPG', member: '00026271' }, // Maunier
    // 8e but USPG : la feuille n'en liste que 7 pour un score de 8. On
    // enregistre le but sans buteur plutôt que d'en attribuer un au jugé —
    // le score reste cohérent avec le nombre de rangées Goal.
    { match: MATCH_IDS.m2, club: 'USPG', member: null, name: null },

    // MATCH 3 — HCO 6-5 HCP (feuille #201154)
    ...Array(2).fill({ match: MATCH_IDS.m3, club: 'HCO', member: '00031970' }), // Paulo
    ...Array(2).fill({ match: MATCH_IDS.m3, club: 'HCO', member: '00045759' }), // Saminadin
    ...Array(2).fill({ match: MATCH_IDS.m3, club: 'HCO', member: '00027652' }), // Michel
    ...Array(2).fill({ match: MATCH_IDS.m3, club: 'HCP', member: '00005559' }), // Hoarau C
    { match: MATCH_IDS.m3, club: 'HCP', member: '00083241' }, // Rebeca
    ...Array(2).fill({ match: MATCH_IDS.m3, club: 'HCP', member: '00004309' }), // Filo

    // MATCH 4 — USPG 5-1 entente (feuille #201155)
    { match: MATCH_IDS.m4, club: 'USPG', member: '00025580', minute: 2 }, // Futol, seule minute connue
    ...Array(4).fill({ match: MATCH_IDS.m4, club: 'USPG', member: '00025580' }),
    { match: MATCH_IDS.m4, club: 'ENTENTE', member: '00032109' }, // Orange
  ];

  const cards = [
    { match: MATCH_IDS.m2, club: 'HCO', member: '00031970', kind: 'GREEN' }, // Paulo
    { match: MATCH_IDS.m2, club: 'HCO', member: '00058246', kind: 'GREEN' }, // Minatchy
  ];

  // severity : LIGHT par défaut. SERIOUS réservé à la fracture — c'est une
  // qualification de notre part, la feuille ne gradue pas la gravité.
  const injuries = [
    { match: MATCH_IDS.m2, club: 'USPG', member: '00091868', zone: 'Pouce droit', notes: 'Fracture', severity: 'SERIOUS' },
    { match: MATCH_IDS.m2, club: 'USPG', member: '00011001', zone: 'Épaule et hanche', notes: 'Hématome', severity: 'LIGHT' },
    { match: MATCH_IDS.m3, club: 'HCP', member: '00083241', zone: 'Hanche', notes: 'Choc', severity: 'LIGHT' },
    { match: MATCH_IDS.m4, club: 'USPG', member: '00065107', zone: 'Pied droit', notes: 'Choc', severity: 'LIGHT' },
  ];

  const clubIds = { HCO: HCO.id, HCP: HCP.id, USPG: USPG.id, ENTENTE: entente.id };
  const matchIds = Object.values(MATCH_IDS);

  if (!DRY) {
    await prisma.$transaction([
      // Purge d'abord : rend le script rejouable et remplace le but FUTOL
      // saisi à la main (texte libre) par une rangée liée au joueur.
      prisma.goal.deleteMany({ where: { matchId: { in: matchIds } } }),
      prisma.matchCard.deleteMany({ where: { matchId: { in: matchIds } } }),
      prisma.matchInjury.deleteMany({ where: { matchId: { in: matchIds } } }),
      prisma.goal.createMany({
        data: goals.map((g) => ({
          matchId: g.match,
          scoringClubId: clubIds[g.club],
          scorerMemberId: g.member ? M(g.member) : null,
          scorerName: g.name ?? null,
          minute: g.minute ?? null,
        })),
      }),
      prisma.matchCard.createMany({
        data: cards.map((c) => ({
          matchId: c.match,
          clubId: clubIds[c.club],
          memberId: M(c.member),
          kind: c.kind,
          minute: null,
        })),
      }),
      prisma.matchInjury.createMany({
        data: injuries.map((i) => ({
          matchId: i.match,
          clubId: clubIds[i.club],
          memberId: M(i.member),
          zone: i.zone,
          notes: i.notes,
          severity: i.severity,
          minute: null,
        })),
      }),
    ]);
  }
  log(`${goals.length} buts, ${cards.length} cartons, ${injuries.length} blessures`);

  /* ─────────── 7. Recalcul du classement ─────────── */
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
