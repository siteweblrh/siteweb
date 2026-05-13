import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ArticleBody from "@/components/blog/ArticleBody";
import BackToHome from "@/components/lrh/BackToHome";
import { LRH, display, body, mono } from "@/components/lrh/tokens";
import { getCategoryMeta } from "@/lib/blog/categories";
import { generateExcerpt, getReadingTimeMinutes } from "@/lib/utils/excerpt";

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

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
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
    twitter: { card: "summary_large_image", title: article.title, description },
  };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function ArticlePage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const article = await loadPublishedArticle(slug);
  if (!article) notFound();

  const cat = getCategoryMeta(article.category);
  const publishedDate = article.publishedAt ?? article.createdAt;
  const readingTime = getReadingTimeMinutes(article.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt ?? generateExcerpt(article.content, 160),
    datePublished: publishedDate.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    image: article.coverImage ?? undefined,
    author: { "@type": "Person", name: article.author?.name ?? "LRH" },
    publisher: {
      "@type": "Organization",
      name: "Ligue Réunionnaise de Hockey",
    },
  };

  return (
    <main style={{ minHeight: "100vh", background: LRH.paper }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {article.coverImage ? (
        <div
          style={{
            width: "100%",
            height: 420,
            background: `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%), url(${article.coverImage}) center / cover no-repeat`,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: 200,
            background: "linear-gradient(135deg, " + LRH.navy + " 0%, " + LRH.navyDeep + " 100%)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 8px, transparent 8px 22px)",
            }}
          />
        </div>
      )}

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <BackToHome variant="paper" />
          <Link
            href="/actualites"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              background: "#fff",
              border: "1px solid " + LRH.hairStrong,
              color: LRH.red,
              textDecoration: "none",
              ...mono,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            <span aria-hidden style={{ fontSize: 13 }}>←</span>
            Toutes les actualités
          </Link>
        </div>

        <header
          style={{
            background: "#fff",
            border: "1px solid " + LRH.hair,
            borderRadius: 16,
            padding: 32,
            marginBottom: 24,
            marginTop: article.coverImage ? -120 : 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <span
              style={{
                background: cat.bg,
                color: cat.fg,
                ...mono,
                fontSize: 10,
                fontWeight: 700,
                padding: "5px 10px",
                borderRadius: 4,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {cat.label}
            </span>
            <span style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {formatDate(publishedDate)} · {readingTime} min de lecture
            </span>
          </div>

          <h1
            style={{
              ...display,
              fontWeight: 800,
              fontSize: 38,
              margin: 0,
              color: LRH.navy,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            {article.title}
          </h1>

          {article.excerpt && (
            <p
              style={{
                ...body,
                fontSize: 18,
                color: LRH.ink2,
                marginTop: 16,
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              {article.excerpt}
            </p>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 20,
              paddingTop: 20,
              borderTop: "1px solid " + LRH.hair,
              ...body,
              fontSize: 14,
              color: LRH.mute,
            }}
          >
            <span>
              Par <strong style={{ color: LRH.navy }}>{article.author?.name ?? "LRH"}</strong>
            </span>
            {article.club && (
              <>
                <span>·</span>
                <span>
                  {article.club.name}, {article.club.city}
                </span>
              </>
            )}
          </div>
        </header>

        <div
          style={{
            background: "#fff",
            border: "1px solid " + LRH.hair,
            borderRadius: 16,
            padding: 40,
          }}
        >
          <ArticleBody content={article.content} />
        </div>
      </article>
    </main>
  );
}
