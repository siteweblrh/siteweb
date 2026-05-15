import { prisma } from "@/lib/prisma";
import type { Mode } from "@prisma/client";

export async function getAllVenues() {
  return prisma.venue.findMany({
    orderBy: [{ city: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      supportsGazon: true,
      supportsSalle: true,
      notes: true,
      _count: { select: { matches: true } },
    },
  });
}

export async function getVenuesForMode(mode: Mode) {
  return prisma.venue.findMany({
    where: mode === "GAZON" ? { supportsGazon: true } : { supportsSalle: true },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      supportsGazon: true,
      supportsSalle: true,
    },
  });
}

export async function getClubVenuePreferences(clubId: string) {
  return prisma.club.findUnique({
    where: { id: clubId },
    select: {
      homeVenueGazonId: true,
      homeVenueSalleId: true,
      homeVenueGazon: { select: { id: true, name: true, city: true } },
      homeVenueSalle: { select: { id: true, name: true, city: true } },
    },
  });
}

export type VenueAdminRow = Awaited<ReturnType<typeof getAllVenues>>[number];
export type VenueForMode = Awaited<ReturnType<typeof getVenuesForMode>>[number];
export type ClubVenuePreferences = NonNullable<
  Awaited<ReturnType<typeof getClubVenuePreferences>>
>;
