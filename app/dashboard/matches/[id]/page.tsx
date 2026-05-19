import React from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { MatchDetailAdmin } from './MatchDetailAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });
  const isAdmin = user?.role === 'ADMIN';
  const club = user?.club ?? null;

  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    select: {
      id: true,
      kickoffAt: true,
      status: true,
      matchday: true,
      phase: true,
      homeScore: true,
      awayScore: true,
      venue: true,
      homeClubId: true,
      awayClubId: true,
      organizerClubId: true,
      homeClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      awayClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      organizerClub: { select: { id: true, slug: true, shortCode: true, name: true } },
      competition: { select: { id: true, slug: true, name: true, season: true, mode: true, category: true } },
      venueRef: { select: { id: true, name: true, city: true } },
      goals: {
        orderBy: { minute: 'asc' },
        select: {
          id: true, minute: true, scoringClubId: true, scorerName: true, scorerMemberId: true, kind: true,
          scorerMember: { select: { id: true, firstName: true, lastName: true, jerseyNumber: true } },
        },
      },
      cards: {
        orderBy: { minute: 'asc' },
        select: {
          id: true, minute: true, kind: true, reason: true, clubId: true,
          memberId: true, memberName: true,
          member: { select: { id: true, firstName: true, lastName: true, jerseyNumber: true } },
        },
      },
      injuries: {
        orderBy: { minute: 'asc' },
        select: {
          id: true, minute: true, severity: true, zone: true, notes: true, clubId: true,
          memberId: true, memberName: true, replacedByMemberId: true,
          member: { select: { id: true, firstName: true, lastName: true, jerseyNumber: true } },
          replacedByMember: { select: { id: true, firstName: true, lastName: true, jerseyNumber: true } },
        },
      },
      referees: {
        orderBy: [{ role: 'asc' }],
        select: { role: true, referee: { select: { id: true, fullName: true } } },
      },
    },
  });

  if (!match) notFound();

  // Check access : admin OR manager d'un des deux clubs
  const involvesUserClub = club && (club.id === match.homeClubId || club.id === match.awayClubId);
  if (!isAdmin && !involvesUserClub) {
    return (
      <div style={{ padding: 48 }}>
        <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          ⚠ Accès refusé
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          Vous n'avez pas accès au détail de ce match.
        </div>
        <Link
          href="/dashboard/matches"
          style={{ ...mono, fontSize: 12, color: LRH.navy, marginTop: 16, display: 'inline-block' }}
        >
          ← Retour
        </Link>
      </div>
    );
  }

  // Members des deux équipes (PLAYER only) — pour les pickers buteurs/cartons/blessures
  const [homeMembers, awayMembers, metrics, news] = await Promise.all([
    prisma.member.findMany({
      where: { clubId: match.homeClubId, kind: 'PLAYER' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, jerseyNumber: true },
    }),
    prisma.member.findMany({
      where: { clubId: match.awayClubId, kind: 'PLAYER' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, jerseyNumber: true },
    }),
    club ? getClubMetrics(club.id) : Promise.resolve({ newsCount: 0, membersCount: 0, sponsorsCount: 0 }),
    club ? getNews(club.id) : Promise.resolve([]),
  ]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop
        club={club}
        news={news}
        metrics={metrics}
        user={session.user}
        activeTab="matches"
        isAdmin={isAdmin}
      >
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <MatchDetailAdmin
            match={match}
            homeMembers={homeMembers}
            awayMembers={awayMembers}
            isAdmin={isAdmin}
            currentUserId={session.user.id}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
