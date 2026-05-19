import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAllPlayerOfMonth, getMembersForPicker } from '@/lib/queries/ligue';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { LRH, display, mono } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { MvpAdmin } from './MvpAdmin';

export default async function DashboardMvpPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });
  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ padding: 48 }}>
        <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>⚠ Accès restreint</div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>Cette section est réservée aux administrateurs de la ligue.</div>
      </div>
    );
  }

  const club = user.club;
  const [awards, members, metrics, news] = await Promise.all([
    getAllPlayerOfMonth(),
    getMembersForPicker(),
    club ? getClubMetrics(club.id) : Promise.resolve({ newsCount: 0, membersCount: 0, sponsorsCount: 0 }),
    club ? getNews(club.id) : Promise.resolve([]),
  ]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop club={club} news={news} metrics={metrics} user={session.user} activeTab="ligue-mvp" isAdmin>
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Administration ligue
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 32, color: LRH.navy, margin: 0, letterSpacing: '-0.02em' }}>Joueur du mois.</h2>
            <p style={{ ...mono, fontSize: 12, color: LRH.mute, letterSpacing: '0.04em', marginTop: 10, maxWidth: 640 }}>
              Nommez le joueur ou la joueuse du mois pour chaque mode. La carte la plus récente (date d'effet) est affichée sur la page d'accueil.
            </p>
          </div>
          <MvpAdmin initialAwards={awards} members={members} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
