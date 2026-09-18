'use server';

import { prisma } from "@/lib/prisma";
import { requireAdmin } from '@/lib/auth/require-admin';
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { CACHE_TAGS, revalidatePublic } from "@/lib/cache/public";
import { z } from "zod";
import {
  normalizeVenueLabel,
  normalizeVenueLabelLoose,
  sharesSurface,
} from "@/lib/utils/venue-label";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");
  return session;
}


function revalidateVenue() {
  // Les matchs embarquent `venueRef` (lib/queries/competition.ts:282), qui fait
  // partie de la charge cachée de /classements et /jeunes. Renommer un terrain
  // y laissait l'ancien nom jusqu'à 1 h. Cf. lib/cache/public.ts.
  revalidatePublic(CACHE_TAGS.competitions, CACHE_TAGS.clubs);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ligue/venues");
  revalidatePath("/dashboard/venues");
  revalidatePath("/dashboard/matches");
  // La fiche club publique liste les terrains (home + entraînement),
  // il faut purger son ISR aussi.
  revalidatePath("/clubs/[slug]", "page");
}

const VenueSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  city: z.string().min(1, "Ville requise"),
  address: z.string().optional().nullable().or(z.literal("")),
  supportsGazon: z.boolean().default(false),
  supportsSalle: z.boolean().default(false),
  notes: z.string().optional().nullable().or(z.literal("")),
}).refine((d) => d.supportsGazon || d.supportsSalle, {
  message: "Au moins une surface (gazon ou salle) doit être cochée.",
  path: ["supportsGazon"],
});

export type VenueInput = z.infer<typeof VenueSchema>;

/**
 * Un doublon est une erreur ATTENDUE : elle se retourne, elle ne se lance pas.
 * En production, React remplace le message de toute erreur sérialisée par un
 * texte générique (`resolveErrorProd`) — un `throw new Error('…')` afficherait
 * « An error occurred in the Server Components render » à l'admin, ce qui ne
 * lui apprendrait rien. Cf. le guide Next `interactive-apps.md` : les erreurs
 * attendues sont retournées, les inattendues remontent à l'error boundary.
 */
export type CreateVenueResult =
  | { ok: true; venue: { id: string; name: string; city: string } }
  | { ok: false; message: string; existingId: string };

export async function createVenue(input: VenueInput): Promise<CreateVenueResult> {
  // Ouvert aux ADMIN et aux managers d'un club (rattachés à un club).
  // L'attribution createdByClubId marque la provenance pour l'admin.
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { role: true, clubId: true },
  });
  if (user?.role !== "ADMIN" && !user?.clubId) {
    throw new Error("Réservé aux administrateurs et aux managers de club.");
  }

  const data = VenueSchema.parse(input);
  const name = data.name.trim();
  const city = data.city.trim();

  // Garde-fou anti-doublon.
  //   Portée    : action d'admin uniquement, jamais sur une page publique.
  //   Fréquence : une fois par création manuelle de terrain — quelques
  //               dizaines par saison, pas de quoi réveiller Neon plus
  //               longtemps que la création elle-même.
  //   Défaillance : si la lecture échoue, la création échoue avec elle. Pas
  //               de try/catch muet qui laisserait passer le doublon.
  // On relit toute la table (9 lignes en prod au 2026-09-18) plutôt que de
  // filtrer en SQL : Postgres ne sait pas comparer sans accents ni casse sans
  // extension, et la table restera de l'ordre de la dizaine de lignes.
  const existingVenues = await prisma.venue.findMany({
    select: { id: true, name: true, city: true, supportsGazon: true, supportsSalle: true },
  });

  const candidate = { supportsGazon: data.supportsGazon, supportsSalle: data.supportsSalle };
  const sameCity = existingVenues.filter(
    (v) => normalizeVenueLabel(v.city) === normalizeVenueLabel(city) && sharesSurface(candidate, v),
  );

  const exact = sameCity.find((v) => normalizeVenueLabel(v.name) === normalizeVenueLabel(name));
  if (exact) {
    return {
      ok: false,
      existingId: exact.id,
      message: `« ${exact.name} » existe déjà à ${exact.city} pour cette surface. Utilisez ce terrain plutôt que d'en créer un second — son adresse et ses notes restent modifiables.`,
    };
  }

  const near = sameCity.find((v) => normalizeVenueLabelLoose(v.name) === normalizeVenueLabelLoose(name));
  if (near) {
    return {
      ok: false,
      existingId: near.id,
      message: `Un terrain très proche existe déjà à ${near.city} : « ${near.name} ». Si c'est le même, utilisez-le. Si c'en est vraiment un autre, donnez-lui un nom qui les distingue.`,
    };
  }

  const created = await prisma.venue.create({
    data: {
      name,
      city,
      address: data.address?.toString().trim() || null,
      supportsGazon: data.supportsGazon,
      supportsSalle: data.supportsSalle,
      notes: data.notes?.toString().trim() || null,
      // Si créé par un manager, garde la trace. Si admin, null.
      createdByClubId: user?.role === "ADMIN" ? null : user?.clubId ?? null,
    },
    select: { id: true, name: true, city: true },
  });
  revalidateVenue();
  return { ok: true, venue: created };
}

export async function updateVenue(id: string, input: VenueInput) {
  await requireAdmin();
  const data = VenueSchema.parse(input);
  const updated = await prisma.venue.update({
    where: { id },
    data: {
      name: data.name.trim(),
      city: data.city.trim(),
      address: data.address?.toString().trim() || null,
      supportsGazon: data.supportsGazon,
      supportsSalle: data.supportsSalle,
      notes: data.notes?.toString().trim() || null,
    },
  });
  revalidateVenue();
  return updated;
}

export async function deleteVenue(id: string) {
  await requireAdmin();
  const matchCount = await prisma.match.count({ where: { venueId: id } });
  if (matchCount > 0) {
    throw new Error(`Ce terrain est utilisé par ${matchCount} match${matchCount > 1 ? "s" : ""}. Retirez-le des matchs avant de supprimer.`);
  }
  // Détache les clubs qui pointent dessus (home + training × gazon/salle).
  await prisma.club.updateMany({
    where: { homeVenueGazonId: id },
    data: { homeVenueGazonId: null },
  });
  await prisma.club.updateMany({
    where: { homeVenueSalleId: id },
    data: { homeVenueSalleId: null },
  });
  await prisma.club.updateMany({
    where: { trainingVenueGazonId: id },
    data: { trainingVenueGazonId: null },
  });
  await prisma.club.updateMany({
    where: { trainingVenueSalleId: id },
    data: { trainingVenueSalleId: null },
  });
  await prisma.venue.delete({ where: { id } });
  revalidateVenue();
}

const ClubVenueAssignmentSchema = z.object({
  mode: z.enum(["GAZON", "SALLE"]),
  venueId: z.string().nullable(),
});

export type ClubVenueAssignmentInput = z.infer<typeof ClubVenueAssignmentSchema>;

export async function setClubHomeVenue(clubId: string, input: ClubVenueAssignmentInput) {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { role: true, clubId: true },
  });
  // Admin ou membre du club
  if (user?.role !== "ADMIN" && user?.clubId !== clubId) {
    throw new Error("Non autorisé à modifier ce club");
  }

  const data = ClubVenueAssignmentSchema.parse(input);

  if (data.venueId) {
    const venue = await prisma.venue.findUnique({
      where: { id: data.venueId },
      select: { supportsGazon: true, supportsSalle: true },
    });
    if (!venue) throw new Error("Terrain introuvable");
    if (data.mode === "GAZON" && !venue.supportsGazon) {
      throw new Error("Ce terrain ne supporte pas le gazon");
    }
    if (data.mode === "SALLE" && !venue.supportsSalle) {
      throw new Error("Ce terrain ne supporte pas la salle");
    }
  }

  const field = data.mode === "GAZON" ? "homeVenueGazonId" : "homeVenueSalleId";
  await prisma.club.update({
    where: { id: clubId },
    data: { [field]: data.venueId },
  });
  revalidateVenue();
}

export async function setClubTrainingVenue(clubId: string, input: ClubVenueAssignmentInput) {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { role: true, clubId: true },
  });
  if (user?.role !== "ADMIN" && user?.clubId !== clubId) {
    throw new Error("Non autorisé à modifier ce club");
  }

  const data = ClubVenueAssignmentSchema.parse(input);

  if (data.venueId) {
    const venue = await prisma.venue.findUnique({
      where: { id: data.venueId },
      select: { supportsGazon: true, supportsSalle: true },
    });
    if (!venue) throw new Error("Terrain introuvable");
    if (data.mode === "GAZON" && !venue.supportsGazon) {
      throw new Error("Ce terrain ne supporte pas le gazon");
    }
    if (data.mode === "SALLE" && !venue.supportsSalle) {
      throw new Error("Ce terrain ne supporte pas la salle");
    }
  }

  const field = data.mode === "GAZON" ? "trainingVenueGazonId" : "trainingVenueSalleId";
  await prisma.club.update({
    where: { id: clubId },
    data: { [field]: data.venueId },
  });
  revalidateVenue();
}
