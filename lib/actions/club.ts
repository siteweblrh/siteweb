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

function revalidateClub() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ligue/clubs");
  revalidatePath("/dashboard/competitions");
  revalidatePath("/dashboard/matches");
  revalidatePath("/clubs");
  revalidatePath("/competitions");
  revalidatePath("/classements");
  revalidatePath("/");
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const ClubSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  slug: z.string().optional(),
  shortCode: z.string().nullable().optional().or(z.literal("")),
  city: z.string().min(1, "Ville requise"),
  kind: z.enum(["STANDALONE", "ENTENTE"]).default("STANDALONE"),
  parentClubIds: z.array(z.string()).optional().default([]),
}).refine(
  (d) => d.kind !== "ENTENTE" || d.parentClubIds.length >= 2,
  { message: "Une entente doit regrouper au moins 2 clubs.", path: ["parentClubIds"] },
).refine(
  (d) => d.kind !== "STANDALONE" || d.parentClubIds.length === 0,
  { message: "Un club standalone ne peut pas avoir de clubs parents.", path: ["parentClubIds"] },
);

export type ClubInput = z.infer<typeof ClubSchema>;

export async function listClubsAdmin() {
  await requireAdmin();
  return prisma.club.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      shortCode: true,
      name: true,
      city: true,
      kind: true,
      parentClubs: {
        select: { id: true, slug: true, shortCode: true, name: true, city: true },
      },
      _count: {
        select: {
          users: true,
          members: true,
          homeMatches: true,
          awayMatches: true,
          standings: true,
          competitionEntries: true,
        },
      },
    },
  });
}

export async function createClub(input: ClubInput) {
  await requireAdmin();
  const data = ClubSchema.parse(input);

  // Validate parent clubs are all STANDALONE (no ententes of ententes)
  if (data.kind === "ENTENTE" && data.parentClubIds.length > 0) {
    const parents = await prisma.club.findMany({
      where: { id: { in: data.parentClubIds } },
      select: { id: true, kind: true },
    });
    if (parents.length !== data.parentClubIds.length) {
      throw new Error("Certains clubs parents sont introuvables.");
    }
    if (parents.some((p) => p.kind === "ENTENTE")) {
      throw new Error("Une entente ne peut pas avoir une autre entente comme club membre.");
    }
  }

  const slug = data.slug?.trim() || slugify(data.name);
  const shortCode = data.shortCode?.toString().trim() || null;

  const created = await prisma.club.create({
    data: {
      slug,
      shortCode,
      name: data.name.trim(),
      city: data.city.trim(),
      kind: data.kind,
      parentClubs:
        data.kind === "ENTENTE" && data.parentClubIds.length > 0
          ? { connect: data.parentClubIds.map((id) => ({ id })) }
          : undefined,
    },
  });
  revalidateClub();
  return created;
}

export async function updateClub(id: string, input: ClubInput) {
  await requireAdmin();
  const data = ClubSchema.parse(input);

  if (data.kind === "ENTENTE" && data.parentClubIds.length > 0) {
    const parents = await prisma.club.findMany({
      where: { id: { in: data.parentClubIds } },
      select: { id: true, kind: true },
    });
    if (parents.some((p) => p.kind === "ENTENTE" || p.id === id)) {
      throw new Error("Les clubs parents doivent être des clubs standalone distincts de l'entente.");
    }
  }

  const slug = data.slug?.trim() || slugify(data.name);
  const shortCode = data.shortCode?.toString().trim() || null;

  // Pour parentClubs (M:N), on remplace l'intégralité via set.
  const updated = await prisma.club.update({
    where: { id },
    data: {
      slug,
      shortCode,
      name: data.name.trim(),
      city: data.city.trim(),
      kind: data.kind,
      parentClubs: {
        set: data.kind === "ENTENTE"
          ? data.parentClubIds.map((pid) => ({ id: pid }))
          : [],
      },
    },
  });
  revalidateClub();
  return updated;
}

export async function deleteClub(id: string) {
  await requireAdmin();
  const club = await prisma.club.findUnique({
    where: { id },
    select: {
      kind: true,
      _count: {
        select: {
          users: true,
          members: true,
          homeMatches: true,
          awayMatches: true,
          standings: true,
        },
      },
    },
  });
  if (!club) throw new Error("Club introuvable");

  const blockers: string[] = [];
  if (club._count.users > 0) blockers.push(`${club._count.users} compte(s) utilisateur(s) affilié(s)`);
  if (club._count.members > 0) blockers.push(`${club._count.members} licencié(s)`);
  if (club._count.homeMatches + club._count.awayMatches > 0) {
    blockers.push(`${club._count.homeMatches + club._count.awayMatches} match(s) joué(s) ou programmé(s)`);
  }
  if (club._count.standings > 0) blockers.push(`${club._count.standings} classement(s) actif(s)`);

  if (blockers.length > 0) {
    throw new Error(
      `Impossible de supprimer ce club : ${blockers.join(", ")}. Retirez ces liens d'abord.`,
    );
  }

  // CompetitionEntry cascade auto via onDelete: Cascade
  await prisma.club.delete({ where: { id } });
  revalidateClub();
}

export type ClubAdminRow = Awaited<ReturnType<typeof listClubsAdmin>>[number];
