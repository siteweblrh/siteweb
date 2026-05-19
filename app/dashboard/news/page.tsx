import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { paginate } from '@/lib/utils/paginate';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { NewsAdminList } from './NewsAdminList';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';

const PAGE_SIZE = 20;

export default async function NewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // RT1 : user lookup (caché). Permet le branchement admin/club.
  const user = await getDashboardUser();
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
  const { page } = await searchParams;

  // RT2 : count + context (metrics+news) en parallèle.
  const [total, ctx] = await Promise.all([
    prisma.news.count({ where }),
    getDashboardContext(),
  ]);
  const { currentPage, totalPages, skip, take } = paginate({ page, pageSize: PAGE_SIZE, total });

  // RT3 : la query articles paginée (besoin du skip/take, donc après count).
  const articles = await prisma.news.findMany({
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
  });
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab={isAdmin ? 'ligue-news' : 'actus'}>
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Communication · Actualités
            </div>
            <h2 style={{
              ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy,
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
