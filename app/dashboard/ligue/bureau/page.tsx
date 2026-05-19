import React from 'react';
import { getBureau } from '@/lib/queries/ligue';
import { LRH, display, mono } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { BureauAdmin } from './BureauAdmin';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function DashboardBureauPage() {
  const [ctx, members] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    getBureau(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-bureau">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Administration ligue
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy, margin: 0, letterSpacing: '-0.02em' }}>Bureau exécutif.</h2>
          </div>
          <BureauAdmin initialMembers={members} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
