import { prisma } from "@/lib/prisma";
import type { Mode } from "@prisma/client";

export async function getPlayerOfMonth(mode: Mode) {
  return prisma.playerOfMonth.findFirst({
    where: { mode },
    orderBy: { effectiveAt: "desc" },
    select: {
      id: true,
      mode: true,
      periodLabel: true,
      effectiveAt: true,
      photo: true,
      goals: true,
      assists: true,
      extraStatLabel: true,
      extraStatValue: true,
      sponsor: true,
      quote: true,
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jerseyNumber: true,
          position: true,
          photo: true,
          club: { select: { id: true, slug: true, shortCode: true, name: true } },
        },
      },
    },
  });
}

export type PlayerOfMonthData = Awaited<ReturnType<typeof getPlayerOfMonth>>;
