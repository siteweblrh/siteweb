'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SocialLinkSchema } from "@/lib/clubSocials";

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
  // Position carte : optionnels. Si remplis, prioritaires sur lookup par ville.
  latitude: z
    .union([z.coerce.number().min(-90).max(90), z.null()])
    .optional(),
  longitude: z
    .union([z.coerce.number().min(-180).max(180), z.null()])
    .optional(),
}).refine(
  (d) => d.kind !== "ENTENTE" || d.parentClubIds.length >= 2,
  { message: "Une entente doit regrouper au moins 2 clubs.", path: ["parentClubIds"] },
).refine(
  (d) => d.kind !== "STANDALONE" || d.parentClubIds.length === 0,
  { message: "Un club standalone ne peut pas avoir de clubs parents.", path: ["parentClubIds"] },
).refine(
  // Coordonnées : soit les deux nulles, soit les deux dans la bbox Réunion.
  // Bloque notamment (0,0) saisi par erreur — marker dans l'océan Atlantique.
  (d) => {
    const hasLat = d.latitude != null;
    const hasLon = d.longitude != null;
    if (!hasLat && !hasLon) return true;
    if (hasLat !== hasLon) return false;
    const lat = d.latitude as number;
    const lon = d.longitude as number;
    return lat >= -21.42 && lat <= -20.85 && lon >= 55.19 && lon <= 55.86;
  },
  { message: "Coordonnées hors de La Réunion (ou seulement l'une des deux renseignée). Laissez vide pour utiliser la position de la commune.", path: ["latitude"] },
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
      latitude: true,
      longitude: true,
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
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
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
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
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

// ─────────────────────────────────────────────────────────────────────────────
// Profil club éditable par le manager (ou l'admin)
// ─────────────────────────────────────────────────────────────────────────────

const HEX_COLOR = /^#?[0-9a-fA-F]{6}$/;
const YEAR_MIN = 1900;
const YEAR_MAX = new Date().getFullYear() + 1;

const ClubProfileSchema = z.object({
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  website: z
    .string()
    .url("URL invalide (https://…)")
    .max(300)
    .optional()
    .or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  socials: z.array(SocialLinkSchema).max(12, "Maximum 12 liens").optional(),
  description: z.string().max(2000).optional().or(z.literal("")),
  primaryColor: z
    .string()
    .regex(HEX_COLOR, "Couleur hex attendue (#RRGGBB)")
    .optional()
    .or(z.literal("")),
  logo: z.string().url().max(500).optional().or(z.literal("")),
  foundedYear: z
    .union([z.coerce.number().int().min(YEAR_MIN).max(YEAR_MAX), z.null()])
    .optional(),
});

export type ClubProfileInput = z.infer<typeof ClubProfileSchema>;

async function requireClubMemberOrAdmin(clubId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, clubId: true },
  });
  if (!user) throw new Error("Compte introuvable");
  if (user.role !== "ADMIN" && user.clubId !== clubId) {
    throw new Error("Non autorisé à modifier ce club");
  }
  return { session, user };
}

export async function getClubProfile(clubId: string) {
  return prisma.club.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      slug: true,
      shortCode: true,
      name: true,
      city: true,
      kind: true,
      email: true,
      phone: true,
      website: true,
      address: true,
      socials: true,
      description: true,
      primaryColor: true,
      logo: true,
      foundedYear: true,
    },
  });
}

export type ClubProfileRow = NonNullable<Awaited<ReturnType<typeof getClubProfile>>>;

function normalizeOptional(v?: string | null) {
  if (v == null) return null;
  const s = v.toString().trim();
  return s.length > 0 ? s : null;
}

function normalizeColor(v?: string | null) {
  const s = normalizeOptional(v);
  if (!s) return null;
  return s.startsWith("#") ? s.toUpperCase() : "#" + s.toUpperCase();
}

export async function updateClubProfile(clubId: string, input: ClubProfileInput) {
  await requireClubMemberOrAdmin(clubId);
  const data = ClubProfileSchema.parse(input);

  const socials = (data.socials ?? []).map((s) => ({
    label: s.label.trim(),
    url: s.url.trim(),
  }));

  const updated = await prisma.club.update({
    where: { id: clubId },
    data: {
      email: normalizeOptional(data.email),
      phone: normalizeOptional(data.phone),
      website: normalizeOptional(data.website),
      address: normalizeOptional(data.address),
      socials: socials.length > 0 ? socials : [],
      description: normalizeOptional(data.description),
      primaryColor: normalizeColor(data.primaryColor),
      logo: normalizeOptional(data.logo),
      foundedYear: data.foundedYear ?? null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/club/profile");
  revalidatePath("/clubs");
  if (updated.slug) revalidatePath(`/clubs/${updated.slug}`);
  return updated;
}
