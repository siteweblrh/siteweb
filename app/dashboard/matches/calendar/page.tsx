import React from 'react';
import { redirect } from 'next/navigation';
import {
  listCompetitionsAdmin,
  listClubsForAdmin,
  listMatchesAdmin,
  listAllCompetitionEntries,
} from '@/lib/actions/competition';
import { getAllVenues } from '@/lib/queries/venue';
import { getAllReferees } from '@/lib/queries/referee';
import { CalendarAdmin } from './CalendarAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';

export default async function MatchesCalendarPage() {
  const user = await getDashboardUser();
  if (!user) redirect('/auth/login');
  const club = user.club ?? null;
  const isAdmin = user.role === 'ADMIN';

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

  const [ctx, matches, competitions, clubs, venues, referees, entriesByCompetition] = await Promise.all([
    getDashboardContext(),
    listMatchesAdmin(isAdmin ? undefined : { clubId: club!.id }),
    listCompetitionsAdmin(),
    listClubsForAdmin(),
    getAllVenues(),
    getAllReferees(),
    listAllCompetitionEntries(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="calendar">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
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
              Compétition · Vue calendrier
            </div>
            <h2
              style={{
                ...display,
                fontWeight: 700,
                fontSize: 'clamp(22px, 4vw, 32px)',
                color: LRH.navy,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Calendrier des matchs.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Vue mensuelle de tous les matchs. Cliquez une case pour voir les matchs du jour, ajouter ou modifier un match. Pastilles navy = gazon, or = salle.
            </p>
          </div>

          <CalendarAdmin
            matches={matches}
            competitions={competitions}
            clubs={clubs}
            venues={venues}
            referees={referees}
            entriesByCompetition={entriesByCompetition}
            clubId={club?.id}
            isAdmin={isAdmin}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
