/*
 * Seed saison 2025-2026 — import depuis docs/RESULTATS_DONNEES_2025-2026.md
 *
 * Lancer avec :   npx ts-node prisma/seed-2025-2026.ts
 *
 * Idempotent : upsert sur slug/shortCode. Les matchs sont identifiés par
 * (competition, homeClub, kickoffAt) — si déjà créés, on ne duplique pas.
 *
 * Les heures dans le doc sont en LOCAL Réunion (UTC+4). Ici, on crée les dates
 * en UTC en spécifiant explicitement l'offset `+04:00`.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined');
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────────────────
// Référentiels
// ─────────────────────────────────────────────────────────────────────────────

const SEASON = '2025-2026';

const CLUBS = [
  { shortCode: 'HCO', slug: 'hco', name: "Hockey Club de l'Ouest", city: 'Saint-Paul' },
  { shortCode: 'HCP', slug: 'hcp', name: 'Hockey Club Possessionnais', city: 'La Possession' },
  { shortCode: 'HCD', slug: 'hcd', name: 'Hockey Club de la Dominicaine', city: "L'Étang-Salé" },
  { shortCode: 'USPG', slug: 'uspg', name: 'Union Sportive Plaine Galets', city: 'Le Port' },
  { shortCode: 'SDHC', slug: 'sdhc', name: 'Saint-Denis Hockey Club', city: 'Saint-Denis' },
  { shortCode: 'HHS', slug: 'hhs', name: 'Hockey Horizon Sud', city: 'Le Tampon' },
] as const;

const ENTENTES = [
  {
    shortCode: 'HCP_HCD',
    slug: 'entente-hcp-hcd',
    name: 'Entente HCP / HCD',
    city: 'La Possession',
    parents: ['HCP', 'HCD'] as const,
  },
  {
    shortCode: 'SDHC_HHS',
    slug: 'entente-sdhc-hhs',
    name: 'Entente SDHC / HHS',
    city: 'Saint-Denis',
    parents: ['SDHC', 'HHS'] as const,
  },
] as const;

const VENUES = [
  {
    name: 'Complexe Gymnase Saint-Paul',
    city: 'Saint-Paul',
    supportsSalle: true,
    supportsGazon: false,
  },
  {
    name: 'Gymnase Daniel Narcisse',
    city: 'Saint-Denis',
    supportsSalle: true,
    supportsGazon: false,
  },
  {
    name: 'Stade de la Palmeraie',
    city: 'Saint-Paul',
    supportsSalle: false,
    supportsGazon: true,
  },
  {
    name: 'Stade de Manès',
    city: 'Le Port',
    supportsSalle: false,
    supportsGazon: true,
  },
  {
    name: 'Complexe de Bois Rouge — Ravine à Malheur',
    city: 'La Possession',
    supportsSalle: false,
    supportsGazon: true,
  },
] as const;

const COMPETITIONS = [
  {
    slug: 'championnat-regional-indoor-2025-2026',
    name: 'Championnat Régional Indoor',
    mode: 'SALLE' as const,
    season: SEASON,
    category: 'Sénior',
    format: 'CHAMPIONSHIP_PLAYOFFS' as const,
  },
  {
    slug: 'coupe-de-la-ligue-indoor-2025-2026',
    name: 'Coupe de la Ligue Indoor',
    mode: 'SALLE' as const,
    season: SEASON,
    category: 'Sénior',
    // Poule unique avec classement par points → CHAMPIONSHIP simple
    format: 'CHAMPIONSHIP' as const,
  },
  {
    slug: 'coupe-de-la-reunion-gazon-2025-2026',
    name: 'Coupe de la Réunion Gazon',
    mode: 'GAZON' as const,
    season: SEASON,
    category: 'Sénior',
    format: 'CUP' as const,
  },
] as const;

// Compétitions à supprimer si présentes en DB (avec leurs matchs/standings/entries).
// Utile quand on retire une compétition fictive ou erronée d'une saison déjà
// importée. Le slug est conservé ici comme trace historique.
const COMPETITIONS_TO_REMOVE: string[] = [
  // 2026-05-18 : retiré, n'a pas eu lieu en réalité
  'championnat-regional-gazon-2025-2026',
];

// Inscriptions par compétition (slug compétition → shortCodes clubs)
const ENTRIES: Record<string, readonly string[]> = {
  'championnat-regional-indoor-2025-2026': ['HCO', 'HCP', 'USPG', 'SDHC_HHS'],
  'coupe-de-la-ligue-indoor-2025-2026': ['HCO', 'HCP', 'USPG', 'SDHC_HHS'],
  'coupe-de-la-reunion-gazon-2025-2026': ['HCO', 'HCP_HCD', 'USPG'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Matchs — toutes les dates en heure LOCALE Réunion (UTC+4)
// ─────────────────────────────────────────────────────────────────────────────

type MatchInput = {
  competitionSlug: string;
  /** ISO sans timezone, heure LOCALE Réunion (sera convertie en UTC) */
  kickoffLocal: string;
  venueName: string;
  homeCode: string;
  awayCode: string;
  homeScore: number;
  awayScore: number;
  phase?: 'REGULAR' | 'THIRD_PLACE' | 'FINAL';
  matchday?: number;
};

const MATCHES: MatchInput[] = [
  // ─── 1. Championnat Régional Indoor (phase régulière, 12 matchs)
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-09-21T09:00', venueName: 'Complexe Gymnase Saint-Paul', homeCode: 'USPG', awayCode: 'HCO', homeScore: 5, awayScore: 7, matchday: 1 },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-09-21T10:00', venueName: 'Complexe Gymnase Saint-Paul', homeCode: 'SDHC_HHS', awayCode: 'HCP', homeScore: 3, awayScore: 5, matchday: 1 },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-09-21T11:30', venueName: 'Complexe Gymnase Saint-Paul', homeCode: 'HCO', awayCode: 'HCP', homeScore: 7, awayScore: 9, matchday: 1 },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-09-21T12:30', venueName: 'Complexe Gymnase Saint-Paul', homeCode: 'USPG', awayCode: 'SDHC_HHS', homeScore: 8, awayScore: 1, matchday: 1 },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-09-28T09:00', venueName: 'Gymnase Daniel Narcisse', homeCode: 'HCP', awayCode: 'USPG', homeScore: 5, awayScore: 4, matchday: 2 },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-09-28T10:00', venueName: 'Gymnase Daniel Narcisse', homeCode: 'SDHC_HHS', awayCode: 'HCO', homeScore: 4, awayScore: 11, matchday: 2 },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-09-28T11:30', venueName: 'Gymnase Daniel Narcisse', homeCode: 'HCO', awayCode: 'USPG', homeScore: 6, awayScore: 1, matchday: 2 },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-09-28T12:30', venueName: 'Gymnase Daniel Narcisse', homeCode: 'HCP', awayCode: 'SDHC_HHS', homeScore: 10, awayScore: 3, matchday: 2 },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-10-12T09:00', venueName: 'Gymnase Daniel Narcisse', homeCode: 'HCP', awayCode: 'HCO', homeScore: 4, awayScore: 3, matchday: 3 },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-10-12T10:00', venueName: 'Complexe Gymnase Saint-Paul', homeCode: 'SDHC_HHS', awayCode: 'USPG', homeScore: 7, awayScore: 8, matchday: 3 },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-10-12T11:00', venueName: 'Complexe Gymnase Saint-Paul', homeCode: 'USPG', awayCode: 'HCP', homeScore: 12, awayScore: 3, matchday: 3 },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-10-12T12:00', venueName: 'Complexe Gymnase Saint-Paul', homeCode: 'HCO', awayCode: 'SDHC_HHS', homeScore: 17, awayScore: 7, matchday: 3 },

  // ─── 2. Phase Finale Championnat Salle (3e place + finale, dimanche 26 oct 2025)
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-10-26T09:30', venueName: 'Complexe Gymnase Saint-Paul', homeCode: 'USPG', awayCode: 'SDHC_HHS', homeScore: 9, awayScore: 4, phase: 'THIRD_PLACE' },
  { competitionSlug: 'championnat-regional-indoor-2025-2026', kickoffLocal: '2025-10-26T11:00', venueName: 'Complexe Gymnase Saint-Paul', homeCode: 'HCO', awayCode: 'HCP', homeScore: 8, awayScore: 6, phase: 'FINAL' },

  // ─── 3. Coupe de la Ligue Indoor 2025-2026 (poule unique, 6 matchs, 18 janv 2026)
  { competitionSlug: 'coupe-de-la-ligue-indoor-2025-2026', kickoffLocal: '2026-01-18T08:30', venueName: 'Gymnase Daniel Narcisse', homeCode: 'HCO', awayCode: 'HCP', homeScore: 8, awayScore: 2 },
  { competitionSlug: 'coupe-de-la-ligue-indoor-2025-2026', kickoffLocal: '2026-01-18T09:15', venueName: 'Gymnase Daniel Narcisse', homeCode: 'USPG', awayCode: 'SDHC_HHS', homeScore: 6, awayScore: 4 },
  { competitionSlug: 'coupe-de-la-ligue-indoor-2025-2026', kickoffLocal: '2026-01-18T10:00', venueName: 'Gymnase Daniel Narcisse', homeCode: 'HCP', awayCode: 'SDHC_HHS', homeScore: 6, awayScore: 6 },
  { competitionSlug: 'coupe-de-la-ligue-indoor-2025-2026', kickoffLocal: '2026-01-18T10:45', venueName: 'Gymnase Daniel Narcisse', homeCode: 'HCO', awayCode: 'USPG', homeScore: 3, awayScore: 3 },
  { competitionSlug: 'coupe-de-la-ligue-indoor-2025-2026', kickoffLocal: '2026-01-18T11:30', venueName: 'Gymnase Daniel Narcisse', homeCode: 'SDHC_HHS', awayCode: 'HCO', homeScore: 3, awayScore: 8 },
  { competitionSlug: 'coupe-de-la-ligue-indoor-2025-2026', kickoffLocal: '2026-01-18T12:15', venueName: 'Gymnase Daniel Narcisse', homeCode: 'USPG', awayCode: 'HCP', homeScore: 3, awayScore: 3 },

  // Championnat Régional Gazon retiré 2026-05-18 — compétition fictive,
  // n'a pas eu lieu en réalité côté Ligue. Voir COMPETITIONS_TO_REMOVE.
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toUtc(localIso: string): Date {
  // localIso : "2025-09-21T09:00" en heure Réunion (UTC+4)
  return new Date(`${localIso}:00+04:00`);
}

async function upsertClubs() {
  const map = new Map<string, string>(); // shortCode → id
  for (const c of CLUBS) {
    const club = await prisma.club.upsert({
      where: { slug: c.slug },
      update: { shortCode: c.shortCode, name: c.name, city: c.city, kind: 'STANDALONE' },
      create: { slug: c.slug, shortCode: c.shortCode, name: c.name, city: c.city, kind: 'STANDALONE' },
    });
    map.set(c.shortCode, club.id);
  }
  for (const e of ENTENTES) {
    const parentIds = e.parents.map((code) => {
      const id = map.get(code);
      if (!id) throw new Error(`Parent club ${code} introuvable`);
      return { id };
    });
    const ent = await prisma.club.upsert({
      where: { slug: e.slug },
      update: {
        shortCode: e.shortCode,
        name: e.name,
        city: e.city,
        kind: 'ENTENTE',
        parentClubs: { set: parentIds },
      },
      create: {
        slug: e.slug,
        shortCode: e.shortCode,
        name: e.name,
        city: e.city,
        kind: 'ENTENTE',
        parentClubs: { connect: parentIds },
      },
    });
    map.set(e.shortCode, ent.id);
  }
  return map;
}

async function upsertVenues() {
  const map = new Map<string, string>(); // name → id
  for (const v of VENUES) {
    // Pas de unique sur name dans le schéma, mais on déduplique par nom
    const existing = await prisma.venue.findFirst({ where: { name: v.name } });
    if (existing) {
      const updated = await prisma.venue.update({
        where: { id: existing.id },
        data: {
          city: v.city,
          supportsSalle: v.supportsSalle,
          supportsGazon: v.supportsGazon,
        },
      });
      map.set(v.name, updated.id);
    } else {
      const created = await prisma.venue.create({
        data: {
          name: v.name,
          city: v.city,
          supportsSalle: v.supportsSalle,
          supportsGazon: v.supportsGazon,
        },
      });
      map.set(v.name, created.id);
    }
  }
  return map;
}

async function upsertCompetitions() {
  const map = new Map<string, string>(); // slug → id
  for (const c of COMPETITIONS) {
    const comp = await prisma.competition.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        mode: c.mode,
        season: c.season,
        category: c.category,
        format: c.format,
      },
      create: c,
    });
    map.set(c.slug, comp.id);
  }
  return map;
}

async function upsertEntries(clubMap: Map<string, string>, compMap: Map<string, string>) {
  for (const [compSlug, codes] of Object.entries(ENTRIES)) {
    const competitionId = compMap.get(compSlug);
    if (!competitionId) continue;
    for (const code of codes) {
      const clubId = clubMap.get(code);
      if (!clubId) {
        console.warn(`  · entry skip : club ${code} introuvable`);
        continue;
      }
      await prisma.competitionEntry.upsert({
        where: { competitionId_clubId: { competitionId, clubId } },
        update: {},
        create: { competitionId, clubId },
      });
    }
  }
}

async function upsertMatches(
  clubMap: Map<string, string>,
  compMap: Map<string, string>,
  venueMap: Map<string, string>,
) {
  let created = 0;
  let updated = 0;
  for (const m of MATCHES) {
    const competitionId = compMap.get(m.competitionSlug);
    const homeClubId = clubMap.get(m.homeCode);
    const awayClubId = clubMap.get(m.awayCode);
    const venueId = venueMap.get(m.venueName) ?? null;
    if (!competitionId || !homeClubId || !awayClubId) {
      console.warn(`  · match skip : reference manquante (${m.competitionSlug} / ${m.homeCode} vs ${m.awayCode})`);
      continue;
    }
    const kickoffAt = toUtc(m.kickoffLocal);
    const existing = await prisma.match.findFirst({
      where: { competitionId, homeClubId, awayClubId, kickoffAt },
    });
    const data = {
      competitionId,
      homeClubId,
      awayClubId,
      kickoffAt,
      venueId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: 'FINISHED' as const,
      matchday: m.matchday ?? null,
      phase: m.phase ?? ('REGULAR' as const),
    };
    if (existing) {
      await prisma.match.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.match.create({ data });
      created++;
    }
  }
  return { created, updated };
}

/** Supprime les compétitions listées dans COMPETITIONS_TO_REMOVE, ainsi que
 *  leurs matchs / standings / entries en cascade. Idempotent (skip si absent). */
async function removeObsoleteCompetitions() {
  let removed = 0;
  for (const slug of COMPETITIONS_TO_REMOVE) {
    const comp = await prisma.competition.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });
    if (!comp) continue;
    // Goal a FK vers Match (onDelete: Cascade côté schema), donc deleteMany
    // sur Match suffit pour aussi nettoyer les buts. Les MatchReferee et
    // MatchNote sont également en cascade depuis Match.
    await prisma.$transaction([
      prisma.match.deleteMany({ where: { competitionId: comp.id } }),
      prisma.standing.deleteMany({ where: { competitionId: comp.id } }),
      prisma.competitionEntry.deleteMany({ where: { competitionId: comp.id } }),
      prisma.memberCompetitionStats.deleteMany({ where: { competitionId: comp.id } }),
      prisma.competition.delete({ where: { id: comp.id } }),
    ]);
    console.log(`    supprimé : « ${comp.name} » (${slug})`);
    removed++;
  }
  return removed;
}

/** Recalcule les standings à partir des matchs FINISHED phase=REGULAR. */
async function recomputeStandings(competitionId: string) {
  const matches = await prisma.match.findMany({
    where: { competitionId, status: 'FINISHED', phase: 'REGULAR' },
    select: {
      homeClubId: true,
      awayClubId: true,
      homeScore: true,
      awayScore: true,
    },
  });

  const entries = await prisma.competitionEntry.findMany({
    where: { competitionId },
    select: { clubId: true },
  });
  const clubIds = entries.map((e) => e.clubId);

  type Row = {
    clubId: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  };
  const rows = new Map<string, Row>();
  for (const id of clubIds) {
    rows.set(id, {
      clubId: id,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    const hs = m.homeScore ?? 0;
    const as = m.awayScore ?? 0;
    const h = rows.get(m.homeClubId);
    const a = rows.get(m.awayClubId);
    if (!h || !a) continue;
    h.played++;
    a.played++;
    h.goalsFor += hs;
    h.goalsAgainst += as;
    a.goalsFor += as;
    a.goalsAgainst += hs;
    if (hs > as) {
      h.wins++;
      h.points += 3;
      a.losses++;
    } else if (hs < as) {
      a.wins++;
      a.points += 3;
      h.losses++;
    } else {
      h.draws++;
      a.draws++;
      h.points += 1;
      a.points += 1;
    }
  }

  const sorted = Array.from(rows.values()).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    const dx = x.goalsFor - x.goalsAgainst;
    const dy = y.goalsFor - y.goalsAgainst;
    if (dy !== dx) return dy - dx;
    if (y.goalsFor !== x.goalsFor) return y.goalsFor - x.goalsFor;
    return x.clubId.localeCompare(y.clubId);
  });

  // Supprime puis recrée (transaction)
  await prisma.$transaction([
    prisma.standing.deleteMany({ where: { competitionId } }),
    ...sorted.map((r, i) =>
      prisma.standing.create({
        data: {
          competitionId,
          clubId: r.clubId,
          rank: i + 1,
          played: r.played,
          wins: r.wins,
          draws: r.draws,
          losses: r.losses,
          goalsFor: r.goalsFor,
          goalsAgainst: r.goalsAgainst,
          points: r.points,
        },
      }),
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('▸ Saison 2025-2026 — import démarré');

  if (COMPETITIONS_TO_REMOVE.length > 0) {
    console.log('  · nettoyage compétitions obsolètes…');
    const removed = await removeObsoleteCompetitions();
    if (removed === 0) console.log('    (aucune trouvée)');
  }

  console.log('  · upsert clubs + ententes…');
  const clubMap = await upsertClubs();
  console.log(`    ${clubMap.size} clubs (incluant ${ENTENTES.length} ententes)`);

  console.log('  · upsert venues…');
  const venueMap = await upsertVenues();
  console.log(`    ${venueMap.size} lieux`);

  console.log('  · upsert compétitions…');
  const compMap = await upsertCompetitions();
  console.log(`    ${compMap.size} compétitions`);

  console.log('  · upsert inscriptions…');
  await upsertEntries(clubMap, compMap);

  console.log('  · upsert matchs…');
  const { created, updated } = await upsertMatches(clubMap, compMap, venueMap);
  console.log(`    créés=${created} · maj=${updated} · total=${MATCHES.length}`);

  console.log('  · recalcul standings…');
  for (const compId of compMap.values()) {
    await recomputeStandings(compId);
  }

  console.log('✓ Import terminé.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
