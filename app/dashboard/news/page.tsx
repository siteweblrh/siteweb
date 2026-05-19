import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { paginate } from '@/lib/utils/paginate';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { NewsAdminList } from './NewsAdminList';

const PAGE_SIZE = 20;

export default async function NewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });
  if (!user) redirect('/auth/login');

  const isAdmin = user.role === 'ADMIN';
  const club = user.club ?? null;

  if (!isAdmin && !club) {
    return (
      <div style={{ padding: 48 }}>
        <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          ⚠ Accès restreint
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          Cette section nécessite un compte rattaché à un club ou un compte administrateur.
        </div>
      </div>
    );
  }

  // Manager voit uniquement les news de son club ; admin voit tout.
  const where = isAdmin ? {} : { clubId: club!.id };
  const total = await prisma.news.count({ where });
  const { page } = await searchParams;
  const { currentPage, totalPages, skip, take } = paginate({ page, pageSize: PAGE_SIZE, total });

  const [articles, metrics, sidebarNews] = await Promise.all([
    prisma.news.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        category: true,
        published: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { name: true, email: true } },
        club: { select: { name: true, shortCode: true } },
      },
    }),
    club ? getClubMetrics(club.id) : Promise.resolve({ newsCount: 0, membersCount: 0, sponsorsCount: 0 }),
    club ? getNews(club.id) : Promise.resolve([]),
  ]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop
        club={club}
        news={sidebarNews}
        metrics={metrics}
        user={session.user}
        activeTab={isAdmin ? 'ligue-news' : 'actus'}
        isAdmin={isAdmin}
      >
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Communication · Actualités
            </div>
            <h2 style={{
              ...display, fontWeight: 700, fontSize: 32, color: LRH.navy,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              {isAdmin ? 'Toutes les actualités.' : 'Actualités de ' + (club?.name ?? 'votre club') + '.'}
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Liste, édition, publication ou suppression. Bouton ci-dessous pour rédiger un nouvel article.
            </p>
          </div>

          <NewsAdminList
            articles={articles}
            isAdmin={isAdmin}
            pagination={{ currentPage, totalPages, totalItems: total }}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
