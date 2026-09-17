import { prisma } from '@/lib/prisma';

/**
 * Rassemblements jeunes d'une saison, dans l'ordre chronologique.
 *
 * Coût (règle n°2) — Portée : une section de la page /jeunes, donc une seule
 * page publique. Fréquence : la lecture est cachée via `cachePublic` et
 * invalidée par le tag `youth`, donc publier une date rafraîchit la page sans
 * qu'un visiteur ne réveille Neon. Défaillance : si la base ne répond pas,
 * l'erreur remonte — la page entière échoue plutôt que d'afficher un calendrier
 * silencieusement vide, ce qui ferait croire qu'il n'y a pas de rassemblement.
 */
export async function getYouthGatherings(season: string) {
  return prisma.youthGathering.findMany({
    where: { season, published: true },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      mode: true,
      format: true,
      categories: true,
      notes: true,
      venue: { select: { name: true, city: true } },
    },
  });
}

export type YouthGathering = Awaited<ReturnType<typeof getYouthGatherings>>[number];

/** Variante admin : tout, publié ou non. */
export async function listYouthGatheringsAdmin(season?: string) {
  return prisma.youthGathering.findMany({
    where: season ? { season } : undefined,
    orderBy: [{ season: 'desc' }, { date: 'asc' }],
    select: {
      id: true,
      season: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      venueId: true,
      mode: true,
      format: true,
      categories: true,
      notes: true,
      published: true,
      venue: { select: { name: true, city: true } },
    },
  });
}

export type YouthGatheringAdminRow = Awaited<ReturnType<typeof listYouthGatheringsAdmin>>[number];
