import React from 'react';
import { getSponsorsAdmin, getClubsForSponsorPicker } from '@/lib/queries/sponsor';
import { LRH, display, mono } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { SponsorsAdmin } from './SponsorsAdmin';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function DashboardSponsorsPage() {
  const [ctx, sponsors, clubs] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    getSponsorsAdmin(),
    getClubsForSponsorPicker(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-sponsors">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Administration ligue
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy, margin: 0, letterSpacing: '-0.02em' }}>Sponsors &amp; partenaires.</h2>
          </div>
          <SponsorsAdmin initialSponsors={sponsors} clubs={clubs} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
