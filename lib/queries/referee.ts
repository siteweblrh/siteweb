import { prisma } from "@/lib/prisma";

export async function getAllReferees() {
  return prisma.referee.findMany({
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      license: true,
      email: true,
      phone: true,
      notes: true,
      _count: { select: { matches: true } },
    },
  });
}

export async function getMatchReferees(matchId: string) {
  return prisma.matchReferee.findMany({
    where: { matchId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      role: true,
      referee: {
        select: { id: true, fullName: true, license: true },
      },
    },
  });
}

export type RefereeAdminRow = Awaited<ReturnType<typeof getAllReferees>>[number];
export type MatchRefereeRow = Awaited<ReturnType<typeof getMatchReferees>>[number];
