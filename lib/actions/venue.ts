'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");
  return session;
}

async function requireAdmin() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Réservé aux administrateurs");
  return session;
}

function revalidateVenue() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ligue/venues");
  revalidatePath("/dashboard/venues");
  revalidatePath("/dashboard/matches");
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

export async function createVenue(input: VenueInput) {
  await requireAdmin();
  const data = VenueSchema.parse(input);
  const created = await prisma.venue.create({
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
  return created;
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
  // Détache les clubs qui pointent dessus
  await prisma.club.updateMany({
    where: { homeVenueGazonId: id },
    data: { homeVenueGazonId: null },
  });
  await prisma.club.updateMany({
    where: { homeVenueSalleId: id },
    data: { homeVenueSalleId: null },
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
