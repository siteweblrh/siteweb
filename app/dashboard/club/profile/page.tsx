import React from 'react';
import { redirect } from 'next/navigation';
import { getClubProfile } from '@/lib/actions/club';
import { ClubProfileForm } from './ClubProfileForm';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';

export default async function ClubProfilePage() {
  // RT1 : user (cached). Branchement club requis.
  const user = await getDashboardUser();
  if (!user) redirect('/auth/login');

  if (!user.club) {
    return (
      <div style={{ padding: 48 }}>
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          ⚠ Aucun club rattaché
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          Cet espace est destiné aux comptes affiliés à un club.
        </div>
      </div>
    );
  }

  const clubRow = user.club;

  // RT2 : context (metrics + news) + profile en parallèle.
  const [ctx, profile] = await Promise.all([
    getDashboardContext(),
    getClubProfile(clubRow.id),
  ]);
  const { sidebarProps } = ctx;

  if (!profile) redirect('/dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="profile">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 1080 }}>
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
              Espace club · Identité publique
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
              Profil du club.
            </h2>
            <p
              style={{
                ...body,
                fontSize: 13,
                color: LRH.mute,
                margin: '8px 0 0',
                maxWidth: 720,
              }}
            >
              Ces informations apparaissent sur la fiche publique{' '}
              <code
                style={{
                  ...mono,
                  fontSize: 12,
                  color: LRH.navy,
                  background: LRH.paperWarm,
                  padding: '1px 6px',
                  border: '1px solid ' + LRH.hair,
                }}
              >
                /clubs/{profile.slug}
              </code>
              . Le nom du club, sa ville et son code court restent administrés par la ligue.
            </p>
          </div>

          <ClubProfileForm profile={profile} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
