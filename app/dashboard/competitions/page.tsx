import React from 'react';
import { listCompetitionsAdmin, listAllCompetitionEntries } from '@/lib/actions/competition';
import { listClubsAdmin } from '@/lib/actions/club';
import { LRH, display, mono } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { CompetitionsAdmin } from './CompetitionsAdmin';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function DashboardCompetitionsPage() {
  const [ctx, competitions, allClubs, entriesByCompetition] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listCompetitionsAdmin(),
    listClubsAdmin(),
    listAllCompetitionEntries(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-competitions">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Administration ligue
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy, margin: 0, letterSpacing: '-0.02em' }}>Compétitions.</h2>
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
