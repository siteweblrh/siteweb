import React from 'react';
import { listMembersForClub, listClubEligibleCompetitionsForStats } from '@/lib/actions/member';
import { TeamAdmin } from './TeamAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function TeamPage() {
  // Context (user + club + metrics + news) en parallèle avec members +
  // eligibleCompetitions. Tout démarre en simultané, ~2x plus rapide qu'avant.
  const ctx = await getDashboardContext();

  if (!ctx.club) {
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

  const { club, sidebarProps } = ctx;

  const [members, eligibleCompetitions] = await Promise.all([
    listMembersForClub(club.id),
    listClubEligibleCompetitionsForStats(club.id),
  ]);

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
