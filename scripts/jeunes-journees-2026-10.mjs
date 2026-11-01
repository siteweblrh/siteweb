/**
 * Rassemblements jeunes du SAMEDI 10 OCTOBRE 2026 (J2, Trois-Bassins) et du
 * SAMEDI 31 OCTOBRE 2026 (J3, Le Tampon) — d'après les deux affiches de
 * résultats de la ligue (lrh-jeune-j2.jpg, lrh-jeune-j3.jpg).
 *
 * Même contrat que scripts/jeunes-rassemblement-2026-09-26.mjs :
 *   - idempotent : IDs de match déterministes, buts purgés puis réécrits,
 *     séries de chronos remplacées en bloc ;
 *   - ne touche QUE les deux compétitions jeunes gazon et les deux journées ;
 *   - ne charge PAS .env : on lui passe DATABASE_URL explicitement.
 *
 *   node scripts/jeunes-journees-2026-10.mjs --dry-run
 *   DATABASE_URL=$(grep -oE '^DATABASE_URL=.*' .env.neon | sed 's/^DATABASE_URL=//; s/"//g') \
 *   REVALIDATE_URL=https://www.lrh.re/api/revalidate REVALIDATE_SECRET=… \
 *     node scripts/jeunes-journees-2026-10.mjs
 *
 * ⚠️ Le modèle `YouthCourseTime` doit exister en base AVANT (prisma db push).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ARBITRAGES (mêmes règles qu'au 26/09)
 *
 * 1. U11 → U10-U12, U15 → U14 : il n'existe pas de compétition U16/U17 gazon
 *    en 2026-2027 (cf. l'en-tête du script du 26/09).
 *
 * 2. Ce qui n'oppose pas deux CLUBS n'entre pas au championnat, comme au 26/09 :
 *      - J2, « Match final toutes catégories » (Zarlors vainqueurs aux tirs au
 *        but 4-3, score du temps réglementaire non donné) ;
 *      - J3, les deux matchs U11 « Équipe mixte Robin (2 Zarlors + 3 HHS) »
 *        contre « Équipe Warren » : équipes mixtes inter-clubs ;
 *      - J3, Féminines « Équipe mixte HHS/Zarlors » 3-0 HHS : équipe mixte, et
 *        la seule compétition féminine gazon déclarée est SÉNIOR — y verser un
 *        match de jeunes polluerait le classement sénior et la home.
 *    Ces résultats sont publiés en NOTE du rassemblement (calendrier /jeunes),
 *    et leurs buts ne comptent pas au classement des buteurs.
 *    ⚠️ La note n'est écrite que si elle est vide : une note saisie au
 *    dashboard n'est jamais écrasée (le script l'affiche et passe).
 *
 * 3. Horaires : absents des affiches. Comme au 26/09, `kickoffAt` ORDONNE les
 *    rencontres (ordre de l'affiche) ; ce ne sont pas des horaires officiels.
 *
 * 4. J3 U15 : « Hockey Horizon Sud 1 » et « 2 » sont deux équipes du même club,
 *    comme les Équipes 1/2 du 26/09 → deux rencontres HHS–AZO.
 *    « Yann (HHS 1) » et « Yannis (Zarlor) » apparaissent tous deux sur la
 *    feuille du parcours : ce sont deux jeunes distincts. Le doute du 26/09
 *    (« Yann serait-il Yannis Gauvin, AZO ? ») est donc levé : Yann est à HHS.
 *
 * 5. Parcours chronométré : noms tels que sur l'affiche, sauf « Noëla »
 *    écrit « Noëlla » comme sur la feuille du 26/09 et le document de la ligue
 *    — sinon la même enfant aurait deux orthographes d'une journée à l'autre.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL manquant — cf. en-tête du script.');
const isNeon = new URL(connectionString).hostname.endsWith('.neon.tech');
const prisma = new PrismaClient({
  adapter: isNeon ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString }),
});
const DRY = process.argv.includes('--dry-run');

const SEASON = '2026-2027';
const COMPETITIONS = {
  U12: 'championnat-mixte-jeunes-de-12-ans-gazon-2026-2027', // U10-U12 GAZON
  U14: 'championnat-mixte-jeunes-14-gazon-2026-2027',        // U14 GAZON
};

const DAYS = {
  J2: {
    date: '2026-10-10', matchday: 2,
    notes: 'Hors championnat — match final toutes catégories : victoire des Zarlors aux tirs au but (4-3) face à Hockey Horizon Sud.',
  },
  J3: {
    date: '2026-10-31', matchday: 3,
    notes: [
      'Hors championnat — U11 en équipes mixtes : Équipe Robin (2 Zarlors + 3 HHS) 5-0 puis 8-0 face à l’Équipe Warren (buts : Naël 7, Jeyrhan 4, Robin 1, Syhem 1).',
      'Féminines : équipe mixte HHS/Zarlors 3-0 Hockey Horizon Sud (Léa, 3 buts).',
    ].join('\n'),
  },
};

const MATCHES = {
  // ── J2 · 10/10 — ordre de l'affiche, U15 et U11 en alternance
  a1: { id: 'rj20261010-u14-n1', day: 'J2', comp: 'U14', time: '09:00', home: 'HHS', away: 'AZO', hs: 6, as: 1 },
  a2: { id: 'rj20261010-u12-m1', day: 'J2', comp: 'U12', time: '09:30', home: 'AZO', away: 'HHS', hs: 2, as: 1 },
  a3: { id: 'rj20261010-u14-n2', day: 'J2', comp: 'U14', time: '10:00', home: 'HHS', away: 'AZO', hs: 6, as: 3 },
  a4: { id: 'rj20261010-u12-m2', day: 'J2', comp: 'U12', time: '10:30', home: 'AZO', away: 'HHS', hs: 2, as: 1 },
  a5: { id: 'rj20261010-u14-n3', day: 'J2', comp: 'U14', time: '11:00', home: 'HHS', away: 'AZO', hs: 3, as: 5 },
  a6: { id: 'rj20261010-u12-m3', day: 'J2', comp: 'U12', time: '11:30', home: 'AZO', away: 'HHS', hs: 2, as: 2 },
  // ── J3 · 31/10 — U15 seulement (les U11 jouaient en équipes mixtes)
  b1: { id: 'rj20261031-u14-n1', day: 'J3', comp: 'U14', time: '10:00', home: 'HHS', away: 'AZO', hs: 3, as: 7 }, // HHS 1
  b2: { id: 'rj20261031-u14-n2', day: 'J3', comp: 'U14', time: '10:30', home: 'HHS', away: 'AZO', hs: 4, as: 1 }, // HHS 2
};

/** Nouveaux joueurs de la J3. Licences provisoires, nom de famille inconnu. */
const MEMBERS = [
  { license: 'PROV-AZO-AUGUSTE', firstName: 'Auguste', club: 'AZO', cat: 'U14' },
  { license: 'PROV-HHS-MELVIN',  firstName: 'Melvin',  club: 'HHS', cat: 'U14' },
];

/** Buteurs — l'affiche J2 n'en donne aucun. Un objet = un but. */
const GOALS = [
  // b1 : HHS 1 3-7 AZO
  ...Array(3).fill({ match: 'b1', club: 'HHS', member: 'PROV-HHS-YANN' }),
  ...Array(5).fill({ match: 'b1', club: 'AZO', member: 'PROV-AZO-CLEMENT' }),
  ...Array(2).fill({ match: 'b1', club: 'AZO', member: 'PROV-AZO-AUGUSTE' }),
  // b2 : HHS 2 4-1 AZO
  ...Array(2).fill({ match: 'b2', club: 'HHS', member: 'PROV-HHS-MAYLAN' }),
  { match: 'b2', club: 'HHS', member: 'PROV-HHS-MELVIN' },
  { match: 'b2', club: 'HHS', member: 'PROV-HHS-NOLAN' },
  { match: 'b2', club: 'AZO', member: 'PROV-AZO-CLEMENT' },
];

/** Parcours du jeune hockeyeur, J3. Le rang se recalcule depuis le chrono. */
const COURSE = {
  J3: {
    U11: [
      ['Naël', null, 31450], ['Jeyrhan', null, 37500], ['Robin', null, 38000, true],
      ['Warren', null, 41460], ['Maé', null, 42950], ['Noëlla', null, 44920],
      ['Kessi', null, 48920], ['Kim', null, 49600], ['Anaë', null, 50000],
      ['Jules', null, 69000], ['Syhem', null, 76270],
    ],
    U15: [
      ['Mathéo', 'HHS 1', 25490], ['Antoine', 'HHS 2', 28760], ['Léna', 'Zarlor', 30960],
      ['Auguste', 'Zarlor', 30970], ['Nolan', 'HHS 1', 35160], ['Melvin', 'HHS 1', 35840],
      ['Peggy', 'Zarlor', 38330], ['Frédéric', 'HHS 1', 39000, true], ['Kenssya', 'HHS 1', 41010],
      ['Yann', 'HHS 2', 44950], ['Maé', 'HHS 2', 45440], ['Clément', 'Zarlor', 45830],
      ['Maylan', 'HHS 1', 47920], ['Mérédith', 'HHS 2', 54660], ['Yannis', 'Zarlor', 58290],
    ],
  },
};

async function main() {
  const log = (...a) => console.log(DRY ? '[dry-run]' : '[write]  ', ...a);

  /* ─────────── 0. Résolution ─────────── */

  const comps = {};
  for (const [key, slug] of Object.entries(COMPETITIONS)) {
    const row = await prisma.competition.findUnique({
      where: { slug }, select: { id: true, name: true, season: true, mode: true },
    });
    if (!row || row.season !== SEASON || row.mode !== 'GAZON') {
      throw new Error(`Compétition ${slug} introuvable ou hors ${SEASON} gazon.`);
    }
    comps[key] = row;
  }

  const clubs = Object.fromEntries(
    (await prisma.club.findMany({
      where: { slug: { in: ['hhs', 'zarlors-ouest'] } }, select: { id: true, slug: true },
    })).map((c) => [c.slug === 'hhs' ? 'HHS' : 'AZO', c.id]),
  );
  if (!clubs.HHS || !clubs.AZO) throw new Error('Clubs HHS / Zarlors introuvables (jouer d’abord le script du 26/09).');

  // Rassemblement du jour : clé logique saison + jour (heure Réunion), comme
  // scripts/jeunes-rassemblements-2026-2027.mjs.
  const gatherings = {};
  for (const [key, d] of Object.entries(DAYS)) {
    const from = reunionDate(d.date, '00:00');
    const to = new Date(+from + 24 * 3600 * 1000);
    const found = await prisma.youthGathering.findMany({
      where: { season: SEASON, mode: 'GAZON', date: { gte: from, lt: to } },
      select: { id: true, location: true, notes: true, published: true, venue: { select: { name: true } } },
    });
    if (found.length !== 1) throw new Error(`${found.length} rassemblement(s) gazon le ${d.date} — attendu 1.`);
    gatherings[key] = found[0];
    log(`rassemblement ${key} ${d.date} : ${found[0].venue?.name ?? found[0].location ?? '(lieu ?)'}${found[0].published ? '' : ' — ⚠️ NON publié'}`);
  }

  /* ─────────── 1. Joueurs ─────────── */

  for (const p of MEMBERS) {
    if (!DRY) {
      await prisma.member.upsert({
        where: { license: p.license },
        update: {},
        create: {
          license: p.license, firstName: p.firstName, lastName: '',
          clubId: clubs[p.club], kind: 'PLAYER', category: p.cat,
        },
      });
    }
    log(`joueur ${p.firstName} (${p.club}) — ${p.license}`);
  }
  const licenses = [...new Set(GOALS.map((g) => g.member))];
  const members = Object.fromEntries(
    (await prisma.member.findMany({
      where: { license: { in: licenses } }, select: { id: true, license: true, clubId: true },
    })).map((m) => [m.license, m]),
  );
  for (const g of GOALS) {
    const m = members[g.member];
    if (!m && !DRY) throw new Error(`Joueur introuvable : ${g.member}`);
    if (m && m.clubId !== clubs[g.club]) throw new Error(`${g.member} n'est pas rattaché à ${g.club}.`);
  }

  /* ─────────── 2. Cohérence buts / score ─────────── */

  for (const [key, m] of Object.entries(MATCHES)) {
    const goals = GOALS.filter((g) => g.match === key);
    if (goals.length === 0) { log(`match ${key} : ${m.home} ${m.hs}-${m.as} ${m.away} (buteurs non fournis)`); continue; }
    const home = goals.filter((g) => g.club === m.home).length;
    const away = goals.filter((g) => g.club === m.away).length;
    if (home !== m.hs || away !== m.as) {
      throw new Error(`Match ${key} : ${home}-${away} buts listés pour un score de ${m.hs}-${m.as}.`);
    }
    log(`match ${key} : ${m.home} ${m.hs}-${m.as} ${m.away}, buts ✓`);
  }
  const existing = await prisma.match.findMany({
    where: { id: { in: Object.values(MATCHES).map((m) => m.id) } },
    select: { id: true, competitionId: true },
  });
  for (const row of existing) {
    const planned = Object.values(MATCHES).find((m) => m.id === row.id);
    if (row.competitionId !== comps[planned.comp].id) throw new Error(`${row.id} appartient à une autre compétition.`);
  }

  /* ─────────── 3. Écriture ─────────── */

  const matchIds = Object.values(MATCHES).map((m) => m.id);
  if (!DRY) {
    for (const m of Object.values(MATCHES)) {
      const g = gatherings[m.day];
      const data = {
        competitionId: comps[m.comp].id,
        homeClubId: clubs[m.home], awayClubId: clubs[m.away],
        homeScore: m.hs, awayScore: m.as,
        status: 'FINISHED', // sans lui, le match sort du classement sans erreur
        kickoffAt: reunionDate(DAYS[m.day].date, m.time),
        venue: g.venue?.name ?? g.location,
        matchday: DAYS[m.day].matchday,
        phase: 'REGULAR',
      };
      await prisma.match.upsert({ where: { id: m.id }, update: data, create: { id: m.id, ...data } });
    }
    await prisma.$transaction([
      prisma.goal.deleteMany({ where: { matchId: { in: matchIds } } }),
      prisma.goal.createMany({
        data: GOALS.map((g) => ({
          matchId: MATCHES[g.match].id,
          scoringClubId: clubs[g.club],
          scorerMemberId: members[g.member].id,
          minute: null,
        })),
      }),
    ]);
  }
  log(`${matchIds.length} matchs, ${GOALS.length} buts`);

  for (const [dayKey, series] of Object.entries(COURSE)) {
    const gatheringId = gatherings[dayKey].id;
    for (const [category, rows] of Object.entries(series)) {
      if (!DRY) {
        await prisma.$transaction([
          prisma.youthCourseTime.deleteMany({ where: { gatheringId, category } }),
          prisma.youthCourseTime.createMany({
            data: rows.map(([athleteName, team, timeMs, approximate = false]) => ({
              gatheringId, category, athleteName, team, timeMs, approximate,
            })),
          }),
        ]);
      }
      log(`parcours ${dayKey} ${category} : ${rows.length} chronos`);
    }
  }

  for (const [key, d] of Object.entries(DAYS)) {
    const g = gatherings[key];
    if (g.notes && g.notes.trim() !== d.notes) {
      log(`⚠️  note du ${d.date} NON écrite, elle existe déjà :\n    « ${g.notes} »\n    à compléter au dashboard avec :\n    « ${d.notes} »`);
      continue;
    }
    if (!DRY) await prisma.youthGathering.update({ where: { id: g.id }, data: { notes: d.notes } });
    log(`note du ${d.date} écrite`);
  }

  /* ─────────── 4. Classements ─────────── */

  for (const key of Object.keys(COMPETITIONS)) {
    if (!DRY) await recomputeStandings(comps[key].id);
    const table = await prisma.standing.findMany({
      where: { competitionId: comps[key].id }, orderBy: { rank: 'asc' },
      select: { rank: true, played: true, wins: true, draws: true, losses: true, goalsFor: true, goalsAgainst: true, points: true, club: { select: { shortCode: true } } },
    });
    console.log(`\n### ${comps[key].name}`);
    console.table(table.map((r) => ({
      R: r.rank, Club: r.club.shortCode, J: r.played, V: r.wins, N: r.draws, D: r.losses,
      BP: r.goalsFor, BC: r.goalsAgainst, Pts: r.points,
    })));
  }

  if (!DRY) await revalidatePublicPages(log);
}

/** Heure de La Réunion (UTC+4) → instant UTC (cf. datetime-reunion.ts). */
function reunionDate(day, time) {
  return new Date(`${day}T${time}:00+04:00`);
}

/** Cf. salle-2026-j02.mjs : échec visible, jamais de try/catch muet. */
async function revalidatePublicPages(log) {
  const url = process.env.REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) {
    log('⚠️  cache public NON purgé (REVALIDATE_URL/REVALIDATE_SECRET absents) — jusqu’à 1 h de retard.');
    return;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: ['public-competitions', 'public-youth'] }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) { log(`⚠️  purge REFUSÉE (HTTP ${res.status}) :`, payload.error ?? '(sans détail)'); return; }
    log('cache public purgé :', (payload.revalidated ?? []).join(', '));
  } catch (e) {
    log('⚠️  purge INJOIGNABLE :', e.message);
  }
}

/** Copie fidèle de updateStandings() : phase REGULAR + statut FINISHED. */
async function recomputeStandings(competitionId) {
  const finished = await prisma.match.findMany({ where: { competitionId, status: 'FINISHED', phase: 'REGULAR' } });
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
  const stats = new Map(clubs.map((c) => [c.id, { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }]));
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
  const sorted = [...stats.entries()].map(([clubId, s]) => ({ clubId, ...s })).sort((x, y) =>
    y.points - x.points
    || (y.goalsFor - y.goalsAgainst) - (x.goalsFor - x.goalsAgainst)
    || y.goalsFor - x.goalsFor);
  await prisma.$transaction(sorted.map((s, i) => {
    const { clubId, ...rest } = s;
    return prisma.standing.upsert({
      where: { competitionId_clubId: { competitionId, clubId } },
      update: { rank: i + 1, ...rest },
      create: { competitionId, clubId, rank: i + 1, ...rest },
    });
  }));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
