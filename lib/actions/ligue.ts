'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Réservé aux administrateurs");
  return session;
}

function revalidateLigue() {
  revalidatePath("/ligue");
  revalidatePath("/dashboard/ligue/bureau");
  revalidatePath("/dashboard/ligue/commissions");
}

function revalidateHome() {
  revalidatePath("/");
  revalidatePath("/dashboard/ligue/mvp");
}

/* ─────────────────────── BUREAU MEMBER ─────────────────────── */

const BureauMemberSchema = z.object({
  fullName: z.string().min(1, "Nom requis"),
  role: z.string().min(1, "Rôle requis"),
  order: z.number().int().default(0),
  photo: z.string().url().nullable().optional().or(z.literal("")),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional().or(z.literal("")),
  bio: z.string().nullable().optional().or(z.literal("")),
  startedAt: z.coerce.date().nullable().optional(),
});

export type BureauMemberInput = z.infer<typeof BureauMemberSchema>;

function normalizeOptional<T extends Record<string, unknown>>(data: T) {
  const out: Record<string, unknown> = { ...data };
  for (const k of Object.keys(out)) {
    if (out[k] === "") out[k] = null;
  }
  return out;
}

export async function createBureauMember(input: BureauMemberInput) {
  await requireAdmin();
  const data = BureauMemberSchema.parse(input);
  const created = await prisma.bureauMember.create({ data: normalizeOptional(data) as any });
  revalidateLigue();
  return created;
}

export async function updateBureauMember(id: string, input: Partial<BureauMemberInput>) {
  await requireAdmin();
  const data = BureauMemberSchema.partial().parse(input);
  const updated = await prisma.bureauMember.update({ where: { id }, data: normalizeOptional(data) as any });
  revalidateLigue();
  return updated;
}

export async function deleteBureauMember(id: string) {
  await requireAdmin();
  await prisma.bureauMember.delete({ where: { id } });
  revalidateLigue();
}

/* ─────────────────────── COMMISSION ─────────────────────── */

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const CommissionSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  slug: z.string().optional(),
  description: z.string().nullable().optional().or(z.literal("")),
  mission: z.string().nullable().optional().or(z.literal("")),
  order: z.number().int().default(0),
});

export type CommissionInput = z.infer<typeof CommissionSchema>;

export async function createCommission(input: CommissionInput) {
  await requireAdmin();
  const data = CommissionSchema.parse(input);
  const slug = data.slug?.trim() || slugify(data.name);
  const created = await prisma.commission.create({
    data: { ...normalizeOptional(data) as any, slug },
  });
  revalidateLigue();
  return created;
}

export async function updateCommission(id: string, input: Partial<CommissionInput>) {
  await requireAdmin();
  const data = CommissionSchema.partial().parse(input);
  const payload: Record<string, unknown> = normalizeOptional(data);
  if (data.slug) payload.slug = slugify(data.slug);
  const updated = await prisma.commission.update({ where: { id }, data: payload as any });
  revalidateLigue();
  return updated;
}

export async function deleteCommission(id: string) {
  await requireAdmin();
  await prisma.commission.delete({ where: { id } });
  revalidateLigue();
}

/* ─────────────────────── COMMISSION MEMBER ─────────────────────── */

const CommissionMemberSchema = z.object({
  fullName: z.string().min(1, "Nom requis"),
  role: z.string().min(1, "Rôle requis"),
  order: z.number().int().default(0),
  photo: z.string().url().nullable().optional().or(z.literal("")),
  email: z.string().email().nullable().optional().or(z.literal("")),
  commissionId: z.string().min(1),
});

export type CommissionMemberInput = z.infer<typeof CommissionMemberSchema>;

export async function createCommissionMember(input: CommissionMemberInput) {
  await requireAdmin();
  const data = CommissionMemberSchema.parse(input);
  const created = await prisma.commissionMember.create({ data: normalizeOptional(data) as any });
  revalidateLigue();
  return created;
}

export async function updateCommissionMember(id: string, input: Partial<CommissionMemberInput>) {
  await requireAdmin();
  const data = CommissionMemberSchema.partial().parse(input);
  const updated = await prisma.commissionMember.update({ where: { id }, data: normalizeOptional(data) as any });
  revalidateLigue();
  return updated;
}

export async function deleteCommissionMember(id: string) {
  await requireAdmin();
  await prisma.commissionMember.delete({ where: { id } });
  revalidateLigue();
}

/* ─────────────────────── PLAYER OF MONTH ─────────────────────── */

const PlayerOfMonthSchema = z.object({
  mode: z.enum(["GAZON", "SALLE"]),
  memberId: z.string().min(1, "Joueur requis"),
  periodLabel: z.string().min(1, "Période requise"),
  effectiveAt: z.coerce.date(),
  photo: z.string().url().nullable().optional().or(z.literal("")),
  goals: z.coerce.number().int().nullable().optional(),
  assists: z.coerce.number().int().nullable().optional(),
  extraStatLabel: z.string().nullable().optional().or(z.literal("")),
  extraStatValue: z.string().nullable().optional().or(z.literal("")),
  sponsor: z.string().nullable().optional().or(z.literal("")),
  quote: z.string().nullable().optional().or(z.literal("")),
});

export type PlayerOfMonthInput = z.infer<typeof PlayerOfMonthSchema>;

export async function createPlayerOfMonth(input: PlayerOfMonthInput) {
  await requireAdmin();
  const data = PlayerOfMonthSchema.parse(input);
  const created = await prisma.playerOfMonth.create({ data: normalizeOptional(data) as any });
  revalidateHome();
  return created;
}

export async function updatePlayerOfMonth(id: string, input: Partial<PlayerOfMonthInput>) {
  await requireAdmin();
  const data = PlayerOfMonthSchema.partial().parse(input);
  const updated = await prisma.playerOfMonth.update({ where: { id }, data: normalizeOptional(data) as any });
  revalidateHome();
  return updated;
}

export async function deletePlayerOfMonth(id: string) {
  await requireAdmin();
  await prisma.playerOfMonth.delete({ where: { id } });
  revalidateHome();
}
