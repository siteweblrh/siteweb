import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listClubsAdmin } from '@/lib/actions/club';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { ClubsAdmin } from './ClubsAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';

export default async function ClubsAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });
  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ padding: 48 }}>
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          ⚠ Accès restreint
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          La gestion des clubs est réservée aux administrateurs de la ligue.
        </div>
      </div>
    );
  }

  const club = user.club;
  const [clubs, metrics, news] = await Promise.all([
    listClubsAdmin(),
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
        activeTab="ligue-clubs"
        isAdmin
      >
        <div style={{ padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                ...mono,
                fontSize: 11,
                color: LRH.red,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Administration ligue
            </div>
            <h2
              style={{
                ...display,
                fontWeight: 700,
                fontSize: 32,
                color: LRH.navy,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Clubs & ententes.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Registre central des clubs affiliés à la ligue. Créez d'abord les clubs individuels, puis constituez des ententes en sélectionnant 2 clubs membres ou plus. Une entente joue comme une équipe unique en compétition.
            </p>
          </div>
          <ClubsAdmin initialClubs={clubs} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
