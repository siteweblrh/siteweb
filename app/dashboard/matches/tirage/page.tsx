import React from 'react';
import {
  listCompetitionsAdmin,
  listClubsForAdmin,
  listAllCompetitionEntries,
} from '@/lib/actions/competition';
import { TirageForm } from './TirageForm';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function TiragePage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string }>;
}) {
  const [ctx, params, competitions, clubs, entriesByCompetition] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    searchParams,
    listCompetitionsAdmin(),
    listClubsForAdmin(),
    listAllCompetitionEntries(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="matches">
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
              Compétition · Tirage au sort
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
              Générer un calendrier round-robin.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Sélectionnez la compétition, les équipes participantes, puis générez automatiquement
              toutes les rencontres aller (ou aller-retour). Le tirage au sort mélange l'ordre des
              équipes avant de répartir les confrontations.
            </p>
          </div>

          <TirageForm
            competitions={competitions}
            clubs={clubs}
            entriesByCompetition={entriesByCompetition}
            initialCompetitionId={params.competition ?? ''}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
