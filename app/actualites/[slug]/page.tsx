import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateExcerpt, getReadingTimeMinutes } from "@/lib/utils/excerpt";
import { ArticlePageClient } from "@/components/lrh/pages/ArticlePageClient";
import { JsonLd } from "@/components/lrh/seo/JsonLd";
import { newsArticleJsonLd, breadcrumbListJsonLd } from "@/lib/seo/jsonLd";

export const revalidate = 60;
export const dynamicParams = true;

type RouteParams = { slug: string };

async function loadPublishedArticle(slug: string) {
  return prisma.news.findFirst({
    where: { slug, published: true },
    include: {
      author: { select: { name: true, image: true } },
      club: { select: { name: true, city: true } },
    },
  });
}

export async function generateStaticParams() {
  const articles = await prisma.news.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadPublishedArticle(slug);
  if (!article) return { title: "Article introuvable" };

  const description = article.excerpt ?? generateExcerpt(article.content, 160);
  return {
    title: `${article.title} | LRH`,
    description,
    alternates: { canonical: `/actualites/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      publishedTime: (article.publishedAt ?? article.createdAt).toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      images: article.coverImage ? [{ url: article.coverImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const article = await loadPublishedArticle(slug);
  if (!article) notFound();

  const publishedDate = article.publishedAt ?? article.createdAt;
  const readingTime = getReadingTimeMinutes(article.content);
  const description = article.excerpt ?? generateExcerpt(article.content, 160);

  return (
    <>
      <JsonLd
        data={newsArticleJsonLd({
          slug: article.slug,
          title: article.title,
          description,
          coverImage: article.coverImage,
          publishedAt: publishedDate,
          updatedAt: article.updatedAt,
          authorName: article.author?.name,
        })}
      />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: 'Accueil', url: '/' },
          { name: 'Actualités', url: '/actualites' },
          { name: article.title, url: `/actualites/${article.slug}` },
        ])}
      />
      <ArticlePageClient
        article={{
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
          coverImage: article.coverImage,
          category: article.category,
          publishedAt: article.publishedAt,
          createdAt: article.createdAt,
          author: article.author
            ? { name: article.author.name, image: article.author.image }
            : null,
          club: article.club,
          readingTime,
        }}
      />
    </>
  );
}
