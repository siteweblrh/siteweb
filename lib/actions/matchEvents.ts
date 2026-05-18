'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autorisé');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') throw new Error("Réservé aux administrateurs");
  return session;
}

function revalidateMatchPaths(matchId: string) {
  revalidatePath(`/dashboard/matches/${matchId}`);
  revalidatePath('/dashboard/matches');
  revalidatePath('/dashboard/matches/calendar');
}

/* ─────────────────────── GOALS ─────────────────────── */

const GoalCreateSchema = z.object({
  matchId: z.string().min(1),
  scoringClubId: z.string().min(1),
  minute: z.number().int().min(0).max(200),
  scorerMemberId: z.string().nullable().optional(),
  scorerName: z.string().trim().nullable().optional(),
  kind: z.string().trim().nullable().optional(),
});

export async function createGoal(input: z.infer<typeof GoalCreateSchema>) {
  await requireAdmin();
  const data = GoalCreateSchema.parse(input);

  // Validation : scoringClub doit faire partie du match
  const match = await prisma.match.findUnique({
    where: { id: data.matchId },
    select: { homeClubId: true, awayClubId: true },
  });
  if (!match) throw new Error('Match introuvable');
  if (data.scoringClubId !== match.homeClubId && data.scoringClubId !== match.awayClubId) {
    throw new Error("Le club marqueur n'est pas un des deux clubs du match.");
  }

  const goal = await prisma.goal.create({
    data: {
      matchId: data.matchId,
      scoringClubId: data.scoringClubId,
      minute: data.minute,
      scorerMemberId: data.scorerMemberId || null,
      scorerName: data.scorerName?.trim() || null,
      kind: data.kind?.trim() || null,
    },
  });
  revalidateMatchPaths(data.matchId);
  return goal;
}

const GoalUpdateSchema = GoalCreateSchema.partial().omit({ matchId: true });

export async function updateGoal(id: string, input: z.infer<typeof GoalUpdateSchema>) {
  await requireAdmin();
  const data = GoalUpdateSchema.parse(input);
  const existing = await prisma.goal.findUnique({ where: { id }, select: { matchId: true } });
  if (!existing) throw new Error('But introuvable');

  const payload: Record<string, unknown> = {};
  if (data.scoringClubId !== undefined) payload.scoringClubId = data.scoringClubId;
  if (data.minute !== undefined) payload.minute = data.minute;
  if (data.scorerMemberId !== undefined) payload.scorerMemberId = data.scorerMemberId || null;
  if (data.scorerName !== undefined) payload.scorerName = data.scorerName?.trim() || null;
  if (data.kind !== undefined) payload.kind = data.kind?.trim() || null;

  await prisma.goal.update({ where: { id }, data: payload as any });
  revalidateMatchPaths(existing.matchId);
}

export async function deleteGoal(id: string) {
  await requireAdmin();
  const existing = await prisma.goal.findUnique({ where: { id }, select: { matchId: true } });
  if (!existing) throw new Error('But introuvable');
  await prisma.goal.delete({ where: { id } });
  revalidateMatchPaths(existing.matchId);
}

/* ─────────────────────── CARDS ─────────────────────── */

const CardCreateSchema = z.object({
  matchId: z.string().min(1),
  clubId: z.string().min(1),
  memberId: z.string().nullable().optional(),
  memberName: z.string().trim().nullable().optional(),
  minute: z.number().int().min(0).max(200),
  kind: z.enum(['GREEN', 'YELLOW', 'RED']),
  reason: z.string().trim().nullable().optional(),
});

export async function createCard(input: z.infer<typeof CardCreateSchema>) {
  await requireAdmin();
  const data = CardCreateSchema.parse(input);
  const match = await prisma.match.findUnique({
    where: { id: data.matchId },
    select: { homeClubId: true, awayClubId: true },
  });
  if (!match) throw new Error('Match introuvable');
  if (data.clubId !== match.homeClubId && data.clubId !== match.awayClubId) {
    throw new Error("Le club n'est pas un des deux clubs du match.");
  }

  const card = await prisma.matchCard.create({
    data: {
      matchId: data.matchId,
      clubId: data.clubId,
      memberId: data.memberId || null,
      memberName: data.memberName?.trim() || null,
      minute: data.minute,
      kind: data.kind,
      reason: data.reason?.trim() || null,
    },
  });
  revalidateMatchPaths(data.matchId);
  return card;
}

const CardUpdateSchema = CardCreateSchema.partial().omit({ matchId: true });

export async function updateCard(id: string, input: z.infer<typeof CardUpdateSchema>) {
  await requireAdmin();
  const data = CardUpdateSchema.parse(input);
  const existing = await prisma.matchCard.findUnique({ where: { id }, select: { matchId: true } });
  if (!existing) throw new Error('Carton introuvable');

  const payload: Record<string, unknown> = {};
  if (data.clubId !== undefined) payload.clubId = data.clubId;
  if (data.memberId !== undefined) payload.memberId = data.memberId || null;
  if (data.memberName !== undefined) payload.memberName = data.memberName?.trim() || null;
  if (data.minute !== undefined) payload.minute = data.minute;
  if (data.kind !== undefined) payload.kind = data.kind;
  if (data.reason !== undefined) payload.reason = data.reason?.trim() || null;

  await prisma.matchCard.update({ where: { id }, data: payload as any });
  revalidateMatchPaths(existing.matchId);
}

export async function deleteCard(id: string) {
  await requireAdmin();
  const existing = await prisma.matchCard.findUnique({ where: { id }, select: { matchId: true } });
  if (!existing) throw new Error('Carton introuvable');
  await prisma.matchCard.delete({ where: { id } });
  revalidateMatchPaths(existing.matchId);
}

/* ─────────────────────── INJURIES ─────────────────────── */

const InjuryCreateSchema = z.object({
  matchId: z.string().min(1),
  clubId: z.string().min(1),
  memberId: z.string().nullable().optional(),
  memberName: z.string().trim().nullable().optional(),
  minute: z.number().int().min(0).max(200),
  zone: z.string().trim().nullable().optional(),
  severity: z.enum(['LIGHT', 'MODERATE', 'SERIOUS']).default('LIGHT'),
  replacedByMemberId: z.string().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export async function createInjury(input: z.infer<typeof InjuryCreateSchema>) {
  await requireAdmin();
  const data = InjuryCreateSchema.parse(input);
  const match = await prisma.match.findUnique({
    where: { id: data.matchId },
    select: { homeClubId: true, awayClubId: true },
  });
  if (!match) throw new Error('Match introuvable');
  if (data.clubId !== match.homeClubId && data.clubId !== match.awayClubId) {
    throw new Error("Le club n'est pas un des deux clubs du match.");
  }

  const injury = await prisma.matchInjury.create({
    data: {
      matchId: data.matchId,
      clubId: data.clubId,
      memberId: data.memberId || null,
      memberName: data.memberName?.trim() || null,
      minute: data.minute,
      zone: data.zone?.trim() || null,
      severity: data.severity,
      replacedByMemberId: data.replacedByMemberId || null,
      notes: data.notes?.trim() || null,
    },
  });
  revalidateMatchPaths(data.matchId);
  return injury;
}

const InjuryUpdateSchema = InjuryCreateSchema.partial().omit({ matchId: true });

export async function updateInjury(id: string, input: z.infer<typeof InjuryUpdateSchema>) {
  await requireAdmin();
  const data = InjuryUpdateSchema.parse(input);
  const existing = await prisma.matchInjury.findUnique({ where: { id }, select: { matchId: true } });
  if (!existing) throw new Error('Blessure introuvable');

  const payload: Record<string, unknown> = {};
  if (data.clubId !== undefined) payload.clubId = data.clubId;
  if (data.memberId !== undefined) payload.memberId = data.memberId || null;
  if (data.memberName !== undefined) payload.memberName = data.memberName?.trim() || null;
  if (data.minute !== undefined) payload.minute = data.minute;
  if (data.zone !== undefined) payload.zone = data.zone?.trim() || null;
  if (data.severity !== undefined) payload.severity = data.severity;
  if (data.replacedByMemberId !== undefined) payload.replacedByMemberId = data.replacedByMemberId || null;
  if (data.notes !== undefined) payload.notes = data.notes?.trim() || null;

  await prisma.matchInjury.update({ where: { id }, data: payload as any });
  revalidateMatchPaths(existing.matchId);
}

export async function deleteInjury(id: string) {
  await requireAdmin();
  const existing = await prisma.matchInjury.findUnique({ where: { id }, select: { matchId: true } });
  if (!existing) throw new Error('Blessure introuvable');
  await prisma.matchInjury.delete({ where: { id } });
  revalidateMatchPaths(existing.matchId);
}
