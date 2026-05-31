import React from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isNewsCategory } from "@/lib/blog/categories";
import { getContent } from "@/lib/queries/siteContent";
import { paginate } from "@/lib/utils/paginate";
import { ActualitesPageClient } from "@/components/lrh/pages/ActualitesPageClient";

export const revalidate = 60;

const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "Actualités | Ligue Réunionnaise de Hockey",
  description:
    "Toutes les actualités, résultats et événements de la Ligue Réunionnaise de Hockey et de ses clubs.",
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

  const heroSubtitle = await getContent('hero.actualites.subtitle');

  const where = {
    published: true,
    ...(category ? { category } : {}),
  } as const;

  const totalItems = await prisma.news.count({ where });
  const { currentPage, totalPages, skip, take } = paginate({ page, pageSize: PAGE_SIZE, total: totalItems });

  const articles = await prisma.news.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip,
    take,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      coverImage: true,
      category: true,
      publishedAt: true,
      createdAt: true,
      club: { select: { name: true, city: true } },
    },
  });

  return (
    <ActualitesPageClient
      articles={articles}
      activeCategory={category}
      heroSubtitle={heroSubtitle}
      pagination={{ currentPage, totalPages, totalItems }}
    />
  );
}
