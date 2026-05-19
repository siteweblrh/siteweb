import React from 'react';
import { listClubsAdmin } from '@/lib/actions/club';
import { ClubsAdmin } from './ClubsAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function ClubsAdminPage() {
  // requireAdmin gère le redirect si pas admin. Context + clubs en parallèle.
  const [ctx, clubs] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listClubsAdmin(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-clubs">
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
              Clubs & ententes.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Registre central des clubs affiliés à la ligue. Créez d'abord les clubs individuels, puis constituez des ententes en sélectionnant 2 clubs membres ou plus. Une entente joue comme une équipe unique en compétition.
            </p>
          </div>
          <ClubsAdmin initialClubs={clubs} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
