import { prisma } from '@/lib/prisma';
import { YOUTH_CATEGORY_FILTER } from '@/lib/queries/competition';

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

/**
 * Classement des jeunes arbitres d'une saison, par discipline : nombre de
 * rencontres arbitrées par nom, du plus actif au moins actif.
 *
 * Coût (règle n°2) — Portée : une section de /jeunes. Fréquence : lecture
 * cachée (`cachePublic`, tag `youth`) ; UNE requête pour les deux disciplines,
 * ajoutée au `Promise.all` existant de la page, donc dans la même fenêtre
 * d'éveil Neon. Défaillance : l'erreur remonte, comme `getYouthGatherings` —
 * un classement vide passerait pour « personne n'a arbitré ».
 *
 * Regroupement sur le nom tel que saisi (cf. le commentaire du modèle
 * `YouthRefereeDuty`), après normalisation de la casse et des espaces pour
 * qu'une faute de frappe de saisie ne scinde pas un arbitre en deux lignes.
 */
export async function getYouthRefereeRanking(season: string) {
  const duties = await prisma.youthRefereeDuty.findMany({
    where: { season },
    select: { refereeName: true, mode: true },
  });

  const byMode: Record<'GAZON' | 'SALLE', Map<string, YouthRefereeRow>> = {
    GAZON: new Map(),
    SALLE: new Map(),
  };
  for (const d of duties) {
    const name = d.refereeName.trim().replace(/\s+/g, ' ');
    const key = name.toLocaleLowerCase('fr');
    const row = byMode[d.mode].get(key);
    if (row) row.matches += 1;
    else byMode[d.mode].set(key, { name, matches: 1 });
  }

  const sorted = (rows: Map<string, YouthRefereeRow>) =>
    [...rows.values()].sort(
      (a, b) => b.matches - a.matches || a.name.localeCompare(b.name, 'fr'),
    );
  return { GAZON: sorted(byMode.GAZON), SALLE: sorted(byMode.SALLE) };
}

export type YouthRefereeRow = { name: string; matches: number };

/**
 * Admin : tous les arbitrages jeunes saisis, du plus récent au plus ancien,
 * avec la rencontre pour les afficher lisiblement. Écran d'admin seulement —
 * aucun coût sur le site public.
 */
export async function listYouthRefereeDutiesAdmin() {
  return prisma.youthRefereeDuty.findMany({
    orderBy: [{ date: 'desc' }, { refereeName: 'asc' }],
    select: {
      id: true,
      season: true,
      mode: true,
      date: true,
      refereeName: true,
      context: true,
      matchId: true,
      match: { select: YOUTH_MATCH_SELECT },
    },
  });
}

export type YouthRefereeDutyAdminRow = Awaited<
  ReturnType<typeof listYouthRefereeDutiesAdmin>
>[number];

/**
 * Admin : rencontres de compétitions jeunes, candidates au sélecteur « match
 * arbitré ». Filtre en base (`YOUTH_CATEGORY_FILTER`), pas après coup : la
 * table Match contient toute la saison sénior.
 */
export async function listYouthMatchesForRefereeing() {
  return prisma.match.findMany({
    where: { competition: YOUTH_CATEGORY_FILTER },
    orderBy: { kickoffAt: 'desc' },
    select: YOUTH_MATCH_SELECT,
  });
}

export type YouthRefereeMatchOption = Awaited<
  ReturnType<typeof listYouthMatchesForRefereeing>
>[number];

const YOUTH_MATCH_SELECT = {
  id: true,
  kickoffAt: true,
  homeScore: true,
  awayScore: true,
  homeLabel: true,
  awayLabel: true,
  homeClub: { select: { name: true, shortCode: true } },
  awayClub: { select: { name: true, shortCode: true } },
  competition: { select: { season: true, mode: true, category: true } },
} as const;
