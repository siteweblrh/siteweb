import React from 'react';
import DashboardClient from './DashboardClient';
import { getDashboardContext } from '@/lib/dashboard/context';
import { LRH } from '@/components/lrh/tokens';

export default async function DashboardPage() {
  // getDashboardContext parallélise metrics + news en interne et cache le
  // lookup user via React.cache(). Économise 1-2 round-trips DB par
  // navigation vers /dashboard.
  const ctx = await getDashboardContext();

  // `height: 100vh` + `display: flex` au wrapper : aligne /dashboard sur le
  // même pattern que /dashboard/news et autres pages — sinon la sidebar
  // (height: 100%) ne reçoit pas une hauteur déterminée du parent et ne
  // s'étire pas jusqu'en bas du viewport.
  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <DashboardClient
        club={ctx.club}
        news={ctx.news}
        metrics={ctx.metrics}
        user={ctx.sidebarProps.user}
        isAdmin={ctx.isAdmin}
      />
    </div>
  );
}
