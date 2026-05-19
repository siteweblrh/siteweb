'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

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

function revalidateSponsors() {
  revalidatePath("/");
  revalidatePath("/dashboard/ligue/sponsors");
  // Les fiches club affichent les sponsors CLUB.
  revalidatePath("/clubs", "page");
}

const SponsorSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  logo: z.string().url().nullable().optional().or(z.literal("")),
  website: z.string().url("URL invalide (https://…)").nullable().optional().or(z.literal("")),
  scope: z.enum(["LIGUE", "CLUB", "EVENT"]),
  clubId: z.string().nullable().optional().or(z.literal("")),
}).superRefine((val, ctx) => {
  if (val.scope === "CLUB" && !val.clubId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Club obligatoire pour un sponsor de scope CLUB",
      path: ["clubId"],
    });
  }
});

export type SponsorInput = z.infer<typeof SponsorSchema>;

function normalize(data: SponsorInput) {
  return {
    name: data.name.trim(),
    logo: data.logo ? data.logo : null,
    website: data.website ? data.website : null,
    scope: data.scope,
    clubId: data.scope === "CLUB" && data.clubId ? data.clubId : null,
  };
}

export async function createSponsor(input: SponsorInput) {
  await requireAdmin();
  const data = normalize(SponsorSchema.parse(input));
  const created = await prisma.sponsor.create({
    data,
    select: { id: true, name: true, scope: true, clubId: true },
  });
  await logAudit({
    action: "CREATE_SPONSOR",
    entity: "Sponsor",
    entityId: created.id,
    metadata: { name: created.name, scope: created.scope, clubId: created.clubId },
  });
  revalidateSponsors();
  return created;
}

export async function updateSponsor(id: string, input: SponsorInput) {
  await requireAdmin();
  const data = normalize(SponsorSchema.parse(input));
  const updated = await prisma.sponsor.update({
    where: { id },
    data,
    select: { id: true, name: true, scope: true, clubId: true },
  });
  await logAudit({
    action: "UPDATE_SPONSOR",
    entity: "Sponsor",
    entityId: id,
    metadata: { name: updated.name, scope: updated.scope, clubId: updated.clubId },
  });
  revalidateSponsors();
  return updated;
}

export async function deleteSponsor(id: string) {
  await requireAdmin();
  const sponsor = await prisma.sponsor.findUnique({
    where: { id },
    select: { name: true, scope: true, clubId: true },
  });
  await prisma.sponsor.delete({ where: { id } });
  await logAudit({
    action: "DELETE_SPONSOR",
    entity: "Sponsor",
    entityId: id,
    metadata: sponsor
      ? { name: sponsor.name, scope: sponsor.scope, clubId: sponsor.clubId }
      : null,
  });
  revalidateSponsors();
}
