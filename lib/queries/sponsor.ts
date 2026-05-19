import { prisma } from "@/lib/prisma";

export async function getSponsorsAdmin() {
  return prisma.sponsor.findMany({
    orderBy: [{ scope: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      logo: true,
      website: true,
      scope: true,
      clubId: true,
      club: { select: { id: true, name: true, shortCode: true } },
    },
  });
}

export async function getClubsForSponsorPicker() {
  return prisma.club.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, shortCode: true },
  });
}

export type SponsorAdminRow = Awaited<ReturnType<typeof getSponsorsAdmin>>[number];
export type ClubPickerRow = Awaited<ReturnType<typeof getClubsForSponsorPicker>>[number];
