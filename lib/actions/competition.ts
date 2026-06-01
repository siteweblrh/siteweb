'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MatchStatus, Mode } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { parseReunionDateAndTime, reunionDayKey } from "@/lib/utils/datetime-reunion";
import { isPhaseAllowedForFormat } from "@/lib/utils/match-phase";

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
  revalidatePath("/dashboard/matches/calendar");
  revalidatePath("/dashboard/standings");
  revalidatePath("/dashboard/competitions");
  revalidatePath("/competitions");
  revalidatePath("/classements");
  revalidatePath("/");
  // Pages dynamiques : un changement de match touche AUSSI la fiche club
  // (/clubs/[slug] affiche le calendrier du club) et la page match elle-même
  // (/match/[id]). La syntaxe ('/path/[param]', 'page') invalide toutes
  // les variantes dynamiques de cette page en un appel — pas besoin de
  // connaître les slugs/ids exacts.
  revalidatePath("/clubs/[slug]", "page");
  revalidatePath("/match/[id]", "page");
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
  // 1 = aller, 2 = retour, null = match simple.
  leg: z.number().int().min(1).max(2).nullable().optional(),
  kickoffAt: z.coerce.date().optional(),
  organizerClubId: z.string().optional().nullable(),
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
    select: {
      homeClubId: true,
      awayClubId: true,
      competitionId: true,
      status: true,
      competition: { select: { format: true } },
    },
  });
  if (!match) throw new Error("Match non trouvé");

  // Garde-fou : une phase finale (≠ REGULAR) sur un championnat PUR rendrait le
  // match invisible (ignoré par le classement ET par le bracket). On refuse.
  if (data.phase !== undefined && !isPhaseAllowedForFormat(data.phase, match.competition.format)) {
    throw new Error(
      "Un championnat sans phase finale n'accepte que des matchs en « Phase régulière ». " +
        "Pour des matchs à élimination, créez la compétition au format Coupe ou Championnat + phase finale.",
    );
  }

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
  if (data.leg !== undefined) payload.leg = data.leg;
  if (data.kickoffAt !== undefined) payload.kickoffAt = data.kickoffAt;
  if (data.organizerClubId !== undefined) payload.organizerClubId = data.organizerClubId || null;

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

  // Audit log : on trace UNIQUEMENT les mises à jour qui touchent le score
  // officiel (officialisation, correction). Les changements de venue/heure
  // sont fréquents et non sensibles, ne polluent pas l'audit.
  if (becameFinished || editedFinishedFields) {
    await logAudit({
      action: becameFinished ? 'FINALIZE_MATCH' : 'EDIT_FINISHED_SCORE',
      entity: 'Match',
      entityId: id,
      metadata: {
        previousStatus: match.status,
        newStatus: data.status,
        newScore: data.homeScore != null && data.awayScore != null ? `${data.homeScore}-${data.awayScore}` : null,
      },
    });
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
  // 1 = aller, 2 = retour, null/absent = match simple.
  leg: z.number().int().min(1).max(2).nullable().optional(),
  status: z.enum(["SCHEDULED", "LIVE", "HALFTIME", "FINISHED", "POSTPONED", "CANCELLED"]).default("SCHEDULED"),
  homeScore: z.number().int().min(0).nullable().optional(),
  awayScore: z.number().int().min(0).nullable().optional(),
  referees: z.array(MatchRefereeInputSchema).optional(),
  organizerClubId: z.string().nullable().optional(),
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

  // Garde-fou phase/format (cf. updateMatch) : une phase finale sur un
  // championnat pur créerait un match invisible (ni classement, ni bracket).
  const competition = await prisma.competition.findUnique({
    where: { id: data.competitionId },
    select: { format: true },
  });
  if (!competition) throw new Error("Compétition introuvable");
  if (!isPhaseAllowedForFormat(data.phase, competition.format)) {
    throw new Error(
      "Un championnat sans phase finale n'accepte que des matchs en « Phase régulière ». " +
        "Pour des matchs à élimination, créez la compétition au format Coupe ou Championnat + phase finale.",
    );
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
      leg: data.leg ?? null,
      status: data.status,
      homeScore: data.homeScore ?? null,
      awayScore: data.awayScore ?? null,
      organizerClubId: data.organizerClubId || null,
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

/* ─────────────────────── MATCHDAY BATCH CREATE (ADMIN) ─────────────────────── */

const MatchdayMatchSchema = z.object({
  homeClubId: z.string().min(1, "Club domicile requis"),
  awayClubId: z.string().min(1, "Club visiteur requis"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Heure attendue au format HH:mm"),
  venueId: z.string().nullable().optional(),
  phase: z.enum(["REGULAR", "R32", "R16", "QUARTER", "SEMI", "THIRD_PLACE", "FINAL"]).default("REGULAR"),
}).refine((d) => d.homeClubId !== d.awayClubId, {
  message: "Le club domicile et le visiteur doivent être différents.",
  path: ["awayClubId"],
});

const MatchdaySchema = z.object({
  competitionId: z.string().min(1, "Compétition requise"),
  matchday: z.number().int().min(1, "Numéro de journée requis"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD"),
  organizerClubId: z.string().nullable().optional(),
  matches: z.array(MatchdayMatchSchema).min(1, "Ajoutez au moins un match"),
}).refine((d) => {
  // Une équipe ne peut pas apparaître plusieurs fois dans la même journée
  // (sauf cas exceptionnel — on bloque pour éviter les saisies fausses).
  const seen = new Set<string>();
  for (const m of d.matches) {
    if (seen.has(m.homeClubId) || seen.has(m.awayClubId)) return false;
    seen.add(m.homeClubId);
    seen.add(m.awayClubId);
  }
  return true;
}, {
  message: "Une équipe apparaît plusieurs fois dans cette journée.",
  path: ["matches"],
});

export type MatchdayInput = z.infer<typeof MatchdaySchema>;

export async function createMatchday(input: MatchdayInput) {
  await requireAdmin();
  const data = MatchdaySchema.parse(input);

  // Validation des inscriptions à la compétition (si déclarées)
  const entries = await prisma.competitionEntry.findMany({
    where: { competitionId: data.competitionId },
    select: { clubId: true },
  });
  if (entries.length > 0) {
    const registeredIds = new Set(entries.map((e) => e.clubId));
    for (const m of data.matches) {
      if (!registeredIds.has(m.homeClubId) || !registeredIds.has(m.awayClubId)) {
        throw new Error("Un des clubs n'est pas inscrit à cette compétition.");
      }
    }
  }

  // Garde-fou phase/format (cf. createMatch) : pas de phase finale sur un
  // championnat pur, sinon le match serait invisible (ni classement, ni bracket).
  const competition = await prisma.competition.findUnique({
    where: { id: data.competitionId },
    select: { format: true, name: true, season: true },
  });
  if (!competition) throw new Error("Compétition introuvable");
  if (data.matches.some((m) => !isPhaseAllowedForFormat(m.phase, competition.format))) {
    throw new Error(
      "Un championnat sans phase finale n'accepte que des matchs en « Phase régulière ». " +
        "Pour des matchs à élimination, créez la compétition au format Coupe ou Championnat + phase finale.",
    );
  }

  // Construit les payloads de création. kickoffAt combine date + time en local.
  const matchPayloads = data.matches.map((m) => ({
    competitionId: data.competitionId,
    homeClubId: m.homeClubId,
    awayClubId: m.awayClubId,
    kickoffAt: parseReunionDateAndTime(data.date, m.time),
    venueId: m.venueId || null,
    matchday: data.matchday,
    phase: m.phase,
    organizerClubId: data.organizerClubId || null,
  }));

  await prisma.$transaction(
    matchPayloads.map((p) => prisma.match.create({ data: p })),
  );

  // Tous les matchs sont SCHEDULED (default) donc pas besoin de recalculer les
  // standings — aucun n'est encore FINISHED. On garde la garantie de cohérence
  // si le default change un jour.
  await logAudit({
    action: 'CREATE_MATCHDAY',
    entity: 'Match',
    metadata: {
      competitionId: data.competitionId,
      competitionLabel: competition ? `${competition.name} ${competition.season}` : null,
      matchday: data.matchday,
      date: data.date,
      matchCount: matchPayloads.length,
      organizerClubId: data.organizerClubId ?? null,
    },
  });

  revalidateMatch();
  return { count: matchPayloads.length };
}

/* ─────────────────────── ROUND-ROBIN AUTO-GENERATION (ADMIN) ─────────────────────── */

const RoundRobinSchema = z.object({
  competitionId: z.string().min(1, "Compétition requise"),
  clubIds: z.array(z.string().min(1)).min(2, "Au moins 2 équipes nécessaires"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD"),
  interval: z.number().int().min(1).max(60).default(1),
  intervalUnit: z.enum(['hour', 'day', 'week']).default('week'),
  kickoffTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure attendue au format HH:mm").default("19:00"),
  doubleRound: z.boolean().default(false),
  shuffle: z.boolean().default(false),
  // Si true : supprime les matchs existants (cascade) avant de générer.
  // Refusé si l'un des matchs est déjà FINISHED (sécurité données officielles).
  replaceExisting: z.boolean().default(false),
}).refine((d) => new Set(d.clubIds).size === d.clubIds.length, {
  message: "Une équipe apparaît plusieurs fois dans la sélection.",
  path: ["clubIds"],
});

export type GenerateRoundRobinInput = z.infer<typeof RoundRobinSchema>;

/**
 * Génère un calendrier round-robin (tous contre tous) pour un championnat.
 *
 * Algorithme : méthode du cercle (circle / Berger). Pour N équipes :
 *   - N pair → N-1 journées, N/2 matchs chacune
 *   - N impair → ajoute un BYE virtuel, donc N journées avec une équipe au repos
 * On alterne home/away par journée pour équilibrer.
 *
 * Options :
 *   - shuffle : tire au sort l'ordre des équipes avant l'algo (Fisher-Yates)
 *   - doubleRound : ajoute les matchs retour (home/away inversés) après l'aller
 *
 * Refuse si :
 *   - moins de 2 équipes
 *   - la compétition a déjà des matchs (pour éviter les doublons)
 *   - une équipe sélectionnée n'est pas inscrite à la compétition (si inscriptions présentes)
 */
export async function generateRoundRobin(input: GenerateRoundRobinInput) {
  await requireAdmin();
  const opts = RoundRobinSchema.parse(input);

  const comp = await prisma.competition.findUnique({
    where: { id: opts.competitionId },
    select: { id: true, name: true, season: true, format: true },
  });
  if (!comp) throw new Error("Compétition introuvable");

  // Inscriptions : si présentes, on s'assure que toutes les équipes choisies sont inscrites.
  const entries = await prisma.competitionEntry.findMany({
    where: { competitionId: opts.competitionId },
    select: { clubId: true },
  });
  if (entries.length > 0) {
    const registeredIds = new Set(entries.map((e) => e.clubId));
    for (const id of opts.clubIds) {
      if (!registeredIds.has(id)) {
        throw new Error("Une des équipes sélectionnées n'est pas inscrite à cette compétition.");
      }
    }
  }

  // Matchs existants : refus par défaut ; sinon on duplique sans le savoir.
  // Si l'admin coche "remplacer", on supprime tout — sauf s'il y a des matchs
  // terminés (perte de données officielles inacceptable, sortie explicite).
  const existing = await prisma.match.count({ where: { competitionId: opts.competitionId } });
  if (existing > 0) {
    if (!opts.replaceExisting) {
      throw new Error(
        `Cette compétition contient déjà ${existing} match${existing > 1 ? 's' : ''}. Cochez "Remplacer les matchs existants" ou supprimez-les manuellement.`,
      );
    }
    const finishedCount = await prisma.match.count({
      where: { competitionId: opts.competitionId, status: 'FINISHED' },
    });
    if (finishedCount > 0) {
      throw new Error(
        `${finishedCount} match${finishedCount > 1 ? 's sont' : ' est'} déjà terminé${finishedCount > 1 ? 's' : ''}. Le remplacement est bloqué pour protéger les résultats officiels. Supprimez-les un par un si nécessaire.`,
      );
    }
    // Cascade : MatchReferee, Goal, MatchCard, MatchInjury, MatchNote (cf. schema).
    await prisma.match.deleteMany({ where: { competitionId: opts.competitionId } });
    // Vide aussi les standings — ils ne reflètent plus rien d'utile, et certains
    // clubs n'apparaissent peut-être plus dans le nouveau tirage.
    await prisma.standing.deleteMany({ where: { competitionId: opts.competitionId } });
  }

  // Optionnel : Fisher-Yates shuffle de l'ordre des équipes (tirage au sort).
  let teams = [...opts.clubIds];
  if (opts.shuffle) {
    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }
  }

  // Round-robin circle method. BYE virtuel si nombre impair.
  const hasBye = teams.length % 2 === 1;
  const playList: (string | null)[] = hasBye ? [...teams, null] : [...teams];
  const n = playList.length;
  const rounds = n - 1;

  type Pair = { home: string; away: string };
  const schedule: Pair[][] = [];
  let rotating = [...playList];
  for (let r = 0; r < rounds; r++) {
    const journee: Pair[] = [];
    for (let i = 0; i < n / 2; i++) {
      let home = rotating[i];
      let away = rotating[n - 1 - i];
      // Alterne pour équilibrer (les équipes ne sont pas toujours à domicile)
      if (r % 2 === 1) {
        const tmp = home;
        home = away;
        away = tmp;
      }
      if (home != null && away != null) {
        journee.push({ home, away });
      }
    }
    schedule.push(journee);
    // Rotation : fixe le 1er, fait tourner les autres
    rotating = [rotating[0], rotating[n - 1], ...rotating.slice(1, n - 1)];
  }

  // Nombre de journées de l'aller (utilisé ensuite pour calculer le leg).
  const allerMatchdayCount = schedule.length;

  // Manche retour : home/away inversés, planifié après l'aller
  if (opts.doubleRound) {
    const returnRounds: Pair[][] = schedule.map((j) =>
      j.map(({ home, away }) => ({ home: away, away: home })),
    );
    schedule.push(...returnRounds);
  }

  // Calcul des dates : J1 = startDate à kickoffTime (en heure locale Réunion).
  const baseDate = parseReunionDateAndTime(opts.startDate, opts.kickoffTime);
  const unitMs =
    opts.intervalUnit === 'hour' ? 60 * 60 * 1000
    : opts.intervalUnit === 'day' ? 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;
  const stepMs = opts.interval * unitMs;

  const matchesToCreate: Array<{
    competitionId: string;
    homeClubId: string;
    awayClubId: string;
    kickoffAt: Date;
    matchday: number;
    phase: 'REGULAR';
    status: 'SCHEDULED';
    leg: number | null;
  }> = [];
  schedule.forEach((journee, idx) => {
    const journeeDate = new Date(baseDate.getTime() + idx * stepMs);
    // En mode aller-retour : leg=1 pour les journées 0..allerMatchdayCount-1,
    // leg=2 pour les suivantes (manche retour).
    const leg = opts.doubleRound
      ? (idx < allerMatchdayCount ? 1 : 2)
      : null;
    for (const pair of journee) {
      matchesToCreate.push({
        competitionId: opts.competitionId,
        homeClubId: pair.home,
        awayClubId: pair.away,
        kickoffAt: journeeDate,
        matchday: idx + 1,
        phase: 'REGULAR',
        status: 'SCHEDULED',
        leg,
      });
    }
  });

  await prisma.$transaction(matchesToCreate.map((m) => prisma.match.create({ data: m })));

  await logAudit({
    action: 'GENERATE_ROUND_ROBIN',
    entity: 'Match',
    metadata: {
      competitionId: opts.competitionId,
      competitionLabel: `${comp.name} ${comp.season}`,
      teams: opts.clubIds.length,
      doubleRound: opts.doubleRound,
      shuffle: opts.shuffle,
      matchdays: schedule.length,
      matchCount: matchesToCreate.length,
    },
  });

  revalidateMatch();
  return {
    created: matchesToCreate.length,
    matchdays: schedule.length,
    competitionName: comp.name,
  };
}

export async function deleteMatch(id: string) {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { role: true, clubId: true },
  });

  const match = await prisma.match.findUnique({
    where: { id },
    select: {
      homeClubId: true, awayClubId: true, competitionId: true,
      homeClub: { select: { name: true } },
      awayClub: { select: { name: true } },
      competition: { select: { name: true, season: true } },
      kickoffAt: true, homeScore: true, awayScore: true,
    },
  });
  if (!match) throw new Error("Match introuvable");

  if (user?.role !== "ADMIN" && user?.clubId !== match.homeClubId && user?.clubId !== match.awayClubId) {
    throw new Error("Non autorisé à supprimer ce match");
  }

  await prisma.goal.deleteMany({ where: { matchId: id } });
  await prisma.match.delete({ where: { id } });
  await updateStandings(match.competitionId);

  await logAudit({
    action: 'DELETE_MATCH',
    entity: 'Match',
    entityId: id,
    metadata: {
      summary: `${match.homeClub.name} vs ${match.awayClub.name} (${match.competition.name} ${match.competition.season})`,
      kickoffAt: match.kickoffAt.toISOString(),
      finalScore: match.homeScore != null && match.awayScore != null ? `${match.homeScore}-${match.awayScore}` : null,
    },
  });

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
  doubleRound: z.boolean().default(false),
  playoffsTwoLegged: z.boolean().default(false),
  finalTwoLegged: z.boolean().default(false),
  fairnessEnabled: z.boolean().default(false),
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
      doubleRound: true,
      playoffsTwoLegged: true,
      finalTwoLegged: true,
      fairnessEnabled: true,
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

  const [competition, club] = await Promise.all([
    prisma.competition.findUnique({ where: { id: competitionId }, select: { name: true, season: true } }),
    prisma.club.findUnique({ where: { id: clubId }, select: { name: true, shortCode: true } }),
  ]);

  await prisma.competitionEntry.deleteMany({
    where: { competitionId, clubId },
  });
  // Supprime le Standing fantôme (puisque le club n'a joué aucun match)
  await prisma.standing.deleteMany({
    where: { competitionId, clubId },
  });

  await logAudit({
    action: 'REMOVE_COMPETITION_ENTRY',
    entity: 'CompetitionEntry',
    metadata: {
      competitionId,
      competitionLabel: competition ? `${competition.name} ${competition.season}` : null,
      clubId,
      clubLabel: club ? `${club.name}${club.shortCode ? ` (${club.shortCode})` : ''}` : null,
    },
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

/**
 * Aperçu compact des matchs d'une compétition. Sert au form de tirage pour
 * afficher la liste avant un éventuel "Remplacer" — évite à l'admin de
 * confondre deux compés au nom proche.
 */
export async function listMatchesForCompetitionSummary(competitionId: string) {
  await requireAuth();
  const rows = await prisma.match.findMany({
    where: { competitionId },
    orderBy: { kickoffAt: 'asc' },
    select: {
      id: true,
      kickoffAt: true,
      status: true,
      matchday: true,
      homeScore: true,
      awayScore: true,
      homeClub: { select: { name: true, shortCode: true } },
      awayClub: { select: { name: true, shortCode: true } },
    },
  });
  return rows;
}

export type MatchSummaryRow = Awaited<ReturnType<typeof listMatchesForCompetitionSummary>>[number];

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
      leg: true,
      homeScore: true,
      awayScore: true,
      homeClubId: true,
      awayClubId: true,
      organizerClubId: true,
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      awayClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      organizerClub: { select: { id: true, slug: true, shortCode: true, name: true } },
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
      doubleRound: data.doubleRound,
      playoffsTwoLegged: data.playoffsTwoLegged,
      finalTwoLegged: data.finalTwoLegged,
      fairnessEnabled: data.fairnessEnabled,
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
  if (data.doubleRound !== undefined) payload.doubleRound = data.doubleRound;
  if (data.playoffsTwoLegged !== undefined) payload.playoffsTwoLegged = data.playoffsTwoLegged;
  if (data.finalTwoLegged !== undefined) payload.finalTwoLegged = data.finalTwoLegged;
  if (data.fairnessEnabled !== undefined) payload.fairnessEnabled = data.fairnessEnabled;
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
      playoffsTwoLegged: true,
      finalTwoLegged: true,
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

  // Normaliser à 19:00 locale Réunion par défaut (heure type pour un match
  // en semaine). On passe par reunionDayKey pour extraire la date calendaire
  // en TZ Réunion, puis on combine avec 19:00.
  const baseDate = parseReunionDateAndTime(
    reunionDayKey(opts.startDate ?? new Date()),
    '19:00',
  );
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
    leg: number | null;
  }> = [];

  // Une phase est en aller-retour si playoffsTwoLegged (pour préliminaires)
  // ou finalTwoLegged (pour FINAL). Chaque phase 2-leg coûte 2 semaines au
  // lieu d'1, donc on accumule l'offset au fur et à mesure.
  let weekOffset = 0;
  for (let phaseIdx = 0; phaseIdx < phaseChain.length; phaseIdx++) {
    const phase = phaseChain[phaseIdx];
    const isFinal = phase === 'FINAL';
    const isTwoLegged = isFinal ? comp.finalTwoLegged : comp.playoffsTwoLegged;
    const kickoffLeg1 = new Date(baseDate.getTime() + weekOffset * weekStepMs);
    const kickoffLeg2 = new Date(baseDate.getTime() + (weekOffset + 1) * weekStepMs);

    if (phaseIdx === 0) {
      for (const [home, away] of firstPairs) {
        matchesToCreate.push({
          competitionId, homeClubId: home, awayClubId: away,
          phase, kickoffAt: kickoffLeg1, status: 'SCHEDULED',
          leg: isTwoLegged ? 1 : null,
        });
        if (isTwoLegged) {
          // Retour : home/away inversés (le seed le plus haut termine à domicile).
          matchesToCreate.push({
            competitionId, homeClubId: away, awayClubId: home,
            phase, kickoffAt: kickoffLeg2, status: 'SCHEDULED',
            leg: 2,
          });
        }
      }
    } else {
      // Nb de "rencontres" précédentes (1 par paire, indépendamment du 2-leg).
      // On regarde les leg=1 ou leg=null de la phase précédente.
      const prevPhase = phaseChain[phaseIdx - 1];
      const prevFirstLegMatches = matchesToCreate.filter(
        (m) => m.phase === prevPhase && (m.leg === null || m.leg === 1),
      ).length;
      const pairsAtPhase = prevFirstLegMatches / 2;
      for (let i = 0; i < pairsAtPhase; i++) {
        // Placeholder : 2 seeds distincts pour éviter "home === away".
        const home = seedClubIds[(i * 2) % opts.teamCount];
        const away = seedClubIds[(i * 2 + 1) % opts.teamCount];
        matchesToCreate.push({
          competitionId, homeClubId: home, awayClubId: away,
          phase, kickoffAt: kickoffLeg1, status: 'SCHEDULED',
          leg: isTwoLegged ? 1 : null,
        });
        if (isTwoLegged) {
          matchesToCreate.push({
            competitionId, homeClubId: away, awayClubId: home,
            phase, kickoffAt: kickoffLeg2, status: 'SCHEDULED',
            leg: 2,
          });
        }
      }
    }

    weekOffset += isTwoLegged ? 2 : 1;
  }

  // 3e place : toujours simple, 2h avant le 1er match de finale.
  if (opts.includeThirdPlace && opts.teamCount >= 4) {
    // La finale est la dernière phase, son leg1 est à baseDate + (weekOffset - (finalTwoLegged ? 2 : 1)) * weekStepMs.
    const finalLeg1Offset = weekOffset - (comp.finalTwoLegged ? 2 : 1);
    const finalLeg1Kickoff = new Date(baseDate.getTime() + finalLeg1Offset * weekStepMs);
    const thirdPlaceKickoff = new Date(finalLeg1Kickoff.getTime() - 2 * 60 * 60 * 1000);
    matchesToCreate.push({
      competitionId,
      homeClubId: seedClubIds[2],
      awayClubId: seedClubIds[3],
      phase: 'THIRD_PLACE',
      kickoffAt: thirdPlaceKickoff,
      status: 'SCHEDULED',
      leg: null,
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

/* ─────────────────────── CHAMPIONSHIP PLAYOFFS — FINALE SIMPLE 1v2 + 3v4 ─────────────────────── */

const ChampionshipFinalsSchema = z.object({
  finalKickoff: z.coerce.date(),
  // 3e place : optionnel. Si null, pas de match 3e place créé.
  thirdPlaceKickoff: z.coerce.date().optional().nullable(),
  venueId: z.string().optional().nullable(),
});

export type GenerateChampionshipFinalsInput = z.infer<typeof ChampionshipFinalsSchema>;

/**
 * Génère la phase finale simple pour une compétition CHAMPIONSHIP_PLAYOFFS :
 *   - FINAL       : top1 vs top2 (top1 à domicile)
 *   - THIRD_PLACE : top3 vs top4 (top3 à domicile), si thirdPlaceKickoff fourni
 *
 * Différence avec generateBracket :
 *   - Pas de demi-finales (modèle "lige" : le championnat fait office de tour préliminaire)
 *   - Date personnalisable indépendamment pour chaque match
 *   - Lecture directe du classement courant
 *
 * Refuse si :
 *   - la compétition n'est pas en CHAMPIONSHIP_PLAYOFFS
 *   - moins de 4 équipes au classement
 *   - un match FINAL ou THIRD_PLACE existe déjà (utiliser deleteBracket d'abord)
 */
export async function generateChampionshipFinals(
  competitionId: string,
  input: GenerateChampionshipFinalsInput,
) {
  await requireAdmin();
  const opts = ChampionshipFinalsSchema.parse(input);

  const comp = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: {
      id: true,
      format: true,
      name: true,
      season: true,
      finalTwoLegged: true,
      standings: {
        orderBy: { rank: 'asc' },
        select: { clubId: true, rank: true },
      },
    },
  });
  if (!comp) throw new Error('Compétition introuvable');
  if (comp.format !== 'CHAMPIONSHIP_PLAYOFFS') {
    throw new Error('Cette action est réservée aux championnats avec phase finale.');
  }
  if (comp.standings.length < 4) {
    throw new Error(
      `Classement insuffisant : ${comp.standings.length} club${comp.standings.length > 1 ? 's' : ''} classé${comp.standings.length > 1 ? 's' : ''}, 4 requis pour la phase finale.`,
    );
  }

  const existingFinals = await prisma.match.count({
    where: { competitionId, phase: { in: ['FINAL', 'THIRD_PLACE'] } },
  });
  if (existingFinals > 0) {
    throw new Error(
      `Une phase finale existe déjà (${existingFinals} match${existingFinals > 1 ? 's' : ''}). Supprimez-la avant de regénérer.`,
    );
  }

  const [p1, p2, p3, p4] = comp.standings;
  const matchesToCreate: Array<{
    competitionId: string;
    homeClubId: string;
    awayClubId: string;
    phase: 'FINAL' | 'THIRD_PLACE';
    kickoffAt: Date;
    venueId: string | null;
    status: 'SCHEDULED';
    leg: number | null;
  }> = [
    {
      competitionId,
      homeClubId: p1.clubId,
      awayClubId: p2.clubId,
      phase: 'FINAL',
      kickoffAt: opts.finalKickoff,
      venueId: opts.venueId ?? null,
      status: 'SCHEDULED',
      leg: comp.finalTwoLegged ? 1 : null,
    },
  ];
  if (comp.finalTwoLegged) {
    // Retour : 1 semaine après l'aller, home/away inversés (le mieux classé
    // termine à domicile).
    const leg2Kickoff = new Date(opts.finalKickoff.getTime() + 7 * 24 * 60 * 60 * 1000);
    matchesToCreate.push({
      competitionId,
      homeClubId: p2.clubId,
      awayClubId: p1.clubId,
      phase: 'FINAL',
      kickoffAt: leg2Kickoff,
      venueId: opts.venueId ?? null,
      status: 'SCHEDULED',
      leg: 2,
    });
  }
  if (opts.thirdPlaceKickoff) {
    matchesToCreate.push({
      competitionId,
      homeClubId: p3.clubId,
      awayClubId: p4.clubId,
      phase: 'THIRD_PLACE',
      kickoffAt: opts.thirdPlaceKickoff,
      venueId: opts.venueId ?? null,
      status: 'SCHEDULED',
      leg: null,
    });
  }

  await prisma.$transaction(matchesToCreate.map((m) => prisma.match.create({ data: m })));

  await logAudit({
    action: 'GENERATE_CHAMPIONSHIP_FINALS',
    entity: 'Match',
    metadata: {
      competitionId,
      competitionLabel: `${comp.name} ${comp.season}`,
      matchCount: matchesToCreate.length,
      includeThirdPlace: !!opts.thirdPlaceKickoff,
      seeds: { p1: p1.clubId, p2: p2.clubId, p3: p3.clubId, p4: p4.clubId },
    },
  });

  revalidateMatch();
  return { created: matchesToCreate.length, competitionName: comp.name };
}

export async function deleteCompetition(id: string) {
  await requireAdmin();
  const before = await prisma.competition.findUnique({
    where: { id },
    select: { name: true, season: true, mode: true, _count: { select: { matches: true, entries: true, standings: true } } },
  });
  // Suppression en cascade : matchs (avec goals/referees/notes cascadés
  // côté schéma), standings, entries, memberStats. Transaction pour
  // atomicité. Le confirm UI côté admin assume que ça emporte tout.
  await prisma.$transaction([
    prisma.match.deleteMany({ where: { competitionId: id } }),
    prisma.standing.deleteMany({ where: { competitionId: id } }),
    prisma.competitionEntry.deleteMany({ where: { competitionId: id } }),
    prisma.memberCompetitionStats.deleteMany({ where: { competitionId: id } }),
    prisma.competition.delete({ where: { id } }),
  ]);
  if (before) {
    await logAudit({
      action: 'DELETE_COMPETITION',
      entity: 'Competition',
      entityId: id,
      metadata: {
        summary: `${before.name} (${before.season} · ${before.mode})`,
        cascadedMatches: before._count.matches,
        cascadedEntries: before._count.entries,
        cascadedStandings: before._count.standings,
      },
    });
  }
  revalidateMatch();
}

export type CompetitionAdminRow = Awaited<ReturnType<typeof listCompetitionsAdmin>>[number];
export type ClubForAdmin = Awaited<ReturnType<typeof listClubsForAdmin>>[number];
export type AdminMatchRow = Awaited<ReturnType<typeof listMatchesAdmin>>[number];
