import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listUsersAdmin } from '@/lib/actions/user';
import { listClubsAdmin } from '@/lib/actions/club';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { UsersAdmin } from './UsersAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';

export default async function UsersAdminPage() {
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
          La gestion des comptes est réservée aux administrateurs de la ligue.
        </div>
      </div>
    );
  }

  const club = user.club;
  const [users, clubs, metrics, news] = await Promise.all([
    listUsersAdmin(),
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
        activeTab="ligue-users"
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
              Comptes.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Créez les comptes administrateurs de la ligue et les managers de club. Un manager rattaché à un club peut gérer ses matchs, ses terrains et ses actualités depuis son espace dédié.
            </p>
          </div>
          <UsersAdmin initialUsers={users} clubs={clubs} currentUserId={session.user.id} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
