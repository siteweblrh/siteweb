'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { parseReunionDatetimeLocal } from '@/lib/utils/datetime-reunion';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autorisé');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') throw new Error('Réservé aux administrateurs');
  return session;
}

function revalidateDraft() {
  revalidatePath('/dashboard/matches/provisoire');
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CreateDraftCalendarSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  season: z.string().min(1, 'Saison requise'),
  dayOfWeek: z.enum(['SATURDAY', 'SUNDAY']),
  recurrence: z.number().int().min(1).max(4),
  slotsPerDay: z.number().int().min(1).max(20),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  competitionIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const UpdateDraftCalendarSchema = z.object({
  name: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlots(
  startDate: Date,
  endDate: Date,
  dayOfWeek: 'SATURDAY' | 'SUNDAY',
  recurrenceWeeks: number,
  slotsPerDay: number,
  competitionIds: string[],
): { date: Date; matchday: number; slotIndex: number; competitionId: string | null }[] {
  const targetDay = dayOfWeek === 'SATURDAY' ? 6 : 0;
  const slots: { date: Date; matchday: number; slotIndex: number; competitionId: string | null }[] = [];

  // Find first target day >= startDate
  const cursor = new Date(startDate);
  const currentDay = cursor.getUTCDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  cursor.setUTCDate(cursor.getUTCDate() + daysUntilTarget);

  let matchday = 1;
  while (cursor <= endDate) {
    for (let i = 0; i < slotsPerDay; i++) {
      const compId = competitionIds.length > 0
        ? competitionIds[i % competitionIds.length]
        : null;
      slots.push({
        date: new Date(cursor),
        matchday,
        slotIndex: i + 1,
        competitionId: compId,
      });
    }
    matchday++;
    cursor.setUTCDate(cursor.getUTCDate() + 7 * recurrenceWeeks);
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createDraftCalendar(input: z.infer<typeof CreateDraftCalendarSchema>) {
  await requireAdmin();
  const data = CreateDraftCalendarSchema.parse(input);

  const startDate = parseReunionDatetimeLocal(`${data.startDate}T08:00`);
  const endDate = parseReunionDatetimeLocal(`${data.endDate}T23:59`);
  if (endDate <= startDate) throw new Error('La date de fin doit être après la date de début');

  const slots = generateSlots(
    startDate,
    endDate,
    data.dayOfWeek,
    data.recurrence,
    data.slotsPerDay,
    data.competitionIds,
  );

  if (slots.length === 0) throw new Error('Aucun créneau généré — vérifiez les dates et le jour choisi');

  const cal = await prisma.draftCalendar.create({
    data: {
      name: data.name,
      season: data.season,
      dayOfWeek: data.dayOfWeek,
      recurrence: data.recurrence,
      slotsPerDay: data.slotsPerDay,
      startDate,
      endDate,
      notes: data.notes ?? null,
      slots: {
        createMany: {
          data: slots.map((s) => ({
            date: s.date,
            matchday: s.matchday,
            slotIndex: s.slotIndex,
            competitionId: s.competitionId,
          })),
        },
      },
    },
    include: { slots: { include: { competition: true }, orderBy: [{ matchday: 'asc' }, { slotIndex: 'asc' }] } },
  });

  revalidateDraft();
  return cal;
}

export async function updateDraftCalendar(id: string, input: z.infer<typeof UpdateDraftCalendarSchema>) {
  await requireAdmin();
  const data = UpdateDraftCalendarSchema.parse(input);
  const cal = await prisma.draftCalendar.update({
    where: { id },
    data: {
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });
  revalidateDraft();
  return cal;
}

export async function deleteDraftCalendar(id: string) {
  await requireAdmin();
  await prisma.draftCalendar.delete({ where: { id } });
  revalidateDraft();
}

export async function addDraftSlot(calendarId: string, input: {
  date: string;
  matchday: number;
  slotIndex: number;
  competitionId?: string | null;
  label?: string | null;
}) {
  await requireAdmin();
  const date = parseReunionDatetimeLocal(`${input.date}T08:00`);
  const slot = await prisma.draftSlot.create({
    data: {
      draftCalendarId: calendarId,
      date,
      matchday: input.matchday,
      slotIndex: input.slotIndex,
      competitionId: input.competitionId ?? null,
      label: input.label ?? null,
    },
    include: { competition: true },
  });
  revalidateDraft();
  return slot;
}

export async function removeDraftSlot(slotId: string) {
  await requireAdmin();
  await prisma.draftSlot.delete({ where: { id: slotId } });
  revalidateDraft();
}

export async function removeDraftMatchday(calendarId: string, matchday: number) {
  await requireAdmin();
  await prisma.draftSlot.deleteMany({
    where: { draftCalendarId: calendarId, matchday },
  });
  revalidateDraft();
}

export async function assignCompetitionToSlot(slotId: string, competitionId: string | null) {
  await requireAdmin();
  const slot = await prisma.draftSlot.update({
    where: { id: slotId },
    data: { competitionId },
    include: { competition: true },
  });
  revalidateDraft();
  return slot;
}

export async function listDraftCalendars() {
  return prisma.draftCalendar.findMany({
    include: {
      slots: {
        include: { competition: { select: { id: true, name: true, mode: true, category: true, season: true } } },
        orderBy: [{ matchday: 'asc' }, { slotIndex: 'asc' }],
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDraftCalendar(id: string) {
  return prisma.draftCalendar.findUnique({
    where: { id },
    include: {
      slots: {
        include: { competition: { select: { id: true, name: true, mode: true, category: true, season: true } } },
        orderBy: [{ matchday: 'asc' }, { slotIndex: 'asc' }],
      },
    },
  });
}
