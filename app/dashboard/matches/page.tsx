import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  listCompetitionsAdmin,
  listClubsForAdmin,
  listMatchesAdmin,
} from '@/lib/actions/competition';
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

  const [matches, competitions, clubs, metrics, news] = await Promise.all([
    listMatchesAdmin(isAdmin ? undefined : { clubId: club!.id }),
    listCompetitionsAdmin(),
    listClubsForAdmin(),
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
              Compétition
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
              Calendrier & Matchs.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              {isAdmin
                ? 'Créez, modifiez ou supprimez les matchs de chaque compétition. La compétition est choisie à la création — la création d\'un match déclenche le recalcul automatique du classement.'
                : 'Mettez à jour les scores et le statut des matchs de votre club. Seuls les administrateurs peuvent créer ou supprimer des matchs.'}
            </p>
          </div>

          <MatchesAdmin
            matches={matches}
            competitions={competitions}
            clubs={clubs}
            clubId={club?.id}
            isAdmin={isAdmin}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
