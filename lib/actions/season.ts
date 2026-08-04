'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { revalidatePath } from 'next/cache';
import { CACHE_TAGS, revalidatePublic } from '@/lib/cache/public';
import { isValidSeason } from '@/lib/utils/season';

/**
 * Cycle de vie des saisons — cf. project_saison_entite_migration.
 *
 * ⚠️ Phase 1 de la migration : `Competition.season` (chaîne) et
 * `Competition.seasonId` (FK) coexistent, et la chaîne fait encore foi côté
 * lectures. Toute action qui touche au libellé d'une saison doit donc
 * propager le changement AUX DEUX. C'est le piège principal de ce montage.
 */

function revalidateSeasons() {
  // Les saisons pilotent le libellé du header et les écrans de compétition.
  // `revalidatePath` ne vide que le cache de PAGES : `revalidatePublic` est
  // indispensable pour le cache de DONNÉES (cf. lib/cache/public.ts).
  revalidatePublic(CACHE_TAGS.competitions);
  revalidatePath('/dashboard/ligue/saisons');
  revalidatePath('/dashboard/competitions');
  revalidatePath('/', 'layout');
}

const SeasonSchema = z.object({
  label: z
    .string()
    .trim()
    .refine(isValidSeason, 'Format attendu : AAAA-AAAA avec deux années consécutives (ex. 2026-2027)'),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export type SeasonInput = z.infer<typeof SeasonSchema>;

/** Bornes proposées par défaut pour un libellé donné (septembre → juin). */
function defaultBounds(label: string) {
  const [a, b] = label.split('-').map(Number);
  return {
    startsAt: new Date(Date.UTC(a, 8, 1)),
    endsAt: new Date(Date.UTC(b, 5, 30, 23, 59, 59)),
  };
}

export async function listSeasons() {
  return prisma.season.findMany({
    orderBy: { startsAt: 'desc' },
    select: {
      id: true,
      label: true,
      status: true,
      startsAt: true,
      endsAt: true,
      _count: { select: { competitions: true, draftCalendars: true, engagements: true } },
    },
  });
}

export type SeasonRow = Awaited<ReturnType<typeof listSeasons>>[number];

export async function createSeason(input: { label: string }) {
  await requireAdmin();
  const label = input.label?.trim() ?? '';
  const parsed = SeasonSchema.parse({ label, ...defaultBounds(label) });

  const existing = await prisma.season.findUnique({ where: { label: parsed.label } });
  if (existing) throw new Error('Cette saison existe déjà.');

  // Toujours créée en PREPARATION : ouvrir une saison est un geste distinct,
  // qui bascule tout le site public. Le faire à la création serait un effet de
  // bord invisible.
  const created = await prisma.season.create({ data: { ...parsed, status: 'PREPARATION' } });
  revalidateSeasons();
  return created;
}

export async function updateSeasonDates(id: string, input: { startsAt: string; endsAt: string }) {
  await requireAdmin();
  const { startsAt, endsAt } = SeasonSchema.pick({ startsAt: true, endsAt: true }).parse(input);
  if (endsAt <= startsAt) throw new Error('La date de fin doit suivre la date de début.');
  const updated = await prisma.season.update({ where: { id }, data: { startsAt, endsAt } });
  revalidateSeasons();
  return updated;
}

/**
 * Ouvre une saison : elle devient la saison affichée par défaut sur tout le
 * site public.
 *
 * **Une seule saison peut être EN_COURS.** La précédente bascule en TERMINEE
 * dans la MÊME transaction — sinon un échec au milieu laisserait soit zéro
 * saison courante (le site ne saurait plus quoi afficher), soit deux (le
 * premier `findFirst` déciderait au hasard).
 */
export async function openSeason(id: string) {
  await requireAdmin();
  const target = await prisma.season.findUnique({ where: { id }, select: { id: true, label: true } });
  if (!target) throw new Error('Saison introuvable.');

  const previous = await prisma.$transaction(async (tx) => {
    const current = await tx.season.findFirst({
      where: { status: 'EN_COURS', id: { not: id } },
      select: { id: true, label: true },
    });
    if (current) {
      await tx.season.update({ where: { id: current.id }, data: { status: 'TERMINEE' } });
    }
    await tx.season.update({ where: { id }, data: { status: 'EN_COURS' } });
    return current;
  });

  revalidateSeasons();
  return { opened: target.label, closed: previous?.label ?? null };
}

/** Clôt la saison en cours sans en ouvrir d'autre. */
export async function closeSeason(id: string) {
  await requireAdmin();
  const season = await prisma.season.findUnique({ where: { id }, select: { status: true } });
  if (!season) throw new Error('Saison introuvable.');
  if (season.status !== 'EN_COURS') throw new Error('Seule une saison en cours peut être clôturée.');
  const updated = await prisma.season.update({ where: { id }, data: { status: 'TERMINEE' } });
  revalidateSeasons();
  return updated;
}

export async function deleteSeason(id: string) {
  await requireAdmin();
  const season = await prisma.season.findUnique({
    where: { id },
    select: {
      status: true,
      label: true,
      _count: { select: { competitions: true, draftCalendars: true, engagements: true } },
    },
  });
  if (!season) throw new Error('Saison introuvable.');

  // Refus côté SERVEUR, pas seulement bouton grisé : une action serveur est une
  // route HTTP appelable directement.
  const attached =
    season._count.competitions + season._count.draftCalendars + season._count.engagements;
  if (attached > 0) {
    throw new Error(
      `Impossible : ${attached} élément(s) sont rattachés à ${season.label}. ` +
        'Détachez-les ou supprimez-les d’abord.',
    );
  }
  if (season.status === 'EN_COURS') {
    throw new Error('Impossible de supprimer la saison en cours. Ouvrez-en une autre d’abord.');
  }

  await prisma.season.delete({ where: { id } });
  revalidateSeasons();
}
