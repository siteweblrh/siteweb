'use server';

import { prisma } from "@/lib/prisma";

export async function getClubs() {
  return await prisma.club.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getClubMetrics(clubId: string) {
  const [newsCount, membersCount, sponsorsCount] = await Promise.all([
    prisma.news.count({ where: { clubId } }),
    prisma.member.count({ where: { clubId } }),
    prisma.sponsor.count({ where: { clubId } }),
  ]);

  return { newsCount, membersCount, sponsorsCount };
}
