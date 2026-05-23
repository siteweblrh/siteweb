import React from 'react';
import NewsForm, { type ExistingArticle } from '../../new/NewsForm';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getClubs } from '@/lib/actions/clubs';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { LRH } from '@/components/lrh/tokens';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';

type RouteParams = { id: string };

export default async function EditNewsPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;

  const user = await getDashboardUser();
  if (!user) redirect('/auth/login');
  const isAdmin = user.role === 'ADMIN';

  const article = await prisma.news.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImage: true,
      category: true,
      published: true,
      clubId: true,
      authorId: true,
    },
  });
  if (!article) notFound();

  // Droits : admin ligue OU auteur de l'article OU manager d'un club rattaché.
  const isAuthor = article.authorId === user.id;
  const isClubManager = !!user.clubId && user.clubId === article.clubId;
  if (!isAdmin && !isAuthor && !isClubManager) redirect('/dashboard');

  const [ctx, clubs] = await Promise.all([
    getDashboardContext(),
    isAdmin ? getClubs() : Promise.resolve([]),
  ]);
  const { sidebarProps } = ctx;

  const existing: ExistingArticle = {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    coverImage: article.coverImage,
    category: article.category as ExistingArticle['category'],
    published: article.published,
    clubId: article.clubId,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab={isAdmin ? 'ligue-news' : 'actus'}>
        <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 900, margin: '0 auto' }}>
          <NewsForm
            defaultClubId={user.clubId ?? null}
            isAdmin={isAdmin}
            clubs={clubs}
            existing={existing}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
