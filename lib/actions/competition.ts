'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MatchStatus, Mode } from "@prisma/client";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");
  return session;
}

async function requireAdmin() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Réservé aux administrateurs");
  return session;
}

function revalidateMatch() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/matches");
  revalidatePath("/dashboard/standings");
  revalidatePath("/dashboard/competitions");
  revalidatePath("/competitions");
  revalidatePath("/classements");
  revalidatePath("/");
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const MatchUpdateSchema = z.object({
  homeClubId: z.string().min(1).optional(),
  awayClubId: z.string().min(1).optional(),
  homeScore: z.number().int().min(0).optional().nullable(),
  awayScore: z.number().int().min(0).optional().nullable(),
  status: z.enum(["SCHEDULED", "LIVE", "HALFTIME", "FINISHED", "POSTPONED", "CANCELLED"]).optional(),
  venue: z.string().optional().nullable(),
  venueId: z.string().optional().nullable(),
  matchday: z.number().int().min(0).optional().nullable(),
  phase: z.enum(["REGULAR", "R32", "R16", "QUARTER", "SEMI", "THIRD_PLACE", "FINAL"]).optional(),
  kickoffAt: z.coerce.date().optional(),
  // Si fourni, REMPLACE l'intégralité des arbitres du match.
  referees: z.array(z.object({
    refereeId: z.string().min(1),
    role: z.enum(["PRINCIPAL", "DELEGUE"]).default("PRINCIPAL"),
  })).optional(),
}).refine(
  (d) => !d.homeClubId || !d.awayClubId || d.homeClubId !== d.awayClubId,
  { message: "Le club domicile et le visiteur doivent être différents.", path: ["awayClubId"] },
).refine((d) => {
  if (!d.referees) return true;
  const principals = d.referees.filter((r) => r.role === "PRINCIPAL").length;
  const delegues = d.referees.filter((r) => r.role === "DELEGUE").length;
  return principals <= 2 && delegues <= 1;
}, {
  message: "Maximum 2 arbitres principaux et 1 délégué.",
  path: ["referees"],
});

export type MatchUpdateInput = z.infer<typeof MatchUpdateSchema>;

export async function updateMatch(id: string, input: MatchUpdateInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");
  const data = MatchUpdateSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, clubId: true },
  });

  const match = await prisma.match.findUnique({
    where: { id },
    select: { homeClubId: true, awayClubId: true, competitionId: true, status: true },
  });
  if (!match) throw new Error("Match non trouvé");

  if (user?.role !== "ADMIN" && user?.clubId !== match.homeClubId && user?.clubId !== match.awayClubId) {
    throw new Error("Non autorisé à modifier ce match");
  }

  // Only admins can change which clubs are involved.
  if ((data.homeClubId || data.awayClubId) && user?.role !== "ADMIN") {
    throw new Error("Seuls les administrateurs peuvent modifier les équipes d'un match");
  }

  const payload: Record<string, unknown> = {};
  if (data.homeClubId !== undefined) payload.homeClubId = data.homeClubId;
  if (data.awayClubId !== undefined) payload.awayClubId = data.awayClubId;
  if (data.homeScore !== undefined) payload.homeScore = data.homeScore;
  if (data.awayScore !== undefined) payload.awayScore = data.awayScore;
  if (data.status !== undefined) payload.status = data.status;
  if (data.venue !== undefined) payload.venue = data.venue || null;
  if (data.venueId !== undefined) payload.venueId = data.venueId || null;
  if (data.matchday !== undefined) payload.matchday = data.matchday;
  if (data.phase !== undefined) payload.phase = data.phase;
  if (data.kickoffAt !== undefined) payload.kickoffAt = data.kickoffAt;

  // Si on touche aux arbitres, on remplace l'intégralité — c'est plus simple et
  // les arbitres sont toujours présentés en bloc dans l'UI.
  if (data.referees !== undefined) {
    if (user?.role !== "ADMIN") {
      throw new Error("Seuls les administrateurs peuvent modifier les arbitres");
    }
    await prisma.matchReferee.deleteMany({ where: { matchId: id } });
    if (data.referees.length > 0) {
      await prisma.matchReferee.createMany({
        data: data.referees.map((r) => ({ matchId: id, refereeId: r.refereeId, role: r.role })),
      });
    }
  }

  const updatedMatch = await prisma.match.update({ where: { id }, data: payload as any });

  // Standings need recompute when status changes around FINISHED, or when
  // scores/clubs of a previously FINISHED match are touched.
  const becameFinished = data.status === "FINISHED";
  const leftFinished = match.status === "FINISHED" && data.status && data.status !== "FINISHED";
  const editedFinishedFields =
    match.status === "FINISHED" &&
    (data.homeScore !== undefined ||
      data.awayScore !== undefined ||
      data.homeClubId !== undefined ||
      data.awayClubId !== undefined);
  if (becameFinished || leftFinished || editedFinishedFields) {
    await updateStandings(match.competitionId);
  }

  revalidateMatch();
  return updatedMatch;
}

export async function updateStandings(competitionId: string) {
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

export async function getCompetitions() {
  return prisma.competition.findMany({
    orderBy: { season: 'desc' }
  });
}

export async function getMatches(competitionId: string) {
  return prisma.match.findMany({
    where: { competitionId },
    include: {
      homeClub: true,
      awayClub: true,
      sponsor: true
    },
    orderBy: { kickoffAt: 'asc' }
  });
}

/* ─────────────────────── MATCH CRUD ─────────────────────── */

const MatchRefereeInputSchema = z.object({
  refereeId: z.string().min(1),
  role: z.enum(["PRINCIPAL", "DELEGUE"]).default("PRINCIPAL"),
});

const MatchCreateSchema = z.object({
  competitionId: z.string().min(1, "Compétition requise"),
  homeClubId: z.string().min(1, "Club domicile requis"),
  awayClubId: z.string().min(1, "Club visiteur requis"),
  kickoffAt: z.coerce.date(),
  venue: z.string().nullable().optional().or(z.literal("")),
  venueId: z.string().nullable().optional(),
  matchday: z.number().int().min(0).nullable().optional(),
  phase: z.enum(["REGULAR", "R32", "R16", "QUARTER", "SEMI", "THIRD_PLACE", "FINAL"]).default("REGULAR"),
  status: z.enum(["SCHEDULED", "LIVE", "HALFTIME", "FINISHED", "POSTPONED", "CANCELLED"]).default("SCHEDULED"),
  homeScore: z.number().int().min(0).nullable().optional(),
  awayScore: z.number().int().min(0).nullable().optional(),
  referees: z.array(MatchRefereeInputSchema).optional(),
}).refine((d) => d.homeClubId !== d.awayClubId, {
  message: "Le club domicile et le visiteur doivent être différents.",
  path: ["awayClubId"],
}).refine((d) => {
  if (!d.referees) return true;
  const principals = d.referees.filter((r) => r.role === "PRINCIPAL").length;
  const delegues = d.referees.filter((r) => r.role === "DELEGUE").length;
  return principals <= 2 && delegues <= 1;
}, {
  message: "Maximum 2 arbitres principaux et 1 délégué.",
  path: ["referees"],
});

export type MatchCreateInput = z.infer<typeof MatchCreateSchema>;

export async function createMatch(input: MatchCreateInput) {
  const session = await requireAuth();
  const data = MatchCreateSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { role: true, clubId: true },
  });

  // Authorisation : ADMIN OU appartenant à l'un des deux clubs
  if (user?.role !== "ADMIN" && user?.clubId !== data.homeClubId && user?.clubId !== data.awayClubId) {
    throw new Error("Non autorisé à créer ce match");
  }

  // Si la compétition a des inscrits déclarés, on s'assure que les deux clubs
  // en font partie. Si aucune inscription n'a été enregistrée, mode permissif
  // (rétrocompat avec les compétitions créées avant Phase B).
  const entries = await prisma.competitionEntry.findMany({
    where: { competitionId: data.competitionId },
    select: { clubId: true },
  });
  if (entries.length > 0) {
    const registeredIds = new Set(entries.map((e) => e.clubId));
    if (!registeredIds.has(data.homeClubId) || !registeredIds.has(data.awayClubId)) {
      throw new Error("Un des deux clubs n'est pas inscrit à cette compétition.");
    }
  }

  const match = await prisma.match.create({
    data: {
      competitionId: data.competitionId,
      homeClubId: data.homeClubId,
      awayClubId: data.awayClubId,
      kickoffAt: data.kickoffAt,
      venue: data.venue || null,
      venueId: data.venueId || null,
      matchday: data.matchday ?? null,
      phase: data.phase,
      status: data.status,
      homeScore: data.homeScore ?? null,
      awayScore: data.awayScore ?? null,
      referees: data.referees && data.referees.length > 0
        ? { create: data.referees.map((r) => ({ refereeId: r.refereeId, role: r.role })) }
        : undefined,
    },
  });

  if (data.status === "FINISHED") {
    await updateStandings(data.competitionId);
  }

  revalidateMatch();
  return match;
}

export async function deleteMatch(id: string) {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { role: true, clubId: true },
  });

  const match = await prisma.match.findUnique({
    where: { id },
    select: { homeClubId: true, awayClubId: true, competitionId: true },
  });
  if (!match) throw new Error("Match introuvable");

  if (user?.role !== "ADMIN" && user?.clubId !== match.homeClubId && user?.clubId !== match.awayClubId) {
    throw new Error("Non autorisé à supprimer ce match");
  }

  await prisma.goal.deleteMany({ where: { matchId: id } });
  await prisma.match.delete({ where: { id } });
  await updateStandings(match.competitionId);

  revalidateMatch();
}

/* ─────────────────────── COMPETITION CRUD (ADMIN) ─────────────────────── */

const CompetitionSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  slug: z.string().optional(),
  mode: z.enum(["GAZON", "SALLE"]),
  season: z.string().min(1, "Saison requise"),
  category: z.string().min(1, "Catégorie requise").default("Sénior"),
  format: z
    .enum(["CHAMPIONSHIP", "CHAMPIONSHIP_PLAYOFFS", "CUP"])
    .default("CHAMPIONSHIP"),
});

export type CompetitionInput = z.infer<typeof CompetitionSchema>;

export async function listCompetitionsAdmin() {
  await requireAuth();
  return prisma.competition.findMany({
    orderBy: [{ season: "desc" }, { mode: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      mode: true,
      season: true,
      category: true,
      format: true,
      _count: { select: { matches: true, standings: true, entries: true } },
    },
  });
}

// Pour le form match : map { competitionId → clubId[] }. Si la compétition
// n'a aucune entrée, le filtre est ignoré côté UI (mode legacy).
export async function listAllCompetitionEntries() {
  await requireAuth();
  const rows = await prisma.competitionEntry.findMany({
    select: { competitionId: true, clubId: true },
  });
  const map: Record<string, string[]> = {};
  for (const r of rows) {
    if (!map[r.competitionId]) map[r.competitionId] = [];
    map[r.competitionId].push(r.clubId);
  }
  return map;
}

export async function listCompetitionEntries(competitionId: string) {
  await requireAuth();
  return prisma.competitionEntry.findMany({
    where: { competitionId },
    orderBy: { club: { name: "asc" } },
    select: {
      id: true,
      registeredAt: true,
      club: {
        select: {
          id: true,
          slug: true,
          shortCode: true,
          name: true,
          city: true,
          kind: true,
        },
      },
    },
  });
}

export type CompetitionEntryRow = Awaited<ReturnType<typeof listCompetitionEntries>>[number];

export async function addCompetitionEntry(competitionId: string, clubId: string) {
  await requireAdmin();

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true },
  });
  if (!competition) throw new Error("Compétition introuvable");

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true },
  });
  if (!club) throw new Error("Club introuvable");

  // L'unique constraint (competitionId, clubId) garantit l'idempotence — on
  // ignore l'erreur si déjà inscrit.
  try {
    await prisma.competitionEntry.create({
      data: { competitionId, clubId },
    });
  } catch (e: any) {
    if (e?.code !== "P2002") throw e; // P2002 = unique violation
  }

  // Auto-init Standing à 0 pour ce club si pas encore présent
  await prisma.standing.upsert({
    where: { competitionId_clubId: { competitionId, clubId } },
    update: {},
    create: {
      competitionId,
      clubId,
      rank: 0, // sera recalculé lors du 1er FINISHED
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    },
  });

  revalidateMatch();
}

export async function removeCompetitionEntry(competitionId: string, clubId: string) {
  await requireAdmin();

  // Empêcher la désinscription si le club a déjà joué dans cette compétition
  const matchCount = await prisma.match.count({
    where: {
      competitionId,
      OR: [{ homeClubId: clubId }, { awayClubId: clubId }],
    },
  });
  if (matchCount > 0) {
    throw new Error(
      `Ce club a ${matchCount} match${matchCount > 1 ? "s" : ""} dans la compétition. Supprimez-les avant de désinscrire.`,
    );
  }

  await prisma.competitionEntry.deleteMany({
    where: { competitionId, clubId },
  });
  // Supprime le Standing fantôme (puisque le club n'a joué aucun match)
  await prisma.standing.deleteMany({
    where: { competitionId, clubId },
  });
  revalidateMatch();
}

export async function listClubsForAdmin() {
  await requireAuth();
  return prisma.club.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      shortCode: true,
      name: true,
      city: true,
      homeVenueGazonId: true,
      homeVenueSalleId: true,
    },
  });
}

export async function listMatchesAdmin(opts?: { clubId?: string }) {
  await requireAuth();
  return prisma.match.findMany({
    where: opts?.clubId
      ? { OR: [{ homeClubId: opts.clubId }, { awayClubId: opts.clubId }] }
      : undefined,
    orderBy: { kickoffAt: "desc" },
    select: {
      id: true,
      kickoffAt: true,
      venue: true,
      venueId: true,
      status: true,
      matchday: true,
      phase: true,
      homeScore: true,
      awayScore: true,
      homeClubId: true,
      awayClubId: true,
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      awayClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      competition: {
        select: { id: true, name: true, mode: true, category: true, season: true, format: true },
      },
      venueRef: { select: { id: true, name: true, city: true } },
      referees: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: {
          role: true,
          referee: { select: { id: true, fullName: true, license: true } },
        },
      },
      _count: { select: { notes: true } },
    },
  });
}

export async function createCompetition(input: CompetitionInput) {
  await requireAdmin();
  const data = CompetitionSchema.parse(input);
  const slug = data.slug?.trim() || slugify(`${data.name}-${data.season}`);
  const created = await prisma.competition.create({
    data: {
      slug,
      name: data.name.trim(),
      mode: data.mode as Mode,
      season: data.season.trim(),
      category: data.category.trim(),
      format: data.format,
    },
  });
  revalidateMatch();
  return created;
}

export async function updateCompetition(id: string, input: Partial<CompetitionInput>) {
  await requireAdmin();
  const data = CompetitionSchema.partial().parse(input);
  const payload: Record<string, unknown> = {};
  if (data.name) payload.name = data.name.trim();
  if (data.slug) payload.slug = slugify(data.slug);
  if (data.mode) payload.mode = data.mode;
  if (data.season) payload.season = data.season.trim();
  if (data.category) payload.category = data.category.trim();
  if (data.format) payload.format = data.format;
  const updated = await prisma.competition.update({ where: { id }, data: payload as any });
  revalidateMatch();
  return updated;
}

/* ─────────────────────── BRACKET AUTO-GENERATION ─────────────────────── */

const BracketSchema = z.object({
  teamCount: z.union([z.literal(4), z.literal(8), z.literal(16), z.literal(32)]),
  includeThirdPlace: z.boolean().default(true),
  startDate: z.coerce.date().optional(),
  weekInterval: z.number().int().min(1).max(8).default(1),
});

export type GenerateBracketInput = z.infer<typeof BracketSchema>;

/**
 * Génère automatiquement les matchs du bracket d'une compétition.
 *
 * Source des seeds :
 *   - CHAMPIONSHIP_PLAYOFFS : top N du classement régulier (Standing.rank).
 *   - CUP : N premiers inscrits (CompetitionEntry).
 *
 * Première manche : seedé classiquement (1 vs N, 2 vs N-1, etc.). Les manches
 * suivantes sont créées avec des **placeholders** (les seeds 1 et 2 par défaut)
 * que l'admin éditera au fur et à mesure que les vainqueurs sont connus. C'est
 * un compromis : Match.homeClubId/awayClubId étant required, on ne peut pas
 * laisser ces matchs "vides", mais l'admin a la structure pré-créée.
 *
 * Refuse si :
 *   - Compétition introuvable ou format CHAMPIONSHIP
 *   - Un bracket existe déjà (matchs phase != REGULAR présents)
 *   - Pas assez de clubs sources (standings ou entries)
 */
export async function generateBracket(competitionId: string, input: GenerateBracketInput) {
  await requireAdmin();
  const opts = BracketSchema.parse(input);

  const comp = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: {
      id: true,
      format: true,
      name: true,
      standings: {
        orderBy: { rank: 'asc' },
        select: { clubId: true, rank: true },
      },
      entries: {
        orderBy: { registeredAt: 'asc' },
        select: { clubId: true },
      },
    },
  });
  if (!comp) throw new Error('Compétition introuvable');
  if (comp.format === 'CHAMPIONSHIP') {
    throw new Error(
      'La génération de bracket est réservée aux formats Coupe et Championnat + Playoffs.',
    );
  }

  const existingBracket = await prisma.match.count({
    where: { competitionId, phase: { not: 'REGULAR' } },
  });
  if (existingBracket > 0) {
    throw new Error(
      `Un bracket existe déjà (${existingBracket} match${existingBracket > 1 ? 's' : ''} de phase finale). Supprimez-les avant de regénérer.`,
    );
  }

  // Sélection des seeds
  let seedClubIds: string[];
  if (comp.format === 'CHAMPIONSHIP_PLAYOFFS') {
    if (comp.standings.length < opts.teamCount) {
      throw new Error(
        `Classement insuffisant : ${comp.standings.length} club${comp.standings.length > 1 ? 's' : ''} classé${comp.standings.length > 1 ? 's' : ''}, ${opts.teamCount} requis pour le bracket. Mettez à jour le classement régulier d'abord.`,
      );
    }
    seedClubIds = comp.standings.slice(0, opts.teamCount).map((s) => s.clubId);
  } else {
    if (comp.entries.length < opts.teamCount) {
      throw new Error(
        `Inscrits insuffisants : ${comp.entries.length} club${comp.entries.length > 1 ? 's' : ''} inscrit${comp.entries.length > 1 ? 's' : ''}, ${opts.teamCount} requis pour le bracket. Inscrivez davantage de clubs d'abord.`,
      );
    }
    seedClubIds = comp.entries.slice(0, opts.teamCount).map((e) => e.clubId);
  }

  // Chaîne de phases nécessaires en partant de teamCount
  const phaseChain: ('R32' | 'R16' | 'QUARTER' | 'SEMI' | 'FINAL')[] = [];
  if (opts.teamCount >= 32) phaseChain.push('R32');
  if (opts.teamCount >= 16) phaseChain.push('R16');
  if (opts.teamCount >= 8) phaseChain.push('QUARTER');
  if (opts.teamCount >= 4) phaseChain.push('SEMI');
  phaseChain.push('FINAL');

  const baseDate = opts.startDate ?? new Date();
  // Normaliser à 19:00 locale par défaut (heure type pour un match en semaine)
  baseDate.setHours(19, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const weekStepMs = opts.weekInterval * 7 * dayMs;

  // Première manche : seed classique 1vN, 2v(N-1), ...
  const firstPairs: Array<[string, string]> = [];
  for (let i = 0; i < opts.teamCount / 2; i++) {
    firstPairs.push([seedClubIds[i], seedClubIds[opts.teamCount - 1 - i]]);
  }

  const matchesToCreate: Array<{
    competitionId: string;
    homeClubId: string;
    awayClubId: string;
    phase: 'R32' | 'R16' | 'QUARTER' | 'SEMI' | 'THIRD_PLACE' | 'FINAL';
    kickoffAt: Date;
    status: 'SCHEDULED';
  }> = [];

  for (let phaseIdx = 0; phaseIdx < phaseChain.length; phaseIdx++) {
    const phase = phaseChain[phaseIdx];
    const kickoff = new Date(baseDate.getTime() + phaseIdx * weekStepMs);
    if (phaseIdx === 0) {
      for (const [home, away] of firstPairs) {
        matchesToCreate.push({
          competitionId,
          homeClubId: home,
          awayClubId: away,
          phase,
          kickoffAt: kickoff,
          status: 'SCHEDULED',
        });
      }
    } else {
      // Nb de matchs à cette phase = matchs précédents / 2
      const prevMatches = matchesToCreate.filter((m) => m.phase === phaseChain[phaseIdx - 1]).length;
      const matchesAtPhase = prevMatches / 2;
      for (let i = 0; i < matchesAtPhase; i++) {
        matchesToCreate.push({
          competitionId,
          // Placeholder : on prend deux seeds distincts pour éviter
          // l'erreur "même club domicile et visiteur".
          homeClubId: seedClubIds[i * 2 % opts.teamCount],
          awayClubId: seedClubIds[(i * 2 + 1) % opts.teamCount],
          phase,
          kickoffAt: kickoff,
          status: 'SCHEDULED',
        });
      }
    }
  }

  // 3e place : programmé en même temps que la finale (typique des coupes)
  if (opts.includeThirdPlace && opts.teamCount >= 4) {
    const finalKickoff = new Date(baseDate.getTime() + (phaseChain.length - 1) * weekStepMs);
    // 1h avant la finale pour ne pas avoir deux matchs strictement simultanés
    const thirdPlaceKickoff = new Date(finalKickoff.getTime() - 2 * 60 * 60 * 1000);
    matchesToCreate.push({
      competitionId,
      homeClubId: seedClubIds[2],
      awayClubId: seedClubIds[3],
      phase: 'THIRD_PLACE',
      kickoffAt: thirdPlaceKickoff,
      status: 'SCHEDULED',
    });
  }

  await prisma.$transaction(matchesToCreate.map((m) => prisma.match.create({ data: m })));

  revalidateMatch();
  return {
    created: matchesToCreate.length,
    competitionName: comp.name,
  };
}

/**
 * Supprime tous les matchs de phase finale (phase != REGULAR) d'une compétition.
 * Utile pour réinitialiser un bracket mal généré.
 */
export async function deleteBracket(competitionId: string) {
  await requireAdmin();
  const deleted = await prisma.match.deleteMany({
    where: { competitionId, phase: { not: 'REGULAR' } },
  });
  revalidateMatch();
  return { deleted: deleted.count };
}

export async function deleteCompetition(id: string) {
  await requireAdmin();
  const matchCount = await prisma.match.count({ where: { competitionId: id } });
  if (matchCount > 0) {
    throw new Error(`Cette compétition contient ${matchCount} match${matchCount > 1 ? 's' : ''}. Supprimez-les d'abord.`);
  }
  await prisma.standing.deleteMany({ where: { competitionId: id } });
  await prisma.competition.delete({ where: { id } });
  revalidateMatch();
}

export type CompetitionAdminRow = Awaited<ReturnType<typeof listCompetitionsAdmin>>[number];
export type ClubForAdmin = Awaited<ReturnType<typeof listClubsForAdmin>>[number];
export type AdminMatchRow = Awaited<ReturnType<typeof listMatchesAdmin>>[number];
