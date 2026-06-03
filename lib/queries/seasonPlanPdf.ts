import { prisma } from '@/lib/prisma';

export async function getDraftCalendarsForSeasonPdf(season: string) {
  return prisma.draftCalendar.findMany({
    where: { season },
    include: {
      slots: {
        include: {
          competition: { select: { id: true, name: true, mode: true, category: true, format: true } },
          venueRef: { select: { id: true, name: true, city: true } },
        },
        orderBy: [{ date: 'asc' }, { slotIndex: 'asc' }],
      },
      competitions: {
        include: {
          competition: { select: { id: true, name: true, mode: true, category: true } },
        },
        orderBy: [{ sortIndex: 'asc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: { startDate: 'asc' },
  });
}

export type SeasonPlanCalendar = Awaited<ReturnType<typeof getDraftCalendarsForSeasonPdf>>[number];
