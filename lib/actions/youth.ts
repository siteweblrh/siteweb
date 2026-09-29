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

/* ─────────────────────────── Jeunes arbitres ─────────────────────────── */

/**
 * Erreurs ATTENDUES (saisie incomplète, doublon) : retournées, pas lancées —
 * en production React efface le message d'un `throw` dans une Server Action
 * (cf. feedback_server_action_expected_errors).
 */
export type YouthRefereeResult = { ok: true; created?: number } | { ok: false; message: string };

/**
 * « Clément, Ryan » → ['Clément', 'Ryan']. Accepte virgule, point-virgule,
 * barre et « et », comme on les écrit sur une feuille. Dédoublonné sans tenir
 * compte de la casse : saisir deux fois le même arbitre sur un match n'a pas
 * de sens.
 */
function splitRefereeNames(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of raw.split(/[,;/]|\s+et\s+/i)) {
    const name = part.trim().replace(/\s+/g, ' ');
    const key = name.toLocaleLowerCase('fr');
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

const RefereeDutySchema = z.object({
  // Rencontre de championnat arbitrée. Vide = rencontre hors classement.
  matchId: z.string().nullable().optional().or(z.literal('')),
  // Requis uniquement sans `matchId` (sinon dérivés du match).
  season: z.string().optional(),
  date: z.string().optional(),
  mode: z.enum(['GAZON', 'SALLE']).optional(),
  context: z.string().optional(),
  names: z.string(),
});

export type YouthRefereeDutyInput = z.infer<typeof RefereeDutySchema>;

export async function createYouthRefereeDuties(
  input: YouthRefereeDutyInput,
): Promise<YouthRefereeResult> {
  await requireAdmin();
  const data = RefereeDutySchema.parse(input);

  const names = splitRefereeNames(data.names);
  if (names.length === 0) return { ok: false, message: 'Indiquez au moins un arbitre.' };
  if (names.length > 4) {
    return { ok: false, message: 'Quatre arbitres au plus par rencontre.' };
  }

  const matchId = orNull(data.matchId);
  let base: { season: string; mode: 'GAZON' | 'SALLE'; date: Date; matchId: string | null; context: string | null };

  if (matchId) {
    // Saison, discipline et date viennent du MATCH, jamais du formulaire :
    // elles ne peuvent pas contredire la rencontre arbitrée.
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        kickoffAt: true,
        competition: { select: { season: true, mode: true } },
        youthReferees: { select: { refereeName: true } },
      },
    });
    if (!match) return { ok: false, message: 'Rencontre introuvable — rechargez la page.' };

    const already = new Set(
      match.youthReferees.map((r) => r.refereeName.trim().toLocaleLowerCase('fr')),
    );
    const duplicates = names.filter((n) => already.has(n.toLocaleLowerCase('fr')));
    if (duplicates.length > 0) {
      return {
        ok: false,
        message: `Déjà enregistré${duplicates.length > 1 ? 's' : ''} sur cette rencontre : ${duplicates.join(', ')}.`,
      };
    }
    base = {
      season: match.competition.season,
      mode: match.competition.mode,
      date: match.kickoffAt,
      matchId,
      context: null,
    };
  } else {
    const season = orNull(data.season);
    const context = orNull(data.context);
    if (!season || !data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !data.mode) {
      return { ok: false, message: 'Hors championnat : saison, date et discipline sont requises.' };
    }
    if (!context) {
      return {
        ok: false,
        message: 'Hors championnat : décrivez la rencontre (ex. « Match interne HHS »).',
      };
    }
    base = { season, mode: data.mode, date: reunionDay(data.date), matchId: null, context };
  }

  await prisma.youthRefereeDuty.createMany({
    data: names.map((refereeName) => ({ ...base, refereeName })),
  });
  await logAudit({
    action: 'create',
    entity: 'YouthRefereeDuty',
    entityId: base.matchId,
    metadata: { names, context: base.context },
  });
  revalidateYouth();
  return { ok: true, created: names.length };
}

/**
 * Corrige le nom (faute de frappe, « Kan » → « Kiyan ») ou le libellé d'une
 * rencontre hors classement. Changer la rencontre = supprimer puis ressaisir :
 * plus simple à comprendre qu'un arbitrage qui « déménage ».
 */
export async function updateYouthRefereeDuty(
  id: string,
  input: { refereeName: string; context?: string },
): Promise<YouthRefereeResult> {
  await requireAdmin();
  const refereeName = input.refereeName.trim().replace(/\s+/g, ' ');
  if (!refereeName) return { ok: false, message: 'Le nom est obligatoire.' };

  const current = await prisma.youthRefereeDuty.findUnique({
    where: { id },
    select: { matchId: true },
  });
  if (!current) return { ok: false, message: 'Arbitrage introuvable — rechargez la page.' };

  const context = orNull(input.context);
  if (!current.matchId && !context) {
    return { ok: false, message: 'Décrivez la rencontre hors classement.' };
  }

  await prisma.youthRefereeDuty.update({
    where: { id },
    // Le libellé n'a de sens que sans match : on ne l'écrit pas sinon.
    data: { refereeName, ...(current.matchId ? {} : { context }) },
  });
  await logAudit({ action: 'update', entity: 'YouthRefereeDuty', entityId: id });
  revalidateYouth();
  return { ok: true };
}

export async function deleteYouthRefereeDuty(id: string) {
  await requireAdmin();
  await prisma.youthRefereeDuty.delete({ where: { id } });
  await logAudit({ action: 'delete', entity: 'YouthRefereeDuty', entityId: id });
  revalidateYouth();
}
