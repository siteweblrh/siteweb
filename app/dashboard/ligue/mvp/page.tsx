import React from 'react';
import { getAllPlayerOfMonth, getMembersForPicker } from '@/lib/queries/ligue';
import { LRH, display, mono } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { MvpAdmin } from './MvpAdmin';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function DashboardMvpPage() {
  const [ctx, awards, members] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    getAllPlayerOfMonth(),
    getMembersForPicker(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-mvp">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Administration ligue
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy, margin: 0, letterSpacing: '-0.02em' }}>Joueur du mois.</h2>
            <p style={{ ...mono, fontSize: 12, color: LRH.mute, letterSpacing: '0.04em', marginTop: 10, maxWidth: 640 }}>
              Nommez le joueur ou la joueuse du mois pour chaque mode. La carte la plus récente (date d'effet) est affichée sur la page d'accueil.
            </p>
          </div>
          <MvpAdmin initialAwards={awards} members={members} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
