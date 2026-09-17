import { prisma } from '@/lib/prisma';
import type { Mode } from '@prisma/client';

const mvpSelect = {
  id: true,
  matchday: true,
  effectiveAt: true,
  photo: true,
  goals: true,
  assists: true,
  extraStatLabel: true,
  extraStatValue: true,
  sponsor: true,
  quote: true,
  competition: { select: { id: true, name: true, slug: true, mode: true, season: true } },
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
} as const;

/**
 * MVP de la dernière journée jouée dans une discipline.
 *
 * La discipline se lit sur la COMPÉTITION, jamais sur la récompense : la
 * stocker en double laisserait un MVP « gazon » pointer une compétition salle.
 *
 * Pas de scope par saison : une nomination porte sa propre date d'effet, et la
 * plus récente EST l'actuelle, par construction.
 */
export async function getLatestMvp(mode: Mode) {
  return prisma.matchdayMvp.findFirst({
    where: { competition: { mode } },
    orderBy: { effectiveAt: 'desc' },
    select: mvpSelect,
  });
}

/** Historique complet, pour l'écran d'administration. */
export async function getAllMvps() {
  return prisma.matchdayMvp.findMany({
    orderBy: { effectiveAt: 'desc' },
    select: mvpSelect,
  });
}

export type MatchdayMvpData = Awaited<ReturnType<typeof getLatestMvp>>;
export type MatchdayMvpRow = Awaited<ReturnType<typeof getAllMvps>>[number];
