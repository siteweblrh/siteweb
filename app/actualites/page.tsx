import React from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ArticleCard from "@/components/blog/ArticleCard";
import CategoryFilter from "@/components/blog/CategoryFilter";
import BackToHome from "@/components/lrh/BackToHome";
import { LRH, display, body, mono } from "@/components/lrh/tokens";
import { isNewsCategory } from "@/lib/blog/categories";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Actualités | Ligue Réunionnaise de Hockey",
  description: "Toutes les actualités, résultats et événements de la Ligue Réunionnaise de Hockey et de ses clubs.",
  openGraph: {
    title: "Actualités | LRH",
    description: "Les dernières nouvelles du hockey sur gazon à La Réunion.",
    type: "website",
  },
};

type PageProps = {
  searchParams: Promise<{ c?: string }>;
};

export default async function ActualitesPage({ searchParams }: PageProps) {
  const { c } = await searchParams;
  const category = isNewsCategory(c) ? c : null;

  const articles = await prisma.news.findMany({
    where: {
      published: true,
      ...(category ? { category } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
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
    <main style={{ minHeight: "100vh", background: LRH.paper }}>
      <header
        style={{
          background: LRH.navy,
          color: "#fff",
          padding: "64px 24px 56px",
          borderBottom: "4px solid " + LRH.red,
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <BackToHome />
          </div>
          <div
            style={{
              ...mono,
              fontSize: 11,
              color: LRH.gold,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            ● Le fil officiel
          </div>
          <h1
            style={{
              ...display,
              fontWeight: 800,
              fontSize: 48,
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Actualités
          </h1>
          <p
            style={{
              ...body,
              fontSize: 16,
              color: "rgba(255,255,255,0.75)",
              marginTop: 12,
              maxWidth: 600,
            }}
          >
            Résultats, événements, communiqués — toute la vie du hockey réunionnais.
          </p>
        </div>
      </header>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
        <div style={{ marginBottom: 32 }}>
          <CategoryFilter active={category} />
        </div>

        {articles.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              background: "#fff",
              borderRadius: 16,
              border: "1px solid " + LRH.hair,
            }}
          >
            <p style={{ ...body, fontSize: 16, color: LRH.mute, margin: 0 }}>
              Aucun article publié pour le moment{category ? " dans cette catégorie" : ""}.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 24,
            }}
          >
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
