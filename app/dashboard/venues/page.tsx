import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAllVenues, getClubVenuePreferences } from '@/lib/queries/venue';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { ClubVenuesForm } from './ClubVenuesForm';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';

export default async function ClubVenuesPage() {
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

  const club = user.club;
  const isAdmin = user.role === 'ADMIN';

  const [allVenues, preferences, metrics, news] = await Promise.all([
    getAllVenues(),
    getClubVenuePreferences(club.id),
    getClubMetrics(club.id),
    getNews(club.id),
  ]);

  const gazonVenues = allVenues.filter((v) => v.supportsGazon);
  const salleVenues = allVenues.filter((v) => v.supportsSalle);

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop
        club={club}
        news={news}
        metrics={metrics}
        user={session.user}
        activeTab="venues"
        isAdmin={isAdmin}
      >
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
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
              Espace club
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
              Mes terrains.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Sélectionnez les terrains domicile du club pour chaque discipline. Ces terrains sont proposés par défaut lors de la création d'un match à domicile. Si vous n'avez pas de terrain dédié, laissez vide et la ligue affectera un terrain.
            </p>
          </div>

          <ClubVenuesForm
            clubId={club.id}
            clubName={club.name}
            preferences={preferences!}
            gazonVenues={gazonVenues}
            salleVenues={salleVenues}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
