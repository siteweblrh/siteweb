import React from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isNewsCategory } from "@/lib/blog/categories";
import { getContent } from "@/lib/queries/siteContent";
import { paginate } from "@/lib/utils/paginate";
import { newsCardSelect, toNewsCardItem } from "@/lib/queries/news-card";
import { ActualitesPageClient } from "@/components/lrh/pages/ActualitesPageClient";
import { CACHE_TAGS, cachePublic } from "@/lib/cache/public";
import type { NewsCategory } from "@/lib/blog/categories";

export const revalidate = 600;

const PAGE_SIZE = 12;

// Borne du numéro de page ADMISSIBLE COMME CLÉ DE CACHE. `paginate` borne déjà
// la page à `totalPages`, mais seulement APRÈS la requête : sans ce plafond,
// `?page=99998` et `?page=99999` seraient deux entrées de cache distinctes,
// chacune un réveil de Neon. Un seul robot suffirait à annuler le cache. Avec
// 12 articles par page, 50 pages = 600 articles, très au-delà du besoin réel.
const MAX_CACHEABLE_PAGE = 50;

// ⚠️ `revalidate = 600` ci-dessus est inopérant : `searchParams` rend la page
// dynamique. Seul le cache de données protège Neon. Cf. lib/cache/public.ts.
const loadNews = cachePublic(
  async (category: NewsCategory | null, page: number) => {
    const where = {
      published: true,
      ...(category ? { category } : {}),
    } as const;

    const totalItems = await prisma.news.count({ where });
    const { currentPage, totalPages, skip, take } = paginate({
      page,
      pageSize: PAGE_SIZE,
      total: totalItems,
    });

    const rows = await prisma.news.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take,
      select: newsCardSelect,
    });

    return {
      articles: rows.map(toNewsCardItem),
      pagination: { currentPage, totalPages, totalItems },
    };
  },
  ["actualites:list"],
  [CACHE_TAGS.news],
);

export const metadata: Metadata = {
  title: "Actualités | Ligue Réunionnaise de Hockey",
  description:
    "Toutes les actualités, résultats et événements de la Ligue Réunionnaise de Hockey et de ses clubs.",
  alternates: { canonical: "/actualites" },
  openGraph: {
    title: "Actualités | LRH",
    description: "Les dernières nouvelles du hockey sur gazon à La Réunion.",
    type: "website",
  },
};

type PageProps = {
  searchParams: Promise<{ c?: string; page?: string }>;
};

export default async function ActualitesPage({ searchParams }: PageProps) {
  const { c, page } = await searchParams;
  const category = isNewsCategory(c) ? c : null;

  // Normalisation avant le cache (cf. MAX_CACHEABLE_PAGE).
  const parsedPage = Number.parseInt(page ?? '1', 10);
  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0
      ? Math.min(parsedPage, MAX_CACHEABLE_PAGE)
      : 1;

  const [heroSubtitle, { articles, pagination }] = await Promise.all([
    getContent('hero.actualites.subtitle'),
    loadNews(category, requestedPage),
  ]);

  return (
    <ActualitesPageClient
      articles={articles}
      activeCategory={category}
      heroSubtitle={heroSubtitle}
      pagination={pagination}
    />
  );
}
