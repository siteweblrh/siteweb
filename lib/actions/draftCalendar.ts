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
// Palette for auto-assigning colors to competitions
// ---------------------------------------------------------------------------

const COMP_PALETTE = [
  '#002244', '#1B7340', '#A8202F', '#2563EB', '#F3BC1C',
  '#7C3AED', '#0891B2', '#DC2626', '#059669', '#D97706',
];

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CreateDraftCalendarSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  season: z.string().min(1, 'Saison requise'),
  dayOfWeek: z.enum(['SATURDAY', 'SUNDAY']),
  recurrence: z.number().int().min(1).max(4),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  notes: z.string().optional(),
});

const UpdateDraftCalendarSchema = z.object({
  name: z.string().min(1).optional(),
  season: z.string().min(1).optional(),
  dayOfWeek: z.enum(['SATURDAY', 'SUNDAY']).optional(),
  recurrence: z.number().int().min(1).max(4).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
});

const AddCompetitionSchema = z.object({
  competitionId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  slotsPerDay: z.number().int().min(1).max(10).default(1),
  color: z.string().optional(),
});

const UpdateCompetitionPeriodSchema = z.object({
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  slotsPerDay: z.number().int().min(1).max(10).optional(),
  color: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Slot generation from DraftCalendarCompetition periods
// ---------------------------------------------------------------------------

type CompPeriod = {
  competitionId: string;
  startDate: Date;
  endDate: Date;
  slotsPerDay: number;
};

function generateSlotsFromPeriods(
  calStartDate: Date,
  calEndDate: Date,
  dayOfWeek: 'SATURDAY' | 'SUNDAY',
  recurrenceWeeks: number,
  compPeriods: CompPeriod[],
): { date: Date; matchday: number; slotIndex: number; competitionId: string | null }[] {
  const targetDay = dayOfWeek === 'SATURDAY' ? 6 : 0;
  const slots: { date: Date; matchday: number; slotIndex: number; competitionId: string | null }[] = [];

  const cursor = new Date(calStartDate);
  const currentDay = cursor.getUTCDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  cursor.setUTCDate(cursor.getUTCDate() + daysUntilTarget);

  let matchday = 1;
  while (cursor <= calEndDate) {
    const dateMs = cursor.getTime();

    const activeComps = compPeriods.filter(
      (cp) => dateMs >= cp.startDate.getTime() && dateMs <= cp.endDate.getTime(),
    );

    if (activeComps.length > 0) {
      let slotIdx = 1;
      for (const comp of activeComps) {
        for (let s = 0; s < comp.slotsPerDay; s++) {
          slots.push({
            date: new Date(cursor),
            matchday,
            slotIndex: slotIdx++,
            competitionId: comp.competitionId,
          });
        }
      }
    } else {
      slots.push({
        date: new Date(cursor),
        matchday,
        slotIndex: 1,
        competitionId: null,
      });
    }

    matchday++;
    cursor.setUTCDate(cursor.getUTCDate() + 7 * recurrenceWeeks);
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Includes shared across queries
// ---------------------------------------------------------------------------

const SLOT_INCLUDE = {
  competition: { select: { id: true, name: true, mode: true, category: true, season: true, format: true } },
  venueRef: { select: { id: true, name: true, city: true } },
};

function calendarInclude() {
  return {
    slots: {
      include: SLOT_INCLUDE,
      orderBy: [{ matchday: 'asc' as const }, { slotIndex: 'asc' as const }],
    },
    competitions: {
      include: {
        competition: { select: { id: true, name: true, mode: true, category: true, season: true, format: true } },
      },
      orderBy: { createdAt: 'asc' as const },
    },
  };
}

// ---------------------------------------------------------------------------
// Calendar CRUD
// ---------------------------------------------------------------------------

export async function createDraftCalendar(input: z.infer<typeof CreateDraftCalendarSchema>) {
  await requireAdmin();
  const data = CreateDraftCalendarSchema.parse(input);

  const startDate = parseReunionDatetimeLocal(`${data.startDate}T08:00`);
  const endDate = parseReunionDatetimeLocal(`${data.endDate}T23:59`);
  if (endDate <= startDate) throw new Error('La date de fin doit être après la date de début');

  const slots = generateSlotsFromPeriods(startDate, endDate, data.dayOfWeek, data.recurrence, []);

  if (slots.length === 0) throw new Error('Aucun créneau généré — vérifiez les dates et le jour choisi');

  const cal = await prisma.draftCalendar.create({
    data: {
      name: data.name,
      season: data.season,
      dayOfWeek: data.dayOfWeek,
      recurrence: data.recurrence,
      slotsPerDay: 1,
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
    include: calendarInclude(),
  });

  revalidateDraft();
  return cal;
}

export async function updateDraftCalendar(id: string, input: z.infer<typeof UpdateDraftCalendarSchema>) {
  await requireAdmin();
  const data = UpdateDraftCalendarSchema.parse(input);

  const updateData: Record<string, unknown> = {};
  if (data.name != null) updateData.name = data.name;
  if (data.season != null) updateData.season = data.season;
  if (data.dayOfWeek != null) updateData.dayOfWeek = data.dayOfWeek;
  if (data.recurrence != null) updateData.recurrence = data.recurrence;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.startDate != null) updateData.startDate = parseReunionDatetimeLocal(`${data.startDate}T08:00`);
  if (data.endDate != null) updateData.endDate = parseReunionDatetimeLocal(`${data.endDate}T23:59`);

  const cal = await prisma.draftCalendar.update({
    where: { id },
    data: updateData,
  });
  revalidateDraft();
  return cal;
}

export async function deleteDraftCalendar(id: string) {
  await requireAdmin();
  await prisma.draftCalendar.delete({ where: { id } });
  revalidateDraft();
}

// ---------------------------------------------------------------------------
// Competition period management
// ---------------------------------------------------------------------------

export async function addCompetitionToCalendar(
  calendarId: string,
  input: z.infer<typeof AddCompetitionSchema>,
) {
  await requireAdmin();
  const data = AddCompetitionSchema.parse(input);

  const startDate = parseReunionDatetimeLocal(`${data.startDate}T08:00`);
  const endDate = parseReunionDatetimeLocal(`${data.endDate}T23:59`);
  if (endDate <= startDate) throw new Error('La date de fin doit être après la date de début');

  const existingCount = await prisma.draftCalendarCompetition.count({
    where: { draftCalendarId: calendarId },
  });
  const autoColor = data.color ?? COMP_PALETTE[existingCount % COMP_PALETTE.length];

  const dcc = await prisma.draftCalendarCompetition.create({
    data: {
      draftCalendarId: calendarId,
      competitionId: data.competitionId,
      startDate,
      endDate,
      slotsPerDay: data.slotsPerDay,
      color: autoColor,
    },
    include: {
      competition: { select: { id: true, name: true, mode: true, category: true } },
    },
  });

  revalidateDraft();
  return dcc;
}

export async function removeCompetitionFromCalendar(dccId: string) {
  await requireAdmin();
  await prisma.draftCalendarCompetition.delete({ where: { id: dccId } });
  revalidateDraft();
}

export async function updateCompetitionPeriod(
  dccId: string,
  input: z.infer<typeof UpdateCompetitionPeriodSchema>,
) {
  await requireAdmin();
  const data = UpdateCompetitionPeriodSchema.parse(input);

  const updateData: Record<string, unknown> = {};
  if (data.startDate != null) updateData.startDate = parseReunionDatetimeLocal(`${data.startDate}T08:00`);
  if (data.endDate != null) updateData.endDate = parseReunionDatetimeLocal(`${data.endDate}T23:59`);
  if (data.slotsPerDay != null) updateData.slotsPerDay = data.slotsPerDay;
  if (data.color != null) updateData.color = data.color;

  const dcc = await prisma.draftCalendarCompetition.update({
    where: { id: dccId },
    data: updateData,
  });
  revalidateDraft();
  return dcc;
}

// ---------------------------------------------------------------------------
// Regenerate slots from competition periods
// ---------------------------------------------------------------------------

export async function regenerateSlots(calendarId: string) {
  await requireAdmin();

  const cal = await prisma.draftCalendar.findUniqueOrThrow({
    where: { id: calendarId },
    include: { competitions: true },
  });

  const compPeriods: CompPeriod[] = cal.competitions.map((dcc) => ({
    competitionId: dcc.competitionId,
    startDate: dcc.startDate,
    endDate: dcc.endDate,
    slotsPerDay: dcc.slotsPerDay,
  }));

  const newSlots = generateSlotsFromPeriods(
    cal.startDate,
    cal.endDate,
    cal.dayOfWeek as 'SATURDAY' | 'SUNDAY',
    cal.recurrence,
    compPeriods,
  );

  await prisma.$transaction([
    prisma.draftSlot.deleteMany({ where: { draftCalendarId: calendarId } }),
    prisma.draftSlot.createMany({
      data: newSlots.map((s) => ({
        draftCalendarId: calendarId,
        date: s.date,
        matchday: s.matchday,
        slotIndex: s.slotIndex,
        competitionId: s.competitionId,
      })),
    }),
  ]);

  revalidateDraft();
}

// ---------------------------------------------------------------------------
// Slot management (manual adjustments)
// ---------------------------------------------------------------------------

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

export async function updateDraftSlotVenue(
  slotId: string,
  venueId: string | null,
  venueText: string | null,
) {
  await requireAdmin();
  const slot = await prisma.draftSlot.update({
    where: { id: slotId },
    data: { venueId, venueText },
    include: { venueRef: { select: { id: true, name: true, city: true } } },
  });
  revalidateDraft();
  return slot;
}

export async function updateDraftSlotLabel(slotId: string, label: string | null) {
  await requireAdmin();
  const slot = await prisma.draftSlot.update({
    where: { id: slotId },
    data: { label },
  });
  revalidateDraft();
  return slot;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listDraftCalendars() {
  return prisma.draftCalendar.findMany({
    include: calendarInclude(),
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDraftCalendar(id: string) {
  return prisma.draftCalendar.findUnique({
    where: { id },
    include: calendarInclude(),
  });
}

export async function listDraftCalendarsForSeason(season: string) {
  return prisma.draftCalendar.findMany({
    where: { season },
    include: calendarInclude(),
    orderBy: { startDate: 'asc' },
  });
}
