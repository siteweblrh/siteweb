import React from 'react';
import { redirect } from 'next/navigation';
import { listMembersForClub, listClubEligibleCompetitionsForStats } from '@/lib/actions/member';
import { TeamAdmin } from './TeamAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';

export default async function TeamPage() {
  // RT1 : user lookup (caché). Permet le branchement "club requis".
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

  const club = user.club;

  // RT2 : context (metrics + news) + members + eligible competitions en
  // parallèle. Total = 2 round-trips DB.
  const [ctx, members, eligibleCompetitions] = await Promise.all([
    getDashboardContext(),
    listMembersForClub(club.id),
    listClubEligibleCompetitionsForStats(club.id),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="team">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
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
              Espace club · Effectif
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
              Composition de {club.name}.
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
              Joueurs, encadrants et staff officiel du club. Les numéros de licence sont uniques à l'échelle de la ligue.
            </p>
          </div>

          <TeamAdmin
            clubId={club.id}
            members={members}
            eligibleCompetitions={eligibleCompetitions}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
