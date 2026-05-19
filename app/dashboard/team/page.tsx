import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listMembersForClub, listClubEligibleCompetitionsForStats } from '@/lib/actions/member';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { TeamAdmin } from './TeamAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });

  if (!user?.club) {
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
  const isAdmin = user.role === 'ADMIN';

  const [members, metrics, news, eligibleCompetitions] = await Promise.all([
    listMembersForClub(club.id),
    getClubMetrics(club.id),
    getNews(club.id),
    listClubEligibleCompetitionsForStats(club.id),
  ]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop
        club={club}
        news={news}
        metrics={metrics}
        user={session.user}
        activeTab="team"
        isAdmin={isAdmin}
      >
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 24 }}>
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
                fontSize: 32,
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
