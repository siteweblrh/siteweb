import React from 'react';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from './DashboardClient';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';

export default async function DashboardPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id },
    include: { club: true },
  });

  const club = user?.club;
  const metrics = club ? await getClubMetrics(club.id) : { newsCount: 0, membersCount: 0, sponsorsCount: 0 };
  const news = club ? await getNews(club.id) : [];

  return (
    <main className="min-h-screen">
      <DashboardClient
        club={club}
        news={news}
        metrics={metrics}
        user={session?.user}
        isAdmin={user?.role === 'ADMIN'}
      />
    </main>
  );
}
