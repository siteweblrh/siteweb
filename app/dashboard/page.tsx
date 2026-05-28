import React from 'react';
import DashboardClient from './DashboardClient';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getClubHomeSummary } from '@/lib/queries/clubHome';
import { LRH } from '@/components/lrh/tokens';

export default async function DashboardPage() {
  const ctx = await getDashboardContext();

  // Pour un club manager (pas admin), on enrichit l'écran d'accueil avec
  // un résumé "live" : prochain match, dernier résultat, positions au
  // classement. Skip si admin → l'admin a son propre overview ligue.
  const summary = (!ctx.isAdmin && ctx.club)
    ? await getClubHomeSummary(ctx.club.id)
    : null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <DashboardClient
        club={ctx.club}
        news={ctx.news}
        metrics={ctx.metrics}
        user={ctx.sidebarProps.user}
        isAdmin={ctx.isAdmin}
        summary={summary ? JSON.parse(JSON.stringify(summary)) : null}
      />
    </div>
  );
}
