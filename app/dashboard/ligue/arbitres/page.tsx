import React from 'react';
import { getAllReferees } from '@/lib/queries/referee';
import { getAllClubs } from '@/lib/queries/club';
import { ArbitresAdmin } from './ArbitresAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function ArbitresAdminPage() {
  const [ctx, referees, clubs] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    getAllReferees(),
    getAllClubs(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-arbitres">
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
              Arbitres.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Registre des arbitres affiliés. Affectez jusqu'à 2 arbitres principaux et 1 délégué par match depuis la page Matchs.
            </p>
          </div>
          <ArbitresAdmin initialReferees={referees} clubs={clubs} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
