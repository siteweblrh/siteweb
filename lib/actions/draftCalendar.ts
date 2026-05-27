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
  dayOfWeek: z.enum(['SATURDAY', 'SUNDAY']).optional(),
  recurrence: z.number().int().min(1).max(4).optional(),
});

const UpdateCompetitionPeriodSchema = z.object({
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  slotsPerDay: z.number().int().min(1).max(10).optional(),
  color: z.string().optional(),
  dayOfWeek: z.enum(['SATURDAY', 'SUNDAY']).nullable().optional(),
  recurrence: z.number().int().min(1).max(4).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Slot generation — per-competition day/recurrence
// ---------------------------------------------------------------------------

type CompPeriod = {
  competitionId: string;
  startDate: Date;
  endDate: Date;
  slotsPerDay: number;
  dayOfWeek: 'SATURDAY' | 'SUNDAY';
  recurrenceWeeks: number;
};

type SlotEntry = { date: Date; matchday: number; slotIndex: number; competitionId: string | null };

function generateSlotsFromPeriods(
  calStartDate: Date,
  calEndDate: Date,
  calDayOfWeek: 'SATURDAY' | 'SUNDAY',
  calRecurrenceWeeks: number,
  compPeriods: CompPeriod[],
): SlotEntry[] {
  if (compPeriods.length === 0) {
    return generateEmptyCalendarSlots(calStartDate, calEndDate, calDayOfWeek, calRecurrenceWeeks);
  }

  const dateMap = new Map<string, { date: Date; comps: { competitionId: string; slotsPerDay: number }[] }>();

  for (const cp of compPeriods) {
    const targetDay = cp.dayOfWeek === 'SATURDAY' ? 6 : 0;
    const cursor = new Date(cp.startDate);
    const currentDay = cursor.getUTCDay();
    const daysUntil = (targetDay - currentDay + 7) % 7;
    cursor.setUTCDate(cursor.getUTCDate() + daysUntil);

    while (cursor <= cp.endDate && cursor <= calEndDate) {
      if (cursor >= calStartDate) {
        const key = cursor.toISOString().slice(0, 10);
        if (!dateMap.has(key)) {
          dateMap.set(key, { date: new Date(cursor), comps: [] });
        }
        dateMap.get(key)!.comps.push({
          competitionId: cp.competitionId,
          slotsPerDay: cp.slotsPerDay,
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 7 * cp.recurrenceWeeks);
    }
  }

  const sorted = Array.from(dateMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const slots: SlotEntry[] = [];
  let matchday = 1;
  for (const entry of sorted) {
    let slotIdx = 1;
    for (const comp of entry.comps) {
      for (let s = 0; s < comp.slotsPerDay; s++) {
        slots.push({ date: new Date(entry.date), matchday, slotIndex: slotIdx++, competitionId: comp.competitionId });
      }
    }
    matchday++;
  }
  return slots;
}

function generateEmptyCalendarSlots(
  calStartDate: Date,
  calEndDate: Date,
  dayOfWeek: 'SATURDAY' | 'SUNDAY',
  recurrenceWeeks: number,
): SlotEntry[] {
  const targetDay = dayOfWeek === 'SATURDAY' ? 6 : 0;
  const slots: SlotEntry[] = [];
  const cursor = new Date(calStartDate);
  const currentDay = cursor.getUTCDay();
  const daysUntil = (targetDay - currentDay + 7) % 7;
  cursor.setUTCDate(cursor.getUTCDate() + daysUntil);

  let matchday = 1;
  while (cursor <= calEndDate) {
    slots.push({ date: new Date(cursor), matchday, slotIndex: 1, competitionId: null });
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
      dayOfWeek: data.dayOfWeek ?? null,
      recurrence: data.recurrence ?? null,
    },
    include: {
      competition: { select: { id: true, name: true, mode: true, category: true } },
    },
  });

  await regenerateSlotsInternal(calendarId);
  revalidateDraft();
  return dcc;
}

export async function removeCompetitionFromCalendar(dccId: string) {
  await requireAdmin();
  const dcc = await prisma.draftCalendarCompetition.delete({
    where: { id: dccId },
    select: { draftCalendarId: true },
  });
  await regenerateSlotsInternal(dcc.draftCalendarId);
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
  if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
  if (data.recurrence !== undefined) updateData.recurrence = data.recurrence;

  const dcc = await prisma.draftCalendarCompetition.update({
    where: { id: dccId },
    data: updateData,
  });
  await regenerateSlotsInternal(dcc.draftCalendarId);
  revalidateDraft();
  return dcc;
}

// ---------------------------------------------------------------------------
// Regenerate slots from competition periods
// ---------------------------------------------------------------------------

async function regenerateSlotsInternal(calendarId: string) {
  const cal = await prisma.draftCalendar.findUniqueOrThrow({
    where: { id: calendarId },
    include: { competitions: true },
  });

  const manualSlots = await prisma.draftSlot.findMany({
    where: { draftCalendarId: calendarId, isManual: true },
    select: { id: true, date: true, matchday: true, slotIndex: true, competitionId: true },
  });

  const compPeriods: CompPeriod[] = cal.competitions.map((dcc) => ({
    competitionId: dcc.competitionId,
    startDate: dcc.startDate,
    endDate: dcc.endDate,
    slotsPerDay: dcc.slotsPerDay,
    dayOfWeek: (dcc.dayOfWeek ?? cal.dayOfWeek) as 'SATURDAY' | 'SUNDAY',
    recurrenceWeeks: dcc.recurrence ?? cal.recurrence,
  }));

  const autoSlots = generateSlotsFromPeriods(
    cal.startDate, cal.endDate,
    cal.dayOfWeek as 'SATURDAY' | 'SUNDAY',
    cal.recurrence, compPeriods,
  );

  const excludedSet = new Set(
    (cal.excludedDates ?? []).map((d) => d.toISOString().slice(0, 10)),
  );

  type Merged = SlotEntry & { isManual: boolean; id?: string };

  const merged: Merged[] = [
    ...autoSlots
      .filter((s) => !excludedSet.has(s.date.toISOString().slice(0, 10)))
      .map((s) => ({ ...s, isManual: false })),
    ...manualSlots.map((s) => ({
      date: s.date,
      matchday: s.matchday,
      slotIndex: s.slotIndex,
      competitionId: s.competitionId,
      isManual: true,
      id: s.id,
    })),
  ];

  merged.sort((a, b) => {
    const dc = a.date.getTime() - b.date.getTime();
    if (dc !== 0) return dc;
    if (a.isManual !== b.isManual) return a.isManual ? 1 : -1;
    return a.slotIndex - b.slotIndex;
  });

  let md = 0;
  let lastKey = '';
  let si = 0;
  for (const slot of merged) {
    const dk = slot.date.toISOString().slice(0, 10);
    if (dk !== lastKey) { md++; lastKey = dk; si = 0; }
    si++;
    slot.matchday = md;
    slot.slotIndex = si;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [
    prisma.draftSlot.deleteMany({ where: { draftCalendarId: calendarId, isManual: false } }),
  ];

  const autoToCreate = merged.filter((s) => !s.isManual);
  if (autoToCreate.length > 0) {
    ops.push(prisma.draftSlot.createMany({
      data: autoToCreate.map((s) => ({
        draftCalendarId: calendarId,
        date: s.date,
        matchday: s.matchday,
        slotIndex: s.slotIndex,
        competitionId: s.competitionId,
        isManual: false,
      })),
    }));
  }

  for (const s of merged.filter((s) => s.isManual && s.id)) {
    ops.push(prisma.draftSlot.update({
      where: { id: s.id },
      data: { matchday: s.matchday, slotIndex: s.slotIndex },
    }));
  }

  await prisma.$transaction(ops);
}

export async function regenerateSlots(calendarId: string) {
  await requireAdmin();
  await regenerateSlotsInternal(calendarId);
  revalidateDraft();
}

// ---------------------------------------------------------------------------
// Date overrides (exclude / restore / add / remove manual)
// ---------------------------------------------------------------------------

export async function excludeDate(calendarId: string, dateISO: string) {
  await requireAdmin();
  const cal = await prisma.draftCalendar.findUniqueOrThrow({
    where: { id: calendarId },
    select: { excludedDates: true },
  });
  const alreadyExcluded = cal.excludedDates.some(
    (d) => d.toISOString().slice(0, 10) === dateISO,
  );
  if (!alreadyExcluded) {
    const date = new Date(dateISO + 'T12:00:00Z');
    await prisma.draftCalendar.update({
      where: { id: calendarId },
      data: { excludedDates: { push: date } },
    });
  }
  await regenerateSlotsInternal(calendarId);
  revalidateDraft();
}

export async function restoreDate(calendarId: string, dateISO: string) {
  await requireAdmin();
  const cal = await prisma.draftCalendar.findUniqueOrThrow({
    where: { id: calendarId },
    select: { excludedDates: true },
  });
  await prisma.draftCalendar.update({
    where: { id: calendarId },
    data: {
      excludedDates: cal.excludedDates.filter(
        (d) => d.toISOString().slice(0, 10) !== dateISO,
      ),
    },
  });
  await regenerateSlotsInternal(calendarId);
  revalidateDraft();
}

export async function addManualDate(
  calendarId: string,
  dateISO: string,
  competitionId: string,
  slotsPerDay: number = 1,
) {
  await requireAdmin();
  const date = parseReunionDatetimeLocal(`${dateISO}T08:00`);

  const cal = await prisma.draftCalendar.findUniqueOrThrow({
    where: { id: calendarId },
    select: { excludedDates: true },
  });
  const wasExcluded = cal.excludedDates.some(
    (d) => d.toISOString().slice(0, 10) === dateISO,
  );
  if (wasExcluded) {
    await prisma.draftCalendar.update({
      where: { id: calendarId },
      data: {
        excludedDates: cal.excludedDates.filter(
          (d) => d.toISOString().slice(0, 10) !== dateISO,
        ),
      },
    });
  }

  const creates = [];
  for (let i = 1; i <= slotsPerDay; i++) {
    creates.push({
      draftCalendarId: calendarId,
      date,
      matchday: 0,
      slotIndex: i,
      competitionId,
      isManual: true,
    });
  }
  await prisma.draftSlot.createMany({ data: creates });

  await regenerateSlotsInternal(calendarId);
  revalidateDraft();
}

export async function removeManualDate(calendarId: string, dateISO: string) {
  await requireAdmin();
  const dayStart = new Date(dateISO + 'T00:00:00Z');
  const dayEnd = new Date(dateISO + 'T23:59:59Z');
  await prisma.draftSlot.deleteMany({
    where: {
      draftCalendarId: calendarId,
      isManual: true,
      date: { gte: dayStart, lte: dayEnd },
    },
  });
  await regenerateSlotsInternal(calendarId);
  revalidateDraft();
}

export async function removeDateSlots(calendarId: string, dateISO: string) {
  await requireAdmin();
  const dayStart = new Date(dateISO + 'T00:00:00Z');
  const dayEnd = new Date(dateISO + 'T23:59:59Z');
  await prisma.draftSlot.deleteMany({
    where: {
      draftCalendarId: calendarId,
      date: { gte: dayStart, lte: dayEnd },
    },
  });
  // Aussi exclure la date pour que la régénération ne la recrée pas
  const cal = await prisma.draftCalendar.findUniqueOrThrow({
    where: { id: calendarId },
    select: { excludedDates: true },
  });
  const alreadyExcluded = cal.excludedDates.some(
    (d) => d.toISOString().slice(0, 10) === dateISO,
  );
  if (!alreadyExcluded) {
    await prisma.draftCalendar.update({
      where: { id: calendarId },
      data: { excludedDates: { push: new Date(dateISO + 'T12:00:00Z') } },
    });
  }
  revalidateDraft();
}

// ---------------------------------------------------------------------------
// Batch add competitions + regenerate
// ---------------------------------------------------------------------------

export async function addCompetitionsBatchAndRegenerate(
  calendarId: string,
  competitions: Array<{
    competitionId: string;
    startDate: string;
    endDate: string;
    slotsPerDay: number;
    dayOfWeek?: string;
    recurrence?: number;
  }>,
) {
  await requireAdmin();

  if (competitions.length === 0) throw new Error('Aucune compétition à ajouter');

  const cal = await prisma.draftCalendar.findUniqueOrThrow({
    where: { id: calendarId },
    include: { competitions: true },
  });

  const existingCompIds = new Set(cal.competitions.map((c) => c.competitionId));
  for (const c of competitions) {
    if (existingCompIds.has(c.competitionId)) {
      throw new Error('Une compétition est déjà ajoutée à ce calendrier');
    }
  }

  const existingCount = cal.competitions.length;
  const calDay = cal.dayOfWeek as 'SATURDAY' | 'SUNDAY';

  const creates = competitions.map((c, i) => {
    const parsed = AddCompetitionSchema.parse(c);
    const startDate = parseReunionDatetimeLocal(`${parsed.startDate}T08:00`);
    const endDate = parseReunionDatetimeLocal(`${parsed.endDate}T23:59`);
    if (endDate <= startDate) throw new Error('La date de fin doit être après la date de début');

    return {
      draftCalendarId: calendarId,
      competitionId: parsed.competitionId,
      startDate,
      endDate,
      slotsPerDay: parsed.slotsPerDay,
      color: COMP_PALETTE[(existingCount + i) % COMP_PALETTE.length],
      dayOfWeek: (parsed.dayOfWeek as 'SATURDAY' | 'SUNDAY' | undefined) ?? null,
      recurrence: parsed.recurrence ?? null,
    };
  });

  const allPeriods: CompPeriod[] = [
    ...cal.competitions.map((dcc) => ({
      competitionId: dcc.competitionId,
      startDate: dcc.startDate,
      endDate: dcc.endDate,
      slotsPerDay: dcc.slotsPerDay,
      dayOfWeek: (dcc.dayOfWeek ?? calDay) as 'SATURDAY' | 'SUNDAY',
      recurrenceWeeks: dcc.recurrence ?? cal.recurrence,
    })),
    ...creates.map((c) => ({
      competitionId: c.competitionId,
      startDate: c.startDate,
      endDate: c.endDate,
      slotsPerDay: c.slotsPerDay,
      dayOfWeek: (c.dayOfWeek ?? calDay) as 'SATURDAY' | 'SUNDAY',
      recurrenceWeeks: c.recurrence ?? cal.recurrence,
    })),
  ];

  const newSlots = generateSlotsFromPeriods(
    cal.startDate,
    cal.endDate,
    cal.dayOfWeek as 'SATURDAY' | 'SUNDAY',
    cal.recurrence,
    allPeriods,
  );

  await prisma.$transaction([
    prisma.draftCalendarCompetition.createMany({ data: creates }),
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
