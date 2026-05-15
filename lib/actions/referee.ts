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

function revalidateReferee() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ligue/arbitres");
  revalidatePath("/dashboard/matches");
}

const RefereeSchema = z.object({
  fullName: z.string().min(1, "Nom requis"),
  license: z.string().optional().nullable().or(z.literal("")),
  email: z.string().email("Email invalide").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable().or(z.literal("")),
});

export type RefereeInput = z.infer<typeof RefereeSchema>;

function normalize(input: RefereeInput) {
  const data = RefereeSchema.parse(input);
  return {
    fullName: data.fullName.trim(),
    license: data.license?.toString().trim() || null,
    email: data.email?.toString().trim() || null,
    phone: data.phone?.toString().trim() || null,
    notes: data.notes?.toString().trim() || null,
  };
}

export async function createReferee(input: RefereeInput) {
  await requireAdmin();
  const data = normalize(input);
  const created = await prisma.referee.create({ data });
  revalidateReferee();
  return created;
}

export async function updateReferee(id: string, input: RefereeInput) {
  await requireAdmin();
  const data = normalize(input);
  const updated = await prisma.referee.update({ where: { id }, data });
  revalidateReferee();
  return updated;
}

export async function deleteReferee(id: string) {
  await requireAdmin();
  // Les MatchReferee sont supprimés en cascade côté schéma.
  await prisma.referee.delete({ where: { id } });
  revalidateReferee();
}
