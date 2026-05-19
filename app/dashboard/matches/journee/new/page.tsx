import React from 'react';
import {
  listCompetitionsAdmin,
  listClubsForAdmin,
  listAllCompetitionEntries,
} from '@/lib/actions/competition';
import { getAllVenues } from '@/lib/queries/venue';
import { MatchdayForm } from './MatchdayForm';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function NewMatchdayPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string; matchday?: string; date?: string }>;
}) {
  const [ctx, params, competitions, clubs, venues, entriesByCompetition] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    searchParams,
    listCompetitionsAdmin(),
    listClubsForAdmin(),
    getAllVenues(),
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
              Compétition · Nouvelle journée
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
