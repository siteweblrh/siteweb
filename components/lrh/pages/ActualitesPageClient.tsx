'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LRH, body, mono } from '../tokens';
import {
  HeaderDesktop,
  HeaderMobile,
  FooterDesktop,
  MobileTabBar,
  PageHero,
  StatsRibbon,
  NewsBoard,
  Paginator,
  SeasonToggle,
  MobileSeasonToggle,
  type Mode,
  type StatCell,
} from '../sections';
import type { HomeNewsItem } from '@/lib/queries/home';
import type { NewsCategory } from '@/lib/blog/categories';

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return m;
}

function buildStats(articles: HomeNewsItem[]): StatCell[] {
  const counts: Record<string, number> = {
    ACTUALITE: 0,
    RESULTAT: 0,
    EVENEMENT: 0,
    COMMUNIQUE: 0,
  };
  for (const a of articles) counts[a.category] = (counts[a.category] ?? 0) + 1;

  return [
    {
      kicker: 'Total publié',
      value: articles.length,
      unit: articles.length > 1 ? 'articles' : 'article',
      hint: 'Toutes catégories',
      accent: 'navy',
    },
    {
      kicker: 'Résultats',
      value: counts.RESULTAT,
      unit: counts.RESULTAT > 1 ? 'comptes-rendus' : 'compte-rendu',
      hint: 'Après-matchs',
      accent: 'red',
    },
    {
      kicker: 'Événements',
      value: counts.EVENEMENT,
      unit: 'à venir / passés',
      hint: 'Calendrier vivant',
      accent: 'gold',
    },
    {
      kicker: 'Communiqués',
      value: counts.COMMUNIQUE,
      unit: counts.COMMUNIQUE > 1 ? 'officiels' : 'officiel',
      hint: 'Voix de la ligue',
      accent: 'navy',
    },
  ];
}

export function ActualitesPageClient({
  articles,
  activeCategory,
  heroSubtitle,
  pagination,
}: {
  articles: HomeNewsItem[];
  activeCategory: NewsCategory | null;
  heroSubtitle: string;
  pagination?: { currentPage: number; totalPages: number; totalItems: number };
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');
  const stats = useMemo(() => buildStats(articles), [articles]);

  const totalCount = pagination?.totalItems ?? articles.length;
  const tagLabel = activeCategory
    ? `Filtre actif · ${activeCategory.toLowerCase()}`
    : `${totalCount} publication${totalCount > 1 ? 's' : ''}`;

  const hrefBuilder = (page: number) => {
    const params = new URLSearchParams();
    if (activeCategory) params.set('c', activeCategory);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `/actualites?${qs}` : '/actualites';
  };

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? (
        <HeaderMobile mode={mode} setMode={setMode} />
      ) : (
        <HeaderDesktop mode={mode} setMode={setMode} />
      )}

      <PageHero
        mobileVariant={isMobile}
        index="04"
        kicker="Le fil officiel"
        title={'Les nouvelles\ndu hockey péi.'}
        subtitle={heroSubtitle}
        tag={tagLabel}
        rightSlot={
          isMobile ? (
            <MobileSeasonToggle mode={mode} setMode={setMode} />
          ) : (
            <SeasonToggle mode={mode} setMode={setMode} size="lg" />
          )
        }
      />

      <StatsRibbon cells={stats} mobileVariant={isMobile} />

      <NewsBoard
        articles={articles}
        activeCategory={activeCategory}
        mobileVariant={isMobile}
      />

      {pagination && (
        <Paginator
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          hrefBuilder={hrefBuilder}
          mobileVariant={isMobile}
          itemLabel="article"
        />
      )}

      <div style={{ height: isMobile ? 32 : 60 }} />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
