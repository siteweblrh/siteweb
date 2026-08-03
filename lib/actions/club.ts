'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { CACHE_TAGS, revalidatePublic } from "@/lib/cache/public";
import { z } from "zod";
import { SocialLinkSchema } from "@/lib/clubSocials";

function parseClub(input: ClubInput) {
  const result = ClubSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join(" · "));
  }
  return result.data;
}

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
  // Les clubs apparaissent dans /classements et dans les OG images de club,
  // tous deux servis par le cache de données. Cf. lib/cache/public.ts.
  revalidatePublic(CACHE_TAGS.clubs, CACHE_TAGS.competitions);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ligue/clubs");
  revalidatePath("/dashboard/competitions");
  revalidatePath("/dashboard/matches");
  revalidatePath("/clubs");
  revalidatePath("/competitions");
  revalidatePath("/classements");
  revalidatePath("/");
  // Toute modification d'un club (nom, logo, sponsors, etc.) impacte sa
  // propre fiche. La syntaxe ('/clubs/[slug]', 'page') invalide toutes les
  // fiches club en un coup — on n'a pas toujours le slug sous la main et
  // les modifs peuvent toucher plusieurs clubs (ex. ajout d'une entente).
  revalidatePath("/clubs/[slug]", "page");
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
  // Logo : URL https (Cloudinary ou autre). null/"" pour pas de logo
  // (fallback ClubCrest généré côté UI).
  logo: z.union([z.string().url().max(500), z.literal(""), z.null()]).optional(),
  // Position carte : optionnels. Si remplis, prioritaires sur lookup par ville.
  latitude: z
    .union([z.null(), z.coerce.number().min(-90).max(90)])
    .optional(),
  longitude: z
    .union([z.null(), z.coerce.number().min(-180).max(180)])
    .optional(),
}).refine(
  (d) => d.kind !== "ENTENTE" || d.parentClubIds.length >= 2,
  { message: "Une entente doit regrouper au moins 2 clubs.", path: ["parentClubIds"] },
).refine(
  (d) => d.kind !== "STANDALONE" || d.parentClubIds.length === 0,
  { message: "Un club standalone ne peut pas avoir de clubs parents.", path: ["parentClubIds"] },
).transform((d) => {
  // Normalise les coords partielles (une seule des deux remplie) → both null.
  // Évite de bloquer la sauvegarde quand la DB a une coord orpheline historique
  // (ex : admin upload juste un logo sur un club aux coords partielles).
  // Le check bbox ci-dessous ne s'applique donc qu'aux coords COMPLÈTES.
  if ((d.latitude == null) !== (d.longitude == null)) {
    return { ...d, latitude: null, longitude: null };
  }
  return d;
}).refine(
  // Coordonnées : si les deux sont set, doivent être dans la bbox Réunion.
  // Bloque notamment (0,0) saisi par erreur — marker dans l'océan Atlantique.
  (d) => {
    if (d.latitude == null || d.longitude == null) return true;
    return d.latitude >= -21.42 && d.latitude <= -20.85
        && d.longitude >= 55.19 && d.longitude <= 55.86;
  },
  { message: "Coordonnées hors de La Réunion. Laissez vide pour utiliser la position de la commune.", path: ["latitude"] },
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
      logo: true,
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
  const data = parseClub(input);

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
      logo: data.logo ? data.logo.trim() : null,
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
  const data = parseClub(input);

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
      // `logo: undefined` → champ non modifié ; `logo: null` → effacé.
      // L'admin envoie "" pour effacer (UI ImageUploader), on convertit.
      logo: data.logo === undefined ? undefined : data.logo ? data.logo.trim() : null,
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

export async function deleteClub(
  id: string,
  options: { deleteLinkedAccounts?: boolean } = {},
) {
  await requireAdmin();
  const club = await prisma.club.findUnique({
    where: { id },
    select: {
      kind: true,
      users: { select: { id: true } },
      _count: {
        select: {
          members: true,
          homeMatches: true,
          awayMatches: true,
          standings: true,
        },
      },
    },
  });
  if (!club) throw new Error("Club introuvable");

  const userIds = club.users.map((u) => u.id);

  const blockers: string[] = [];
  // Les comptes liés ne bloquent QUE si la case "supprimer aussi les comptes
  // liés" n'est pas cochée. Cochée, on les supprime plus bas.
  if (!options.deleteLinkedAccounts && userIds.length > 0) {
    blockers.push(`${userIds.length} compte(s) utilisateur(s) affilié(s)`);
  }
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

  if (options.deleteLinkedAccounts && userIds.length > 0) {
    // Garde-fou : News.author / MatchNote.author n'ont pas de cascade — un
    // compte ayant rédigé du contenu ferait échouer la suppression au niveau
    // FK. On refuse proprement plutôt que de laisser crasher.
    const [newsCount, noteCount] = await Promise.all([
      prisma.news.count({ where: { authorId: { in: userIds } } }),
      prisma.matchNote.count({ where: { authorId: { in: userIds } } }),
    ]);
    if (newsCount + noteCount > 0) {
      throw new Error(
        `Un compte lié a rédigé ${newsCount} article(s) et ${noteCount} note(s) de match. ` +
        `Réattribuez ou supprimez ces contenus avant de supprimer le club.`,
      );
    }
  }

  // Account / Session / PasswordResetToken cascadent avec le User (DB-level),
  // AuditLog passe en SetNull. CompetitionEntry cascade avec le Club.
  // Transaction : tout passe, ou rien.
  await prisma.$transaction([
    ...(options.deleteLinkedAccounts && userIds.length > 0
      ? [prisma.user.deleteMany({ where: { id: { in: userIds } } })]
      : []),
    prisma.club.delete({ where: { id } }),
  ]);
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
