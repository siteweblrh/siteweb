import React from "react";
import Link from "next/link";
import { LRH, display, body, mono } from "@/components/lrh/tokens";
import { getCategoryMeta } from "@/lib/blog/categories";
import { generateExcerpt } from "@/lib/utils/excerpt";

type CardArticle = {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  category: string;
  publishedAt: Date | null;
  createdAt: Date;
  club?: { name: string; city: string } | null;
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function ArticleCard({ article }: { article: CardArticle }) {
  const cat = getCategoryMeta(article.category);
  const excerpt = article.excerpt ?? generateExcerpt(article.content, 180);
  const date = article.publishedAt ?? article.createdAt;

  return (
    <Link
      href={`/actualites/${article.slug}`}
      style={{
        display: "block",
        background: "#fff",
        border: "1px solid " + LRH.hair,
        borderRadius: 16,
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
    >
      <div
        style={{
          height: 180,
          background: article.coverImage
            ? `url(${article.coverImage}) center / cover no-repeat`
            : "linear-gradient(135deg, #002244 0%, #001022 100%)",
          position: "relative",
        }}
      >
        {!article.coverImage && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 8px, transparent 8px 22px)",
            }}
          />
        )}
        <span
          style={{
            position: "absolute",
            top: 12,
            left: 12,
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
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          {formatDate(date)}
          {article.club && <span> · {article.club.name}</span>}
        </div>

        <h2
          style={{
            ...display,
            fontWeight: 700,
            fontSize: 18,
            color: LRH.navy,
            margin: 0,
            marginBottom: 10,
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
          }}
        >
          {article.title}
        </h2>

        <p
          style={{
            ...body,
            fontSize: 14,
            color: LRH.ink2,
            margin: 0,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {excerpt}
        </p>

        <div style={{ ...mono, fontSize: 11, color: LRH.red, marginTop: 14, fontWeight: 700, letterSpacing: "0.08em" }}>
          LIRE L&apos;ARTICLE →
        </div>
      </div>
    </Link>
  );
}
