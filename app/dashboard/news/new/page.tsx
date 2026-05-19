import React from 'react';
import NewsForm from './NewsForm';
import { redirect } from 'next/navigation';
import { getClubs } from '@/lib/actions/clubs';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { LRH } from '@/components/lrh/tokens';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';

export default async function NewNewsPage() {
  const user = await getDashboardUser();
  if (!user) redirect('/auth/login');
  const isAdmin = user.role === 'ADMIN';
  if (!user.clubId && !isAdmin) redirect('/dashboard');

  const [ctx, clubs] = await Promise.all([
    getDashboardContext(),
    isAdmin ? getClubs() : Promise.resolve([]),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab={isAdmin ? 'ligue-news' : 'actus'}>
        <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 900, margin: '0 auto' }}>
          <NewsForm
            defaultClubId={user.clubId ?? null}
            isAdmin={isAdmin}
            clubs={clubs}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
