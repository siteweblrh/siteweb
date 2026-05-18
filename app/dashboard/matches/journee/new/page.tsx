import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  listCompetitionsAdmin,
  listClubsForAdmin,
  listAllCompetitionEntries,
} from '@/lib/actions/competition';
import { getAllVenues } from '@/lib/queries/venue';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { MatchdayForm } from './MatchdayForm';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';

export default async function NewMatchdayPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string; matchday?: string; date?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ padding: 48 }}>
        <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          ⚠ Accès réservé
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          La création d'une journée est réservée aux administrateurs de la ligue.
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const club = user?.club ?? null;

  const [competitions, clubs, venues, entriesByCompetition, metrics, news] = await Promise.all([
    listCompetitionsAdmin(),
    listClubsForAdmin(),
    getAllVenues(),
    listAllCompetitionEntries(),
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
        activeTab="calendar"
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
              Compétition · Nouvelle journée
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
              Créer une journée.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Saisissez l'ensemble des matchs d'une journée en une seule passe : compétition, n° de journée, date,
              équipe responsable logistique, puis chaque rencontre (équipes, heure, terrain). La validation crée tous
              les matchs en une transaction.
            </p>
          </div>

          <MatchdayForm
            competitions={competitions}
            clubs={clubs}
            venues={venues}
            entriesByCompetition={entriesByCompetition}
            initialCompetitionId={params.competition ?? ''}
            initialMatchday={params.matchday ?? ''}
            initialDate={params.date ?? ''}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
