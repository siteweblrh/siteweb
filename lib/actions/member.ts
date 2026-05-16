'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireClubMemberOrAdmin(clubId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, clubId: true },
  });
  if (!user) throw new Error("Compte introuvable");
  if (user.role !== "ADMIN" && user.clubId !== clubId) {
    throw new Error("Non autorisé à modifier l'effectif de ce club");
  }
  return { session, user };
}

function revalidateMembers(clubSlug?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  revalidatePath("/clubs");
  if (clubSlug) revalidatePath(`/clubs/${clubSlug}`);
}

const MemberKindEnum = z.enum(["PLAYER", "COACH", "STAFF"]);
const MemberCategoryEnum = z.enum(["U11", "U14", "U17", "U19", "SENIOR", "VETERAN"]);

const MemberSchema = z.object({
  firstName: z.string().min(1, "Prénom requis").max(80),
  lastName: z.string().min(1, "Nom requis").max(80),
  license: z.string().min(1, "Numéro de licence requis").max(40),
  kind: MemberKindEnum.default("PLAYER"),
  category: MemberCategoryEnum.default("SENIOR"),
  position: z.string().max(60).optional().or(z.literal("")),
  jerseyNumber: z
    .union([z.coerce.number().int().min(0).max(999), z.null()])
    .optional(),
  photo: z.string().url().max(500).optional().or(z.literal("")),
  birthdate: z.string().optional().or(z.literal("")),
  isFeatured: z.boolean().optional(),
  featuredHeadline: z.string().max(200).optional().or(z.literal("")),
  matchesPlayed: z.coerce.number().int().min(0).max(10000).optional(),
  goalsScored: z.coerce.number().int().min(0).max(10000).optional(),
});

export type MemberInput = z.infer<typeof MemberSchema>;

function normalizeOptional(v?: string | null) {
  if (v == null) return null;
  const s = v.toString().trim();
  return s.length > 0 ? s : null;
}

function parseBirthdate(v?: string | null): Date | null {
  const s = normalizeOptional(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Date de naissance invalide");
  }
  return d;
}

const MEMBER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  license: true,
  kind: true,
  category: true,
  position: true,
  jerseyNumber: true,
  photo: true,
  birthdate: true,
  isFeatured: true,
  featuredHeadline: true,
  matchesPlayed: true,
  goalsScored: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listMembersForClub(clubId: string) {
  await requireClubMemberOrAdmin(clubId);
  return prisma.member.findMany({
    where: { clubId },
    orderBy: [
      { kind: "asc" },
      { category: "asc" },
      { jerseyNumber: "asc" },
      { lastName: "asc" },
    ],
    select: MEMBER_SELECT,
  });
}

export type MemberRow = Awaited<ReturnType<typeof listMembersForClub>>[number];

function applyPlayerOnlyFields(
  data: MemberInput,
): {
  isFeatured: boolean;
  featuredHeadline: string | null;
  matchesPlayed: number;
  goalsScored: number;
} {
  if (data.kind !== "PLAYER") {
    return {
      isFeatured: false,
      featuredHeadline: null,
      matchesPlayed: 0,
      goalsScored: 0,
    };
  }
  return {
    isFeatured: Boolean(data.isFeatured),
    featuredHeadline: data.isFeatured
      ? normalizeOptional(data.featuredHeadline)
      : null,
    matchesPlayed: data.matchesPlayed ?? 0,
    goalsScored: data.goalsScored ?? 0,
  };
}

export async function createMember(clubId: string, input: MemberInput) {
  await requireClubMemberOrAdmin(clubId);
  const data = MemberSchema.parse(input);
  const birthdate = parseBirthdate(data.birthdate);
  const playerFields = applyPlayerOnlyFields(data);

  try {
    const created = await prisma.member.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        license: data.license.trim(),
        kind: data.kind,
        category: data.category,
        position: normalizeOptional(data.position),
        jerseyNumber: data.jerseyNumber ?? null,
        photo: normalizeOptional(data.photo),
        birthdate,
        clubId,
        ...playerFields,
      },
    });
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { slug: true },
    });
    revalidateMembers(club?.slug);
    return created;
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new Error("Ce numéro de licence est déjà enregistré.");
    }
    throw e;
  }
}

export async function updateMember(id: string, input: MemberInput) {
  const existing = await prisma.member.findUnique({
    where: { id },
    select: { clubId: true },
  });
  if (!existing) throw new Error("Licencié introuvable");
  await requireClubMemberOrAdmin(existing.clubId);

  const data = MemberSchema.parse(input);
  const birthdate = parseBirthdate(data.birthdate);
  const playerFields = applyPlayerOnlyFields(data);

  try {
    const updated = await prisma.member.update({
      where: { id },
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        license: data.license.trim(),
        kind: data.kind,
        category: data.category,
        position: normalizeOptional(data.position),
        jerseyNumber: data.jerseyNumber ?? null,
        photo: normalizeOptional(data.photo),
        birthdate,
        ...playerFields,
      },
    });
    const club = await prisma.club.findUnique({
      where: { id: existing.clubId },
      select: { slug: true },
    });
    revalidateMembers(club?.slug);
    return updated;
  } catch (e: any) {
    if (e?.code === "P2002") {
      throw new Error("Ce numéro de licence est déjà enregistré sur un autre licencié.");
    }
    throw e;
  }
}

export async function deleteMember(id: string) {
  const existing = await prisma.member.findUnique({
    where: { id },
    select: { clubId: true, club: { select: { slug: true } } },
  });
  if (!existing) throw new Error("Licencié introuvable");
  await requireClubMemberOrAdmin(existing.clubId);

  await prisma.member.delete({ where: { id } });
  revalidateMembers(existing.club?.slug);
}
