import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listCompetitionsAdmin, listAllCompetitionEntries } from '@/lib/actions/competition';
import { listClubsAdmin } from '@/lib/actions/club';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { LRH, display, mono } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { CompetitionsAdmin } from './CompetitionsAdmin';

export default async function DashboardCompetitionsPage() {
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
  const [competitions, allClubs, entriesByCompetition, metrics, news] = await Promise.all([
    listCompetitionsAdmin(),
    listClubsAdmin(),
    listAllCompetitionEntries(),
    club ? getClubMetrics(club.id) : Promise.resolve({ newsCount: 0, membersCount: 0, sponsorsCount: 0 }),
    club ? getNews(club.id) : Promise.resolve([]),
  ]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop club={club} news={news} metrics={metrics} user={session.user} activeTab="ligue-competitions" isAdmin>
        <div style={{ padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Administration ligue
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 32, color: LRH.navy, margin: 0, letterSpacing: '-0.02em' }}>Compétitions.</h2>
            <p style={{ ...display, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 640 }}>
              Créez les compétitions de la saison — discipline (Gazon / Salle) et catégorie déterminent les couleurs et la sémantique dans tout le site.
            </p>
          </div>
          <CompetitionsAdmin
            initialCompetitions={competitions}
            allClubs={allClubs}
            entriesByCompetition={entriesByCompetition}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
