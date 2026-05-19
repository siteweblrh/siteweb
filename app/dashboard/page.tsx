import React from 'react';
import DashboardClient from './DashboardClient';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function DashboardPage() {
  // getDashboardContext parallélise metrics + news en interne et cache le
  // lookup user via React.cache(). Économise 1-2 round-trips DB par
  // navigation vers /dashboard.
  const ctx = await getDashboardContext();

  return (
    <main className="min-h-screen">
      <DashboardClient
        club={ctx.club}
        news={ctx.news}
        metrics={ctx.metrics}
        user={ctx.sidebarProps.user}
        isAdmin={ctx.isAdmin}
      />
    </main>
  );
}
