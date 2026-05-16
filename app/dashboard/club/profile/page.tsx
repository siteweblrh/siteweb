import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getClubProfile } from '@/lib/actions/club';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { ClubProfileForm } from './ClubProfileForm';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';

export default async function ClubProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });

  if (!user?.club) {
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
          ⚠ Aucun club rattaché
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          Cet espace est destiné aux comptes affiliés à un club.
        </div>
      </div>
    );
  }

  const clubRow = user.club;
  const isAdmin = user.role === 'ADMIN';

  const [profile, metrics, news] = await Promise.all([
    getClubProfile(clubRow.id),
    getClubMetrics(clubRow.id),
    getNews(clubRow.id),
  ]);

  if (!profile) redirect('/dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop
        club={clubRow}
        news={news}
        metrics={metrics}
        user={session.user}
        activeTab="profile"
        isAdmin={isAdmin}
      >
        <div style={{ padding: 32, maxWidth: 1080 }}>
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
              Espace club · Identité publique
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
              Profil du club.
            </h2>
            <p
              style={{
                ...body,
                fontSize: 13,
                color: LRH.mute,
                margin: '8px 0 0',
                maxWidth: 720,
              }}
            >
              Ces informations apparaissent sur la fiche publique{' '}
              <code
                style={{
                  ...mono,
                  fontSize: 12,
                  color: LRH.navy,
                  background: LRH.paperWarm,
                  padding: '1px 6px',
                  border: '1px solid ' + LRH.hair,
                }}
              >
                /clubs/{profile.slug}
              </code>
              . Le nom du club, sa ville et son code court restent administrés par la ligue.
            </p>
          </div>

          <ClubProfileForm profile={profile} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
