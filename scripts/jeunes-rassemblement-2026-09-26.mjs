/**
 * Rassemblement jeunes du SAMEDI 26 SEPTEMBRE 2026 au Tampon — saisie complète
 * (matchs, scores, buteurs, carton, classements, classement des buteurs).
 *
 * Même contrat que scripts/salle-2026-j02.mjs :
 *   - idempotent : les matchs sont écrits sur des IDs déterministes, leurs
 *     faits de jeu purgés puis réécrits, le score et le statut réaffirmés ;
 *   - ne touche QUE les deux compétitions jeunes gazon visées ;
 *   - ne charge PAS .env : on lui passe DATABASE_URL explicitement.
 *
 *   # dry-run (affiche le plan, n'écrit rien)
 *   node scripts/jeunes-rassemblement-2026-09-26.mjs --dry-run
 *   # dev
 *   DATABASE_URL=$(grep -oE '^DATABASE_URL=.*' .env | sed 's/^DATABASE_URL=//; s/"//g') \
 *     node scripts/jeunes-rassemblement-2026-09-26.mjs
 *   # prod
 *   DATABASE_URL=$(grep -oE '^DATABASE_URL=.*' .env.neon | sed 's/^DATABASE_URL=//; s/"//g') \
 *     node scripts/jeunes-rassemblement-2026-09-26.mjs
 *
 * ⚠️ Écrire en base ne rafraîchit PAS les pages publiques (cf. l'en-tête de
 * salle-2026-j02.mjs) : donner REVALIDATE_URL + REVALIDATE_SECRET pour purger.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CE QUE CE SCRIPT NE FAIT PAS, ET POURQUOI
 *
 * 1. Les DEUX rencontres hors catégorie ne sont pas saisies :
 *      - « Ados U13/U15 3-2 Adultes HHS/Zarlors » : les deux camps sont des
 *        sélections mixtes inter-clubs. Aucun `Club` ne peut porter le
 *        résultat, et le faire peser sur un classement serait faux. Un but y
 *        est de plus un csc (Nelly), que `Goal` ne sait pas qualifier comme tel.
 *      - « Rouges 1-0 Chasubles » : opposition interne au HHS. Un match d'un
 *        club contre lui-même n'a pas de sens au classement.
 *    Conséquence assumée : les 2 buts d'Esma et le but de Nolan marqués dans
 *    ces rencontres N'ENTRENT PAS dans les totaux. Les classements de buteurs
 *    ci-dessous ne comptent que les matchs de championnat.
 *
 * 2. Les arbitres ne sont PAS créés. Les feuilles désignent des jeunes (Warren,
 *    Noëlla, Jeyrhan, Mahé, Clément, Ryan, Nolan, Benjamin) qui arbitrent leurs
 *    camarades. Or `getPublicReferees()` (lib/queries/referee.ts) rend TOUS les
 *    `Referee` sans filtre : créer ces lignes publierait huit prénoms d'enfants
 *    dans l'effectif arbitral officiel de la ligue sur /arbitrage. Décision de
 *    la commission, pas d'un script. Le relevé est conservé ici pour que
 *    l'information ne soit pas perdue :
 *      U10/U11 — m1 Warren · m2 Noëlla · m3 Jeyrhan · m4 Mahé · m5 Mahé
 *      U13/U15 — n1 Clément et Ryan · n3 Nolan · n4 Ryan · n5 Nolan
 *                (n2 : non renseigné sur la feuille)
 *      Interne HHS — Benjamin
 *
 * 3. Les noms de famille sont VIDES. Les feuilles de rassemblement ne portent
 *    que le prénom des mineurs. `Member.lastName` est non nullable : on écrit
 *    donc la chaîne vide, et l'affichage passe par `lib/utils/member-name.ts`
 *    (ajouté avec ce script) pour ne jamais rendre « E. » ni « Esma  ».
 *    Les licences sont provisoires (préfixe `PROV-`), même compromis qu'en J01
 *    salle : à remplacer dans /dashboard/team dès qu'elles sont connues.
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
const DAY = '2026-09-26';

/**
 * Les deux compétitions d'accueil, résolues par slug (unique en base).
 *
 * ⚠️ ARBITRAGE À VALIDER PAR LA LIGUE — la feuille dit « U13/U15 », or la seule
 * compétition gazon existante pour cette tranche est « – de 14 ans » (catégorie
 * U14). Les joueurs U15 y sont donc rangés par défaut, faute de compétition
 * U16/U17 déclarée en 2026-2027. Si la ligue en crée une, rejouer ce script
 * après avoir changé le slug ci-dessous : il est idempotent.
 */
const COMPETITIONS = {
  U12: 'championnat-mixte-jeunes-de-12-ans-gazon-2026-2027', // U10-U12 GAZON
  U14: 'championnat-mixte-jeunes-14-gazon-2026-2027',        // U14 GAZON
};

const VENUE_TEXT = 'Le Tampon'; // aucun `Venue` enregistré (cf. project_rassemblements_jeunes)
const MATCHDAY = 1;

/**
 * Matchs, avec des IDs DÉTERMINISTES et lisibles au lieu de cuid().
 *
 * Pourquoi : contrairement aux scripts séniors, les matchs n'existent pas
 * encore — il faut les créer, donc disposer d'une clé de rejouabilité. Le
 * couple (compétition, horaire) n'en est pas une ici : les deux rencontres
 * « 1er match » de la catégorie U13/U15 se sont jouées EN MÊME TEMPS sur deux
 * terrains (Équipe 1 et Équipe 2). Un ID explicite est moins élégant qu'un
 * cuid mais rend le script sûr et rejouable — arbitrage prévu par CLAUDE.md.
 *
 * ⚠️ Les HORAIRES ne figurent pas sur les feuilles. `Match.kickoffAt` est non
 * nullable : les valeurs ci-dessous ORDONNENT les rencontres dans la fenêtre
 * annoncée du rassemblement (09:00-16:00, cf. la ligne YouthGathering du jour).
 * Ce ne sont PAS des horaires officiels et il ne faut pas les présenter comme
 * tels. Les deux « 1er match » U13/U15 partagent volontairement 13:00.
 */
const MATCHES = {
  // ── U10 / U11 ── Zarlors (AZO) vs Hockey Horizon Sud (HHS)
  m1: { id: 'rj20260926-u12-m1', comp: 'U12', time: '09:00', home: 'AZO', away: 'HHS', hs: 2, as: 1 },
  m2: { id: 'rj20260926-u12-m2', comp: 'U12', time: '09:30', home: 'AZO', away: 'HHS', hs: 3, as: 0 },
  m3: { id: 'rj20260926-u12-m3', comp: 'U12', time: '10:00', home: 'AZO', away: 'HHS', hs: 5, as: 2 },
  // Seule rencontre où HHS reçoit sur la feuille, et seul nul de la journée.
  m4: { id: 'rj20260926-u12-m4', comp: 'U12', time: '10:30', home: 'HHS', away: 'AZO', hs: 1, as: 1 },
  m5: { id: 'rj20260926-u12-m5', comp: 'U12', time: '11:00', home: 'AZO', away: 'HHS', hs: 7, as: 0 },

  // ── U13 / U15 ── HHS reçoit sur les cinq rencontres
  n1: { id: 'rj20260926-u14-n1', comp: 'U14', time: '13:00', home: 'HHS', away: 'AZO', hs: 1, as: 0 }, // Équipe 1
  n2: { id: 'rj20260926-u14-n2', comp: 'U14', time: '13:00', home: 'HHS', away: 'AZO', hs: 6, as: 3 }, // Équipe 2
  n3: { id: 'rj20260926-u14-n3', comp: 'U14', time: '13:30', home: 'HHS', away: 'AZO', hs: 4, as: 1 }, // 2e match
  n4: { id: 'rj20260926-u14-n4', comp: 'U14', time: '14:00', home: 'HHS', away: 'AZO', hs: 3, as: 0 }, // 3e match
  n5: { id: 'rj20260926-u14-n5', comp: 'U14', time: '14:30', home: 'HHS', away: 'AZO', hs: 4, as: 2 }, // 4e match
};

/**
 * Joueurs. Licences provisoires, nom de famille vide (cf. en-tête, point 3).
 * `cat` alimente `Member.category` : l'enum n'a pas de valeur U13, donc le
 * groupe U13/U15 est rangé en U14 — même arbitrage que la compétition.
 */
const MEMBERS = [
  // U10/U11 — Zarlors de l'Ouest
  { license: 'PROV-AZO-ESMA',     firstName: 'Esma',     club: 'AZO', cat: 'U11' },
  { license: 'PROV-AZO-ROBIN',    firstName: 'Robin',    club: 'AZO', cat: 'U11' },
  { license: 'PROV-AZO-WARREN',   firstName: 'Warren',   club: 'AZO', cat: 'U11' },
  { license: 'PROV-AZO-KAN',      firstName: 'Kan',      club: 'AZO', cat: 'U11' },
  { license: 'PROV-AZO-AMRA',     firstName: 'Amra',     club: 'AZO', cat: 'U11' },
  // U10/U11 — Hockey Horizon Sud
  { license: 'PROV-HHS-NOELLA',   firstName: 'Noëlla',   club: 'HHS', cat: 'U11' },
  { license: 'PROV-HHS-NAEL',     firstName: 'Naël',     club: 'HHS', cat: 'U11' },
  { license: 'PROV-HHS-JEYRHAN',  firstName: 'Jeyrhan',  club: 'HHS', cat: 'U11' },
  // U13/U15 — Hockey Horizon Sud
  { license: 'PROV-HHS-RYAN',     firstName: 'Ryan',     club: 'HHS', cat: 'U14' },
  { license: 'PROV-HHS-NOLAN',    firstName: 'Nolan',    club: 'HHS', cat: 'U14' },
  { license: 'PROV-HHS-MATHEO',   firstName: 'Mathéo',   club: 'HHS', cat: 'U14' },
  { license: 'PROV-HHS-MAYLAN',   firstName: 'Maylan',   club: 'HHS', cat: 'U14' },
  { license: 'PROV-HHS-YANN',     firstName: 'Yann',     club: 'HHS', cat: 'U14' },
  { license: 'PROV-HHS-MEREDITH', firstName: 'Mérédith', club: 'HHS', cat: 'U14' },
  // U13/U15 — Zarlors de l'Ouest
  { license: 'PROV-AZO-CLEMENT',  firstName: 'Clément',  club: 'AZO', cat: 'U14' },
  { license: 'PROV-AZO-QUENTIN',  firstName: 'Quentin',  club: 'AZO', cat: 'U14' },
  { license: 'PROV-AZO-LENA',     firstName: 'Léna',     club: 'AZO', cat: 'U14' },
];

/** Buteurs. Un objet = UN but ; les totaux sont vérifiés contre le score. */
const GOALS = [
  // ── m1 : AZO 2-1 HHS
  { match: 'm1', club: 'AZO', member: 'PROV-AZO-ROBIN' },
  { match: 'm1', club: 'AZO', member: 'PROV-AZO-ESMA' },
  { match: 'm1', club: 'HHS', member: 'PROV-HHS-NOELLA' },
  // ── m2 : AZO 3-0 HHS
  ...Array(2).fill({ match: 'm2', club: 'AZO', member: 'PROV-AZO-ESMA' }),
  { match: 'm2', club: 'AZO', member: 'PROV-AZO-ROBIN' },
  // ── m3 : AZO 5-2 HHS
  { match: 'm3', club: 'AZO', member: 'PROV-AZO-ROBIN' },
  ...Array(2).fill({ match: 'm3', club: 'AZO', member: 'PROV-AZO-WARREN' }),
  ...Array(2).fill({ match: 'm3', club: 'AZO', member: 'PROV-AZO-ESMA' }),
  { match: 'm3', club: 'HHS', member: 'PROV-HHS-NAEL' },
  { match: 'm3', club: 'HHS', member: 'PROV-HHS-NOELLA' },
  // ── m4 : HHS 1-1 AZO
  { match: 'm4', club: 'HHS', member: 'PROV-HHS-JEYRHAN' },
  { match: 'm4', club: 'AZO', member: 'PROV-AZO-WARREN' },
  // ── m5 : AZO 7-0 HHS
  ...Array(2).fill({ match: 'm5', club: 'AZO', member: 'PROV-AZO-KAN' }),
  ...Array(4).fill({ match: 'm5', club: 'AZO', member: 'PROV-AZO-ESMA' }),
  { match: 'm5', club: 'AZO', member: 'PROV-AZO-AMRA' },

  // ── n1 : HHS 1-0 AZO
  { match: 'n1', club: 'HHS', member: 'PROV-HHS-RYAN' },
  // ── n2 : HHS 6-3 AZO
  ...Array(3).fill({ match: 'n2', club: 'HHS', member: 'PROV-HHS-NOLAN' }),
  ...Array(3).fill({ match: 'n2', club: 'HHS', member: 'PROV-HHS-MATHEO' }),
  { match: 'n2', club: 'AZO', member: 'PROV-AZO-CLEMENT' },
  { match: 'n2', club: 'AZO', member: 'PROV-AZO-LENA' },
  { match: 'n2', club: 'AZO', member: 'PROV-AZO-QUENTIN' },
  // ── n3 : HHS 4-1 AZO
  ...Array(3).fill({ match: 'n3', club: 'HHS', member: 'PROV-HHS-RYAN' }),
  { match: 'n3', club: 'HHS', member: 'PROV-HHS-MAYLAN' },
  { match: 'n3', club: 'AZO', member: 'PROV-AZO-QUENTIN' },
  // ── n4 : HHS 3-0 AZO
  { match: 'n4', club: 'HHS', member: 'PROV-HHS-MATHEO' },
  { match: 'n4', club: 'HHS', member: 'PROV-HHS-NOLAN' },
  { match: 'n4', club: 'HHS', member: 'PROV-HHS-MEREDITH' },
  // ── n5 : HHS 4-2 AZO
  { match: 'n5', club: 'HHS', member: 'PROV-HHS-MAYLAN' },
  ...Array(2).fill({ match: 'n5', club: 'HHS', member: 'PROV-HHS-YANN' }),
  { match: 'n5', club: 'HHS', member: 'PROV-HHS-RYAN' },
  ...Array(2).fill({ match: 'n5', club: 'AZO', member: 'PROV-AZO-CLEMENT' }),
];

/**
 * Cartons.
 *
 * ⚠️ Le seul carton de la journée (jaune, match 2 des U10/U11) porte le prénom
 * « Clément », et la feuille ne dit pas son équipe. Le seul Clément identifié
 * de la journée joue en U13/U15 pour Zarlors — il ne peut donc pas avoir joué
 * le match 2 des U10/U11. On enregistre le carton au NOM porté par la feuille
 * (`memberName`, prévu pour ça) sans le rattacher à un joueur : le fait
 * apparaît sur la fiche du match sans salir le dossier disciplinaire de
 * personne. `clubId` étant non nullable, il est mis sur Zarlors, seul club où
 * ce prénom est attesté — à corriger au dashboard si la ligue tranche autrement.
 */
const CARDS = [
  { match: 'm2', club: 'AZO', member: null, name: 'Clément', kind: 'YELLOW' },
];

async function main() {
  const log = (...a) => console.log(DRY ? '[dry-run]' : '[write]  ', ...a);

  /* ─────────── 0. Résolution des entités ─────────── */

  const comps = {};
  for (const [key, slug] of Object.entries(COMPETITIONS)) {
    const row = await prisma.competition.findUnique({
      where: { slug },
      select: { id: true, name: true, season: true, mode: true, category: true },
    });
    if (!row) throw new Error(`Compétition introuvable : ${slug}`);
    if (row.season !== SEASON) throw new Error(`${slug} est en ${row.season}, pas ${SEASON}.`);
    if (row.mode !== 'GAZON') throw new Error(`${slug} n'est pas une compétition GAZON.`);
    comps[key] = row;
    log(`compétition ${key} : ${row.name} [${row.category}/${row.mode}]`);
  }

  const bySlug = Object.fromEntries(
    (await prisma.club.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
  );
  if (!bySlug['hhs']) throw new Error('Club HHS introuvable.');

  // Zarlors de l'Ouest : créé par salle-2026-j01.mjs en prod, absent de la base
  // de dev (plus ancienne). Upsert pour que le script tourne sur les deux.
  const azoId = DRY
    ? (bySlug['zarlors-ouest'] ?? '<AZO>')
    : (
        await prisma.club.upsert({
          where: { slug: 'zarlors-ouest' },
          update: {},
          create: {
            slug: 'zarlors-ouest',
            shortCode: 'AZO',
            name: 'Association Zarlors de l’Ouest',
            city: 'Saint-Paul',
            kind: 'STANDALONE',
          },
          select: { id: true },
        })
      ).id;

  const clubIds = { HHS: bySlug['hhs'], AZO: azoId };
  log('clubs :', Object.entries(clubIds).map(([k, v]) => `${k}=${v}`).join(' '));

  /* ─────────── 1. Joueurs ─────────── */

  for (const p of MEMBERS) {
    if (!DRY) {
      await prisma.member.upsert({
        where: { license: p.license },
        // `update: {}` : un joueur déjà en base n'est pas réécrit — si la ligue
        // a saisi son vrai nom ou sa vraie licence entre-temps, on ne l'écrase
        // pas avec le prénom de la feuille.
        update: {},
        create: {
          license: p.license,
          firstName: p.firstName,
          lastName: '',
          clubId: clubIds[p.club],
          kind: 'PLAYER',
          category: p.cat,
        },
      });
    }
    log(`joueur ${p.firstName} (${p.club}, ${p.cat}) — licence ${p.license}`);
  }

  const members = {};
  for (const p of MEMBERS) {
    if (DRY) { members[p.license] = { id: `<${p.firstName}>` }; continue; }
    const row = await prisma.member.findUnique({
      where: { license: p.license },
      select: { id: true, clubId: true },
    });
    if (!row) throw new Error(`Membre introuvable après upsert : ${p.license}`);
    if (row.clubId !== clubIds[p.club]) {
      throw new Error(`${p.license} est rattaché à un autre club que ${p.club}.`);
    }
    members[p.license] = row;
  }
  const M = (license) => members[license].id;

  /* ─────────── 2. Inscriptions ─────────── */
  // `CompetitionEntry` borne le sélecteur d'équipes du formulaire match et
  // alimente le compteur « N équipes » de la card sur /jeunes.

  for (const key of Object.keys(COMPETITIONS)) {
    for (const club of ['HHS', 'AZO']) {
      if (!DRY) {
        await prisma.competitionEntry.upsert({
          where: { competitionId_clubId: { competitionId: comps[key].id, clubId: clubIds[club] } },
          update: {},
          create: { competitionId: comps[key].id, clubId: clubIds[club] },
        });
      }
      log(`inscription ${club} → ${key}`);
    }
  }

  /* ─────────── 3. Cohérence buts listés / score officiel ─────────── */
  // Un écart ici veut dire qu'on s'apprête à publier un classement de buteurs
  // qui contredit le score affiché. On préfère s'arrêter.

  for (const [key, m] of Object.entries(MATCHES)) {
    const counted = { home: 0, away: 0 };
    for (const g of GOALS.filter((g) => g.match === key)) {
      if (g.club === m.home) counted.home++;
      else if (g.club === m.away) counted.away++;
      else throw new Error(`But attribué à ${g.club}, qui ne joue pas le match ${key}.`);
    }
    if (counted.home !== m.hs || counted.away !== m.as) {
      throw new Error(
        `Match ${key} : ${counted.home}-${counted.away} buts listés pour un score de ${m.hs}-${m.as}.`,
      );
    }
    log(`match ${key} : ${m.home} ${m.hs}-${m.as} ${m.away}, ${counted.home + counted.away} buts listés ✓`);
  }

  // Garde-fou inverse : un ID déjà pris par un match d'une AUTRE compétition
  // serait écrasé. Les IDs sont préfixés `rj20260926-`, mais on vérifie.
  const existing = await prisma.match.findMany({
    where: { id: { in: Object.values(MATCHES).map((m) => m.id) } },
    select: { id: true, competitionId: true },
  });
  for (const row of existing) {
    const planned = Object.values(MATCHES).find((m) => m.id === row.id);
    if (row.competitionId !== comps[planned.comp].id) {
      throw new Error(`Le match ${row.id} appartient déjà à une autre compétition.`);
    }
  }
  log(`${existing.length} des ${Object.keys(MATCHES).length} matchs existent déjà (rejeu)`);

  /* ─────────── 4. Écriture ─────────── */

  const matchIds = Object.values(MATCHES).map((m) => m.id);

  if (!DRY) {
    for (const m of Object.values(MATCHES)) {
      const data = {
        competitionId: comps[m.comp].id,
        homeClubId: clubIds[m.home],
        awayClubId: clubIds[m.away],
        homeScore: m.hs,
        awayScore: m.as,
        // Sans FINISHED, le match sort du classement sans lever d'erreur
        // (cf. feedback_score_sans_statut_finished).
        status: 'FINISHED',
        kickoffAt: reunionDate(DAY, m.time),
        venue: VENUE_TEXT,
        matchday: MATCHDAY,
        phase: 'REGULAR',
      };
      await prisma.match.upsert({ where: { id: m.id }, update: data, create: { id: m.id, ...data } });
    }

    await prisma.$transaction([
      // Purge d'abord : rend le script rejouable.
      prisma.goal.deleteMany({ where: { matchId: { in: matchIds } } }),
      prisma.matchCard.deleteMany({ where: { matchId: { in: matchIds } } }),
      prisma.goal.createMany({
        data: GOALS.map((g) => ({
          matchId: MATCHES[g.match].id,
          scoringClubId: clubIds[g.club],
          scorerMemberId: g.member ? M(g.member) : null,
          scorerName: g.name ?? null,
          // Minute nulle : les feuilles de rassemblement n'ont pas le chrono
          // (cf. project_minute_facultative_feuilles).
          minute: null,
        })),
      }),
      prisma.matchCard.createMany({
        data: CARDS.map((c) => ({
          matchId: MATCHES[c.match].id,
          clubId: clubIds[c.club],
          memberId: c.member ? M(c.member) : null,
          memberName: c.name ?? null,
          kind: c.kind,
          minute: null,
        })),
      }),
    ]);
  }
  log(`${Object.keys(MATCHES).length} matchs, ${GOALS.length} buts, ${CARDS.length} carton(s)`);

  /* ─────────── 5. Recalcul des classements ─────────── */

  for (const key of Object.keys(COMPETITIONS)) {
    if (!DRY) await recomputeStandings(comps[key].id);
    log(`classement ${key} recalculé`);

    const table = await prisma.standing.findMany({
      where: { competitionId: comps[key].id },
      orderBy: { rank: 'asc' },
      select: {
        rank: true, played: true, wins: true, draws: true, losses: true,
        goalsFor: true, goalsAgainst: true, points: true,
        club: { select: { shortCode: true, name: true } },
      },
    });
    console.log(`\n### ${comps[key].name} — ${comps[key].category}`);
    console.table(table.map((r) => ({
      R: r.rank, Club: r.club.shortCode ?? r.club.name, J: r.played,
      V: r.wins, N: r.draws, D: r.losses,
      BP: r.goalsFor, BC: r.goalsAgainst, Diff: r.goalsFor - r.goalsAgainst, Pts: r.points,
    })));

    const scorers = await prisma.goal.groupBy({
      by: ['scorerMemberId'],
      where: {
        match: { competitionId: comps[key].id, status: 'FINISHED' },
        scorerMemberId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { scorerMemberId: 'desc' } },
    });
    const rows = await prisma.member.findMany({
      where: { id: { in: scorers.map((s) => s.scorerMemberId) } },
      select: { id: true, firstName: true, lastName: true, club: { select: { shortCode: true } } },
    });
    console.table(scorers.map((s, i) => {
      const m = rows.find((r) => r.id === s.scorerMemberId);
      return {
        R: i + 1,
        Joueur: `${m.firstName} ${m.lastName}`.trim(),
        Club: m.club.shortCode,
        Buts: s._count._all,
      };
    }));
  }

  /* ─────────── 6. Purge du cache des pages publiques ─────────── */

  if (!DRY) await revalidatePublicPages(log);
}

/**
 * Heure de La Réunion (UTC+4) → instant UTC. Réplique de
 * `parseReunionDateAndTime` (lib/utils/datetime-reunion.ts), que ce script ne
 * peut pas importer : c'est du TypeScript, et le script tourne en .mjs brut.
 */
function reunionDate(day, time) {
  return new Date(`${day}T${time}:00+04:00`);
}

/** Cf. salle-2026-j02.mjs : échec visible, jamais de try/catch muet. */
async function revalidatePublicPages(log) {
  const url = process.env.REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) {
    log('⚠️  cache public NON purgé (REVALIDATE_URL/REVALIDATE_SECRET absents) —',
      'les pages publiques serviront l’ancien état jusqu’à 1 h.');
    return;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: ['public-competitions'] }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      log(`⚠️  purge du cache REFUSÉE (HTTP ${res.status}) :`, payload.error ?? '(sans détail)');
      return;
    }
    log('cache public purgé :', (payload.revalidated ?? []).join(', '));
  } catch (e) {
    log('⚠️  purge du cache INJOIGNABLE :', e.message);
  }
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
