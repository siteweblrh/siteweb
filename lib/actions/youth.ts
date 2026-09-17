'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/auth/require-admin';
import { revalidatePath } from 'next/cache';
import { CACHE_TAGS, revalidatePublic } from '@/lib/cache/public';
import { logAudit } from '@/lib/audit';
import { parseReunionDateAndTime } from '@/lib/utils/datetime-reunion';

/**
 * Le jour est stocké à minuit HEURE RÉUNION, pas minuit UTC. Sans ça, une date
 * saisie « 26/09/2026 » ressort « 25/09 » à l'affichage : La Réunion est en
 * UTC+4, donc minuit UTC y est déjà 4 h du matin la veille au soir côté
 * serveur. `parseReunionDateAndTime` est la source unique du projet là-dessus.
 */
function reunionDay(dateISO: string): Date {
  return parseReunionDateAndTime(dateISO, '00:00');
}

const TIME = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horaire attendu au format HH:mm')
  .nullable()
  .optional()
  .or(z.literal(''));

const GatheringSchema = z.object({
  season: z.string().min(4, 'Saison requise'),
  // Champ `<input type="date">` : "2026-09-26".
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ'),
  startTime: TIME,
  endTime: TIME,
  venueId: z.string().nullable().optional().or(z.literal('')),
  location: z.string().nullable().optional().or(z.literal('')),
  mode: z.enum(['GAZON', 'SALLE']).default('GAZON'),
  format: z.string().nullable().optional().or(z.literal('')),
  categories: z.string().nullable().optional().or(z.literal('')),
  notes: z.string().nullable().optional().or(z.literal('')),
  published: z.boolean().default(false),
});

export type YouthGatheringInput = z.infer<typeof GatheringSchema>;

/** Chaîne vide d'un formulaire = champ non renseigné, donc `null` en base. */
function orNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function revalidateYouth() {
  revalidatePublic(CACHE_TAGS.youth);
  revalidatePath('/jeunes');
  revalidatePath('/dashboard/ligue/jeunes');
}

export async function createYouthGathering(input: YouthGatheringInput) {
  await requireAdmin();
  const data = GatheringSchema.parse(input);

  const created = await prisma.youthGathering.create({
    data: {
      season: data.season.trim(),
      date: reunionDay(data.date),
      startTime: orNull(data.startTime),
      endTime: orNull(data.endTime),
      venueId: orNull(data.venueId),
      location: orNull(data.location),
      mode: data.mode,
      format: orNull(data.format),
      categories: orNull(data.categories),
      notes: orNull(data.notes),
      published: data.published,
    },
  });

  await logAudit({ action: 'create', entity: 'YouthGathering', entityId: created.id });
  revalidateYouth();
  return created;
}

export async function updateYouthGathering(id: string, input: Partial<YouthGatheringInput>) {
  await requireAdmin();
  const data = GatheringSchema.partial().parse(input);

  const payload: Prisma.YouthGatheringUncheckedUpdateInput = {};
  if (data.season !== undefined) payload.season = data.season.trim();
  if (data.date !== undefined) payload.date = reunionDay(data.date);
  if (data.startTime !== undefined) payload.startTime = orNull(data.startTime);
  if (data.endTime !== undefined) payload.endTime = orNull(data.endTime);
  if (data.venueId !== undefined) payload.venueId = orNull(data.venueId);
  if (data.location !== undefined) payload.location = orNull(data.location);
  if (data.mode !== undefined) payload.mode = data.mode;
  if (data.format !== undefined) payload.format = orNull(data.format);
  if (data.categories !== undefined) payload.categories = orNull(data.categories);
  if (data.notes !== undefined) payload.notes = orNull(data.notes);
  if (data.published !== undefined) payload.published = data.published;

  const updated = await prisma.youthGathering.update({ where: { id }, data: payload });

  await logAudit({ action: 'update', entity: 'YouthGathering', entityId: id });
  revalidateYouth();
  return updated;
}

export async function deleteYouthGathering(id: string) {
  await requireAdmin();
  await prisma.youthGathering.delete({ where: { id } });
  await logAudit({ action: 'delete', entity: 'YouthGathering', entityId: id });
  revalidateYouth();
}

export async function setYouthGatheringPublished(id: string, published: boolean) {
  await requireAdmin();
  await prisma.youthGathering.update({ where: { id }, data: { published } });
  await logAudit({
    action: published ? 'publish' : 'unpublish',
    entity: 'YouthGathering',
    entityId: id,
  });
  revalidateYouth();
}
