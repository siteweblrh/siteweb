import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  listCompetitionsAdmin,
  listClubsForAdmin,
  listMatchesAdmin,
  listAllCompetitionEntries,
} from '@/lib/actions/competition';
import { getAllVenues } from '@/lib/queries/venue';
import { getAllReferees } from '@/lib/queries/referee';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { MatchesAdmin } from './MatchesAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });

  const club = user?.club ?? null;
  const isAdmin = user?.role === 'ADMIN';

  if (!club && !isAdmin) {
    return (
      <div style={{ padding: 48 }}>
        <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          ⚠ Accès restreint
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          Cette section nécessite un compte rattaché à un club ou un compte administrateur.
        </div>
      </div>
    );
  }

  const [matches, competitions, clubs, venues, referees, entriesByCompetition, metrics, news] = await Promise.all([
    listMatchesAdmin(isAdmin ? undefined : { clubId: club!.id }),
    listCompetitionsAdmin(),
    listClubsForAdmin(),
    getAllVenues(),
    getAllReferees(),
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
        activeTab="matches"
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
              Compétition · Vue liste
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
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
                Calendrier & Matchs.
              </h2>
              <Link
                href="/dashboard/matches/calendar"
                style={{
                  ...mono,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '8px 14px',
                  background: 'transparent',
                  color: LRH.navy,
                  border: '1px solid ' + LRH.navy,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                ▦ Vue calendrier
              </Link>
            </div>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              {isAdmin
                ? 'Créez, modifiez ou supprimez les matchs de chaque compétition. La compétition est choisie à la création — la création d\'un match déclenche le recalcul automatique du classement.'
                : 'Consultez les matchs de votre club et laissez des notes à l\'attention de la ligue (désaccord sur un score, contexte du match, etc.). Les scores officiels sont saisis par la ligue.'}
            </p>
          </div>

          <MatchesAdmin
            matches={matches}
            competitions={competitions}
            clubs={clubs}
            venues={venues}
            referees={referees}
            entriesByCompetition={entriesByCompetition}
            clubId={club?.id}
            isAdmin={isAdmin}
            currentUserId={session.user.id}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
