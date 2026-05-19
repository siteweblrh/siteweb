import React from 'react';
import Link from 'next/link';
import {
  listCompetitionsAdmin,
  listClubsForAdmin,
  listMatchesAdmin,
  listAllCompetitionEntries,
} from '@/lib/actions/competition';
import { getAllVenues } from '@/lib/queries/venue';
import { getAllReferees } from '@/lib/queries/referee';
import { MatchesAdmin } from './MatchesAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { redirect } from 'next/navigation';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';

export default async function MatchesPage() {
  // RT1 : user lookup (cached, partagé entre context et la garde admin-check).
  const user = await getDashboardUser();
  if (!user) redirect('/auth/login');
  const club = user.club;
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

  // RT2 : context (= metrics + news en parallèle, user déjà caché) + toutes
  // les queries page-specific en simultané. Total = 2 round-trips DB.
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
      <HomeDashboardDesktop {...sidebarProps} activeTab="matches">
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
            currentUserId={user.id}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
