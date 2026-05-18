import React from 'react';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewsForm from './NewsForm';
import { redirect } from 'next/navigation';
import { getClubs } from '@/lib/actions/clubs';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { LRH } from '@/components/lrh/tokens';

export default async function NewNewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });

  if (!user) redirect('/auth/login');

  const isAdmin = user.role === 'ADMIN';

  if (!user.clubId && !isAdmin) {
    redirect('/dashboard');
  }

  const club = user.club ?? null;

  const [clubs, metrics, news] = await Promise.all([
    isAdmin ? getClubs() : Promise.resolve([]),
    club ? getClubMetrics(club.id) : Promise.resolve({ newsCount: 0, membersCount: 0, sponsorsCount: 0 }),
    club ? getNews(club.id) : Promise.resolve([]),
  ]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop
        club={club}
        news={news}
        metrics={metrics}
        user={session.user}
        activeTab={isAdmin ? 'ligue-news' : 'actus'}
        isAdmin={isAdmin}
      >
        <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
          <NewsForm
            defaultClubId={user.clubId ?? null}
            isAdmin={isAdmin}
            clubs={clubs}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
