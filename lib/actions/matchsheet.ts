'use server';

/**
 * Saisie rapide de journée — actions serveur (docs/SAISIE_RAPIDE_JOURNEE.md).
 *
 * Deux actions strictement séparées :
 *   - `planMatchdayImport` : LECTURE SEULE. Texte + choix de l'admin → plan.
 *   - `applyMatchdayImport` : recalcule le plan depuis le texte (jamais depuis
 *     un plan renvoyé par le navigateur, qui est une donnée utilisateur) et
 *     n'écrit que s'il est prêt — dans UNE transaction.
 *
 * Coût (règle n°2) — Portée : un écran d'admin, aucune page publique.
 * Fréquence : quelques appels par journée de championnat. Défaillance : tout
 * contrôle qui échoue bloque et s'affiche ; pas d'écriture partielle.
 */
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { logAudit } from '@/lib/audit';
import { revalidateMatchPages } from '@/lib/cache/revalidate-match';
import { updateStandings } from '@/lib/actions/competition';
import { parseMatchSheet, MAX_SHEET_LENGTH } from '@/lib/matchsheet/parse';
import {
  resolveMatchday,
  memberCategoryFor,
  provisionalLicense,
  type PersonRef,
} from '@/lib/matchsheet/resolve';
import type { MatchdayPlan } from '@/lib/matchsheet/types';

const DecisionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('member'), memberId: z.string().min(1) }),
  z.object({ type: z.literal('create'), clubId: z.string().min(1) }),
  z.object({ type: z.literal('free') }),
]);

const InputSchema = z.object({
  competitionId: z.string().min(1),
  matchday: z.number().int().min(1).max(99),
  text: z.string().max(MAX_SHEET_LENGTH, 'Texte trop long : collez une journée à la fois (64 Ko max).'),
  decisions: z.record(z.string(), DecisionSchema).default({}),
  confirmedOverwrite: z.array(z.string()).max(50).default([]),
});

export type MatchdayImportInput = z.input<typeof InputSchema>;

/** Erreurs ATTENDUES retournées, pas lancées (message effacé en prod sinon). */
export type PlanResult = { ok: true; plan: MatchdayPlan } | { ok: false; message: string };
export type ApplyResult =
  | { ok: true; summary: { matches: number; goals: number; cards: number; injuries: number; created: number } }
  | { ok: false; message: string; plan?: MatchdayPlan };

/** Charge tout ce que la résolution consulte, en 3 requêtes. */
async function buildPlan(input: z.output<typeof InputSchema>) {
  const competition = await prisma.competition.findUnique({
    where: { id: input.competitionId },
    select: { id: true, name: true, season: true, category: true },
  });
  if (!competition) return null;

  const matches = await prisma.match.findMany({
    where: { competitionId: competition.id, matchday: input.matchday },
    orderBy: { kickoffAt: 'asc' },
    select: {
      id: true, kickoffAt: true, homeClubId: true, awayClubId: true,
      homeScore: true, awayScore: true, status: true,
      _count: { select: { goals: true, cards: true, injuries: true } },
    },
  });

  const clubIds = [...new Set(matches.flatMap((m) => [m.homeClubId, m.awayClubId]).filter(Boolean) as string[])];
  const clubs = await prisma.club.findMany({
    where: { id: { in: clubIds } },
    select: {
      id: true, name: true, shortCode: true, slug: true, kind: true,
      parentClubs: { select: { id: true, name: true, shortCode: true } },
    },
  });
  const poolIds = [...new Set([...clubIds, ...clubs.flatMap((c) => c.parentClubs.map((p) => p.id))])];
  const members = await prisma.member.findMany({
    where: { clubId: { in: poolIds }, kind: 'PLAYER' },
    select: { id: true, firstName: true, lastName: true, jerseyNumber: true, clubId: true },
  });

  const result = resolveMatchday({
    competitionLabel: `${competition.name} ${competition.season}`,
    matchday: input.matchday,
    sheet: parseMatchSheet(input.text),
    matches: matches.map((m) => ({
      id: m.id, kickoffAt: m.kickoffAt, homeClubId: m.homeClubId, awayClubId: m.awayClubId,
      homeScore: m.homeScore, awayScore: m.awayScore, status: m.status,
      counts: { goals: m._count.goals, cards: m._count.cards, injuries: m._count.injuries },
    })),
    clubs,
    members,
    decisions: input.decisions,
    confirmedOverwrite: input.confirmedOverwrite,
  });
  return { competition, matchCount: matches.length, ...result };
}

export async function planMatchdayImport(raw: MatchdayImportInput): Promise<PlanResult> {
  await requireAdmin();
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Saisie invalide.' };

  const built = await buildPlan(parsed.data);
  if (!built) return { ok: false, message: 'Compétition introuvable — rechargez la page.' };
  if (built.matchCount === 0) {
    return {
      ok: false,
      message: `Aucun match au calendrier pour la journée ${parsed.data.matchday} de cette compétition. Les rencontres doivent d'abord exister (Créer une journée).`,
    };
  }
  return { ok: true, plan: built.plan };
}

export async function applyMatchdayImport(raw: MatchdayImportInput): Promise<ApplyResult> {
  const session = await requireAdmin();
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Saisie invalide.' };

  const built = await buildPlan(parsed.data);
  if (!built) return { ok: false, message: 'Compétition introuvable — rechargez la page.' };
  if (!built.plan.ready) {
    return {
      ok: false,
      message: 'Le plan n’est pas prêt (ou la base a changé depuis l’aperçu) : relisez les alertes.',
      plan: built.plan,
    };
  }

  const { writes, creations, competition } = built;
  const category = memberCategoryFor(competition.category);

  await prisma.$transaction(async (tx) => {
    // 1. Joueurs à créer (§5.4), licence provisoire unique.
    const createdIds = new Map<string, string>();
    for (const c of creations) {
      const base = provisionalLicense(c.clubCode, c.firstName, c.lastName);
      let license = base;
      for (let n = 2; await tx.member.findUnique({ where: { license }, select: { id: true } }); n++) {
        license = `${base}-${n}`;
      }
      const created = await tx.member.create({
        data: {
          license, firstName: c.firstName, lastName: c.lastName,
          jerseyNumber: c.jerseyNumber, clubId: c.clubId, kind: 'PLAYER', category,
        },
        select: { id: true },
      });
      createdIds.set(c.key, created.id);
    }

    const ref = (p: PersonRef) => ({
      memberId: p.type === 'member' ? p.memberId : p.type === 'create' ? createdIds.get(p.key)! : null,
      name: p.type === 'free' ? p.name : null,
    });

    const matchIds = writes.map((w) => w.matchId);
    // 2. Purge puis réécriture : l'import est rejouable (§5.6, confirmé à l'écran).
    await tx.goal.deleteMany({ where: { matchId: { in: matchIds } } });
    await tx.matchCard.deleteMany({ where: { matchId: { in: matchIds } } });
    await tx.matchInjury.deleteMany({ where: { matchId: { in: matchIds } } });

    for (const w of writes) {
      // §5.7 — FINISHED explicite : sans lui, le match sort du classement sans erreur.
      await tx.match.update({
        where: { id: w.matchId },
        data: { homeScore: w.homeScore, awayScore: w.awayScore, status: 'FINISHED' },
      });
    }
    await tx.goal.createMany({
      data: writes.flatMap((w) => w.goals.map((g) => {
        const r = ref(g.person);
        return { matchId: w.matchId, scoringClubId: g.clubId, scorerMemberId: r.memberId, scorerName: r.name, minute: null };
      })),
    });
    await tx.matchCard.createMany({
      data: writes.flatMap((w) => w.cards.map((c) => {
        const r = ref(c.person);
        return { matchId: w.matchId, clubId: c.clubId, memberId: r.memberId, memberName: r.name, kind: c.kind, minute: null };
      })),
    });
    await tx.matchInjury.createMany({
      data: writes.flatMap((w) => w.injuries.map((i) => {
        const r = ref(i.person);
        return {
          matchId: w.matchId, clubId: i.clubId, memberId: r.memberId, memberName: r.name,
          notes: i.notes || null, severity: 'LIGHT' as const, minute: null,
        };
      })),
    });
  }, { timeout: 30_000 });

  // 3. Traçabilité (§6) : une entrée par match, avec le texte source.
  for (const w of writes) {
    await logAudit({
      action: 'IMPORT_MATCHDAY',
      entity: 'Match',
      entityId: w.matchId,
      metadata: {
        by: session.user?.email ?? null,
        competitionId: competition.id,
        matchday: parsed.data.matchday,
        score: `${w.homeScore}-${w.awayScore}`,
        goals: w.goals.length, cards: w.cards.length, injuries: w.injuries.length,
        source: parsed.data.text,
      },
    });
  }

  // 4. Classement + pages publiques.
  await updateStandings(competition.id);
  revalidateMatchPages();

  return {
    ok: true,
    summary: {
      matches: writes.length,
      goals: writes.reduce((s, w) => s + w.goals.length, 0),
      cards: writes.reduce((s, w) => s + w.cards.length, 0),
      injuries: writes.reduce((s, w) => s + w.injuries.length, 0),
      created: creations.length,
    },
  };
}
