import React from 'react';
import DashboardClient from './DashboardClient';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getClubHomeSummary } from '@/lib/queries/clubHome';
import { WelcomeModal } from '@/components/lrh/onboarding/WelcomeModal';
import { LRH } from '@/components/lrh/tokens';

export default async function DashboardPage() {
  const ctx = await getDashboardContext();

  const summary = (!ctx.isAdmin && ctx.club)
    ? await getClubHomeSummary(ctx.club.id)
    : null;

  // Premier login : onboardingCompletedAt est null tant que l'utilisateur n'a
  // pas vu (ou skippé) le tutoriel. Affiché en overlay au-dessus du dashboard.
  const needsOnboarding = ctx.user.onboardingCompletedAt == null;

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
      {needsOnboarding && <WelcomeModal isAdmin={ctx.isAdmin} />}
    </div>
  );
}
