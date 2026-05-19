import React from 'react';
import { getAllVenues } from '@/lib/queries/venue';
import { VenuesAdmin } from './VenuesAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function VenuesAdminPage() {
  const [ctx, venues] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    getAllVenues(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-venues">
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
              Administration ligue
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
              Terrains.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Registre central des terrains de la Réunion. Chaque terrain déclare ses surfaces praticables (gazon, salle). Les clubs sélectionnent leur terrain domicile depuis leur espace ; la ligue peut sinon en imposer un à la création du match.
            </p>
          </div>
          <VenuesAdmin initialVenues={venues} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
