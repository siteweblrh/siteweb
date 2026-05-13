import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined');

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const CLUBS = [
  { shortCode: 'HCO',  slug: 'hco',  name: "HC de l'Ouest",      city: 'Saint-Paul' },
  { shortCode: 'HCP',  slug: 'hcp',  name: 'HC La Possession',   city: 'La Possession' },
  { shortCode: 'HHS',  slug: 'hhs',  name: 'Hockey Horizon Sud', city: 'Le Tampon' },
  { shortCode: 'SDHC', slug: 'sdhc', name: 'Saint-Denis HC',     city: 'Saint-Denis' },
  { shortCode: 'USPG', slug: 'uspg', name: 'USPG Le Port',       city: 'Le Port' },
];

async function main() {
  // Clubs
  for (const c of CLUBS) {
    await prisma.club.upsert({
      where: { slug: c.slug },
      update: { shortCode: c.shortCode, name: c.name, city: c.city },
      create: c,
    });
  }
  const clubsBySlug = Object.fromEntries(
    (await prisma.club.findMany()).map((c) => [c.slug, c])
  );

  // Sponsors (LIGUE-scope, no club)
  const runMarket = await prisma.sponsor.upsert({
    where: { id: 'spnsr_run_market' },
    update: {},
    create: { id: 'spnsr_run_market', name: 'Run Market', scope: 'LIGUE' },
  });
  await prisma.sponsor.upsert({
    where: { id: 'spnsr_credit_pei' },
    update: {},
    create: { id: 'spnsr_credit_pei', name: 'Crédit Peï', scope: 'LIGUE' },
  });

  // Competition: D1 Gazon 2025-2026
  const d1Gazon = await prisma.competition.upsert({
    where: { slug: 'd1-gazon-2025-2026' },
    update: {},
    create: {
      slug: 'd1-gazon-2025-2026',
      name: 'D1 Gazon',
      mode: 'GAZON',
      season: '2025-2026',
      category: 'Sénior',
    },
  });

  // D1 Salle 2026
  const d1Salle = await prisma.competition.upsert({
    where: { slug: 'd1-salle-2026' },
    update: {},
    create: {
      slug: 'd1-salle-2026',
      name: 'D1 Salle',
      mode: 'SALLE',
      season: '2026',
      category: 'Sénior',
    },
  });

  // Wipe existing matches/goals/standings for these competitions to allow re-seed
  await prisma.goal.deleteMany({ where: { match: { competitionId: { in: [d1Gazon.id, d1Salle.id] } } } });
  await prisma.match.deleteMany({ where: { competitionId: { in: [d1Gazon.id, d1Salle.id] } } });
  await prisma.standing.deleteMany({ where: { competitionId: { in: [d1Gazon.id, d1Salle.id] } } });

  // Standings GAZON
  const gazonStandings = [
    { slug: 'sdhc', rank: 1, played: 13, wins: 9, draws: 1, losses: 3, gf: 32, ga: 18, points: 28 },
    { slug: 'hhs',  rank: 2, played: 13, wins: 7, draws: 1, losses: 5, gf: 24, ga: 15, points: 22 },
    { slug: 'hco',  rank: 3, played: 13, wins: 6, draws: 2, losses: 5, gf: 22, ga: 16, points: 20 },
    { slug: 'uspg', rank: 4, played: 13, wins: 5, draws: 1, losses: 7, gf: 18, ga: 21, points: 16 },
    { slug: 'hcp',  rank: 5, played: 13, wins: 2, draws: 1, losses: 10, gf: 11, ga: 37, points: 7 },
  ];
  for (const s of gazonStandings) {
    await prisma.standing.create({
      data: {
        competitionId: d1Gazon.id,
        clubId: clubsBySlug[s.slug].id,
        rank: s.rank,
        played: s.played,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goalsFor: s.gf,
        goalsAgainst: s.ga,
        points: s.points,
      },
    });
  }

  // Standings SALLE
  const salleStandings = [
    { slug: 'sdhc', rank: 1, played: 6, wins: 6, draws: 0, losses: 0, gf: 24, ga: 13, points: 18 },
    { slug: 'uspg', rank: 2, played: 6, wins: 5, draws: 0, losses: 1, gf: 22, ga: 15, points: 15 },
    { slug: 'hcp',  rank: 3, played: 6, wins: 4, draws: 1, losses: 1, gf: 19, ga: 15, points: 13 },
    { slug: 'hhs',  rank: 4, played: 6, wins: 2, draws: 0, losses: 4, gf: 11, ga: 16, points: 6 },
    { slug: 'hco',  rank: 5, played: 6, wins: 1, draws: 0, losses: 5, gf: 9, ga: 26, points: 3 },
  ];
  for (const s of salleStandings) {
    await prisma.standing.create({
      data: {
        competitionId: d1Salle.id,
        clubId: clubsBySlug[s.slug].id,
        rank: s.rank,
        played: s.played,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goalsFor: s.gf,
        goalsAgainst: s.ga,
        points: s.points,
      },
    });
  }

  // Helper for dates relative to "now" (2026-05-13)
  const day = (offsetDays: number, hour = 14, min = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, min, 0, 0);
    return d;
  };

  // --- GAZON matches ---

  // Featured: match en cours (LIVE) — Match Choc J14
  const featured = await prisma.match.create({
    data: {
      competitionId: d1Gazon.id,
      homeClubId: clubsBySlug['uspg'].id,
      awayClubId: clubsBySlug['sdhc'].id,
      homeScore: 3,
      awayScore: 4,
      kickoffAt: day(0, 14, 0),
      venue: 'Stade Manès · Le Port',
      status: 'HALFTIME',
      matchday: 14,
      sponsorId: runMarket.id,
    },
  });

  // Last finished result — HCO 2 - 5 HHS (J13)
  const lastResult = await prisma.match.create({
    data: {
      competitionId: d1Gazon.id,
      homeClubId: clubsBySlug['hco'].id,
      awayClubId: clubsBySlug['hhs'].id,
      homeScore: 2,
      awayScore: 5,
      kickoffAt: day(-7, 17, 30),
      venue: 'Stade de la Palmeraie · Saint-Paul',
      status: 'FINISHED',
      matchday: 13,
      sponsorId: runMarket.id,
    },
  });

  // Goals for HCO 2-5 HHS — match the original mockup timeline
  const HCO = clubsBySlug['hco'].id;
  const HHS = clubsBySlug['hhs'].id;
  await prisma.goal.createMany({
    data: [
      { matchId: lastResult.id, scoringClubId: HHS, minute: 12, scorerName: 'A. Dimitile' },
      { matchId: lastResult.id, scoringClubId: HCO, minute: 28, scorerName: 'R. Lebreton' },
      { matchId: lastResult.id, scoringClubId: HHS, minute: 41, scorerName: 'A. Dimitile' },
      { matchId: lastResult.id, scoringClubId: HCO, minute: 55, scorerName: 'M. Dorseuil' },
      { matchId: lastResult.id, scoringClubId: HHS, minute: 67, scorerName: 'J. Hoarau' },
      { matchId: lastResult.id, scoringClubId: HHS, minute: 78, scorerName: 'B. Payet' },
      { matchId: lastResult.id, scoringClubId: HHS, minute: 84, scorerName: 'A. Dimitile' },
    ],
  });

  // Upcoming matches — J15
  await prisma.match.createMany({
    data: [
      {
        competitionId: d1Gazon.id,
        homeClubId: clubsBySlug['uspg'].id,
        awayClubId: clubsBySlug['sdhc'].id,
        kickoffAt: day(8, 15, 0),
        venue: 'Stade Manès · Le Port',
        status: 'SCHEDULED',
        matchday: 15,
      },
      {
        competitionId: d1Gazon.id,
        homeClubId: clubsBySlug['hhs'].id,
        awayClubId: clubsBySlug['hco'].id,
        kickoffAt: day(8, 17, 30),
        venue: 'Casabona · Le Tampon',
        status: 'SCHEDULED',
        matchday: 15,
      },
      {
        competitionId: d1Gazon.id,
        homeClubId: clubsBySlug['hcp'].id,
        awayClubId: clubsBySlug['sdhc'].id,
        kickoffAt: day(9, 10, 0),
        venue: 'Stade du Ravine à Malheur · La Possession',
        status: 'SCHEDULED',
        matchday: 15,
      },
      {
        competitionId: d1Gazon.id,
        homeClubId: clubsBySlug['hco'].id,
        awayClubId: clubsBySlug['uspg'].id,
        kickoffAt: day(9, 14, 0),
        venue: 'Stade de la Palmeraie · Saint-Paul',
        status: 'SCHEDULED',
        matchday: 15,
      },
    ],
  });

  // --- SALLE: one upcoming + one finished ---
  await prisma.match.create({
    data: {
      competitionId: d1Salle.id,
      homeClubId: clubsBySlug['sdhc'].id,
      awayClubId: clubsBySlug['uspg'].id,
      homeScore: 4,
      awayScore: 3,
      kickoffAt: day(-3, 19, 30),
      venue: 'Champ-Fleuri · Saint-Denis',
      status: 'FINISHED',
      matchday: 6,
    },
  });
  await prisma.match.create({
    data: {
      competitionId: d1Salle.id,
      homeClubId: clubsBySlug['hcp'].id,
      awayClubId: clubsBySlug['hhs'].id,
      kickoffAt: day(7, 19, 30),
      venue: 'Gymnase Casabona · Le Tampon',
      status: 'SCHEDULED',
      matchday: 7,
    },
  });

  // Update News article with sponsor (HCO domine SDHC 4-1) — link to the result match later if needed
  console.log('Seed competition: done.');
  console.log({
    featured: featured.id,
    lastResult: lastResult.id,
    competitions: [d1Gazon.id, d1Salle.id],
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
