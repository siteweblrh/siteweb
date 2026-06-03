import React from 'react';
import { redirect } from 'next/navigation';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';
import { getMyEngagement } from '@/lib/actions/engagement';
import {
  ENGAGEMENT_SEASON,
  normalizeEngagementData,
  prefillFromClub,
} from '@/lib/engagement/schema';
import { ManagerEngagementClient } from './ManagerEngagementClient';

export const metadata = { title: "Fiche d'engagement — LRH" };

export default async function EngagementPage() {
  const user = await getDashboardUser();
  if (!user) redirect('/auth/login');
  const club = user.club ?? null;
  if (!club) {
    return (
      <div style={{ padding: 48 }}>
        <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          ⚠ Accès restreint
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          La fiche d'engagement est réservée aux managers de club.
        </div>
      </div>
    );
  }

  const [ctx, engagement] = await Promise.all([
    getDashboardContext(),
    getMyEngagement(),
  ]);
  const { sidebarProps } = ctx;

  const initialData = engagement
    ? normalizeEngagementData(engagement.data)
    : prefillFromClub(club);

  const initialDecl = {
    signedByName: engagement?.signedByName ?? '',
    signedCity: engagement?.signedCity ?? club.city ?? '',
    paymentMethod: (engagement?.paymentMethod as 'TRANSFER' | 'CHECK' | null) ?? null,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="engagement">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Gestion du club · Engagement
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy, margin: 0, letterSpacing: '-0.02em' }}>
              Fiche d'engagement {ENGAGEMENT_SEASON}.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Remplissez la fiche d'engagement de {club.name} pour la saison à venir. Vous pouvez enregistrer
              un brouillon à tout moment ; une fois soumise, la fiche est transmise à la Ligue pour validation.
            </p>
          </div>

          <ManagerEngagementClient
            clubId={club.id}
            season={ENGAGEMENT_SEASON}
            initialData={initialData}
            initialDecl={initialDecl}
            status={(engagement?.status as 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED') ?? 'DRAFT'}
            rejectedReason={engagement?.rejectedReason ?? null}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
