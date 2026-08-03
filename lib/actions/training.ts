'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { CACHE_TAGS, revalidatePublic } from '@/lib/cache/public';

const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'] as const;
type DayOfWeek = typeof DAYS[number];

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autorisé');
  return session;
}

/**
 * Manager d'un club OU admin peuvent gérer les horaires du club.
 * Le club doit exister.
 */
async function requireClubAccess(clubId: string) {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { role: true, clubId: true },
  });
  if (user?.role !== 'ADMIN' && user?.clubId !== clubId) {
    throw new Error("Non autorisé à modifier les horaires de ce club");
  }
  return session;
}

function revalidateTraining(clubSlug?: string | null) {
  revalidatePublic(CACHE_TAGS.training, CACHE_TAGS.clubs);
  revalidatePath('/dashboard/club/training');
  revalidatePath('/dashboard');
  revalidatePath('/licence');
  revalidatePath('/clubs');
  if (clubSlug) revalidatePath(`/clubs/${clubSlug}`);
}

const TimeRe = /^\d{2}:\d{2}$/;

const TrainingScheduleSchema = z.object({
  category: z.string().trim().min(1, 'Catégorie requise').max(64),
  dayOfWeek: z.enum(DAYS),
  startTime: z.string().regex(TimeRe, 'Heure attendue au format HH:mm'),
  endTime: z.string().regex(TimeRe, 'Heure attendue au format HH:mm'),
  venueId: z.string().nullable().optional(),
  location: z.string().trim().max(160).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
}).refine((d) => {
  const [hs, ms] = d.startTime.split(':').map(Number);
  const [he, me] = d.endTime.split(':').map(Number);
  return hs * 60 + ms < he * 60 + me;
}, {
  message: "L'heure de fin doit être après l'heure de début.",
  path: ['endTime'],
});

export type TrainingScheduleInput = z.infer<typeof TrainingScheduleSchema>;

export async function listTrainingSchedulesForClub(clubId: string) {
  return prisma.trainingSchedule.findMany({
    where: { clubId },
    orderBy: [{ category: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
    include: {
      venue: { select: { id: true, name: true, city: true } },
    },
  });
}

export type TrainingScheduleRow = Awaited<ReturnType<typeof listTrainingSchedulesForClub>>[number];

export async function createTrainingSchedule(clubId: string, input: TrainingScheduleInput) {
  await requireClubAccess(clubId);
  const data = TrainingScheduleSchema.parse(input);
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { slug: true } });
  if (!club) throw new Error('Club introuvable');
  const created = await prisma.trainingSchedule.create({
    data: {
      clubId,
      category: data.category,
      dayOfWeek: data.dayOfWeek as DayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      venueId: data.venueId || null,
      location: data.location || null,
      notes: data.notes || null,
    },
  });
  revalidateTraining(club.slug);
  return created;
}

export async function updateTrainingSchedule(id: string, input: Partial<TrainingScheduleInput>) {
  const existing = await prisma.trainingSchedule.findUnique({
    where: { id },
    select: { clubId: true, club: { select: { slug: true } } },
  });
  if (!existing) throw new Error('Créneau introuvable');
  await requireClubAccess(existing.clubId);
  const data = TrainingScheduleSchema.partial().parse(input);
  const updated = await prisma.trainingSchedule.update({
    where: { id },
    data: {
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.dayOfWeek !== undefined ? { dayOfWeek: data.dayOfWeek as DayOfWeek } : {}),
      ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
      ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
      ...(data.venueId !== undefined ? { venueId: data.venueId || null } : {}),
      ...(data.location !== undefined ? { location: data.location || null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
    },
  });
  revalidateTraining(existing.club.slug);
  return updated;
}

export async function deleteTrainingSchedule(id: string) {
  const existing = await prisma.trainingSchedule.findUnique({
    where: { id },
    select: { clubId: true, club: { select: { slug: true } } },
  });
  if (!existing) throw new Error('Créneau introuvable');
  await requireClubAccess(existing.clubId);
  await prisma.trainingSchedule.delete({ where: { id } });
  revalidateTraining(existing.club.slug);
}
