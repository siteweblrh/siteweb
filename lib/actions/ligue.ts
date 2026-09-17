'use server';

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireAdmin } from '@/lib/auth/require-admin';
import { revalidatePath } from "next/cache";
import { z } from "zod";


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

/**
 * Remplace les chaînes vides par `null` avant l'écriture en base — un champ
 * laissé vide dans un formulaire ne doit pas être stocké comme `""`.
 *
 * Le type de retour reste `T` : les champs concernés sont déjà déclarés
 * nullables dans les schémas zod ci-dessus, donc `null` fait partie de leur
 * type. Le conserver au lieu de retomber sur `Record<string, unknown>` est ce
 * qui permet à Prisma de valider les objets côté appelant, là où il fallait
 * auparavant un `as any` qui désactivait toute vérification.
 */
function normalizeOptional<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = { ...data };
  for (const k of Object.keys(out)) {
    if (out[k] === "") out[k] = null;
  }
  return out as T;
}

export async function createBureauMember(input: BureauMemberInput) {
  await requireAdmin();
  const data = BureauMemberSchema.parse(input);
  const created = await prisma.bureauMember.create({ data: normalizeOptional(data) });
  revalidateLigue();
  return created;
}

export async function updateBureauMember(id: string, input: Partial<BureauMemberInput>) {
  await requireAdmin();
  const data = BureauMemberSchema.partial().parse(input);
  const updated = await prisma.bureauMember.update({ where: { id }, data: normalizeOptional(data) });
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
    data: { ...normalizeOptional(data), slug },
  });
  revalidateLigue();
  return created;
}

export async function updateCommission(id: string, input: Partial<CommissionInput>) {
  await requireAdmin();
  const data = CommissionSchema.partial().parse(input);
  const payload: Prisma.CommissionUncheckedUpdateInput = normalizeOptional(data);
  if (data.slug) payload.slug = slugify(data.slug);
  const updated = await prisma.commission.update({ where: { id }, data: payload });
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
  const created = await prisma.commissionMember.create({ data: normalizeOptional(data) });
  revalidateLigue();
  return created;
}

export async function updateCommissionMember(id: string, input: Partial<CommissionMemberInput>) {
  await requireAdmin();
  const data = CommissionMemberSchema.partial().parse(input);
  const updated = await prisma.commissionMember.update({ where: { id }, data: normalizeOptional(data) });
  revalidateLigue();
  return updated;
}

export async function deleteCommissionMember(id: string) {
  await requireAdmin();
  await prisma.commissionMember.delete({ where: { id } });
  revalidateLigue();
}

/* ─────────────────────── MVP DE LA JOURNÉE ─────────────────────── */

const MatchdayMvpSchema = z.object({
  // La discipline n'est pas saisie : elle se lit sur la compétition.
  competitionId: z.string().min(1, "Compétition requise"),
  // Journée facultative — toutes ne sont pas numérotées.
  matchday: z.coerce.number().int().min(1).nullable().optional(),
  memberId: z.string().min(1, "Joueur requis"),
  effectiveAt: z.coerce.date(),
  photo: z.string().url().nullable().optional().or(z.literal("")),
  goals: z.coerce.number().int().nullable().optional(),
  assists: z.coerce.number().int().nullable().optional(),
  extraStatLabel: z.string().nullable().optional().or(z.literal("")),
  extraStatValue: z.string().nullable().optional().or(z.literal("")),
  sponsor: z.string().nullable().optional().or(z.literal("")),
  quote: z.string().nullable().optional().or(z.literal("")),
});

export type MatchdayMvpInput = z.infer<typeof MatchdayMvpSchema>;

export async function createMatchdayMvp(input: MatchdayMvpInput) {
  await requireAdmin();
  const data = MatchdayMvpSchema.parse(input);
  const created = await prisma.matchdayMvp.create({ data: normalizeOptional(data) });
  revalidateHome();
  return created;
}

export async function updateMatchdayMvp(id: string, input: Partial<MatchdayMvpInput>) {
  await requireAdmin();
  const data = MatchdayMvpSchema.partial().parse(input);
  const updated = await prisma.matchdayMvp.update({ where: { id }, data: normalizeOptional(data) });
  revalidateHome();
  return updated;
}

export async function deleteMatchdayMvp(id: string) {
  await requireAdmin();
  await prisma.matchdayMvp.delete({ where: { id } });
  revalidateHome();
}
