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
