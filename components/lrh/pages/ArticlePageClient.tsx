'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LRH, body, mono, display } from '../tokens';
import {
  HeaderDesktop,
  HeaderMobile,
  FooterDesktop,
  MobileTabBar,
  type Mode,
} from '../sections';
import ArticleBody from '@/components/blog/ArticleBody';
import { getCategoryMeta } from '@/lib/blog/categories';

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

export type ArticlePayload = {
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  category: string;
  publishedAt: Date | null;
  createdAt: Date;
  author: { name: string | null; image: string | null } | null;
  club: { name: string; city: string } | null;
  readingTime: number;
};

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function ArticlePageClient({ article }: { article: ArticlePayload }) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');
  const cat = getCategoryMeta(article.category);
  const date = article.publishedAt ?? article.createdAt;

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? (
        <HeaderMobile mode={mode} setMode={setMode} />
      ) : (
        <HeaderDesktop mode={mode} setMode={setMode} />
      )}

      {/* Hero */}
      <ArticleHero article={article} cat={cat} date={date} mobileVariant={isMobile} />

      {/* Body */}
      <div
        style={{
          background: LRH.paper,
          padding: isMobile ? '24px 16px 48px' : '40px 64px 80px',
        }}
      >
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {/* Breadcrumb / back link */}
          <div style={{ marginBottom: isMobile ? 18 : 26 }}>
            <Link
              href="/actualites"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 14px',
                background: '#fff',
                border: '1px solid ' + LRH.hairStrong,
                color: LRH.red,
                textDecoration: 'none',
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              <span aria-hidden style={{ fontSize: 13 }}>
                ←
              </span>
              Toutes les actualités
            </Link>
          </div>

          {/* Excerpt as editorial lead-in (if exists) */}
          {article.excerpt && (
            <div
              style={{
                background: '#fff',
                border: '1px solid ' + LRH.hair,
                borderLeft: '4px solid ' + LRH.gold,
                padding: isMobile ? '18px 18px' : '24px 28px',
                marginBottom: isMobile ? 22 : 32,
              }}
            >
              <div
                style={{
                  ...mono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: LRH.gold,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                ▸ Le résumé
              </div>
              <p
                style={{
                  ...body,
                  fontSize: isMobile ? 16 : 18,
                  color: LRH.ink2,
                  lineHeight: 1.55,
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                {article.excerpt}
              </p>
            </div>
          )}

          {/* Body container */}
          <div
            style={{
              background: '#fff',
              border: '1px solid ' + LRH.hair,
              borderTop: '3px solid ' + LRH.navy,
              padding: isMobile ? '22px 18px 26px' : '36px 44px 44px',
            }}
          >
            <ArticleBody content={article.content} />
          </div>

          {/* Footer of article: author + meta strip */}
          <div
            style={{
              marginTop: isMobile ? 22 : 32,
              padding: isMobile ? '16px 18px' : '20px 24px',
              background: LRH.paperWarm,
              border: '1px solid ' + LRH.hair,
              borderLeft: '3px solid ' + LRH.red,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                background: LRH.navy,
                color: LRH.gold,
                ...display,
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {(article.author?.name ?? 'LRH').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  ...mono,
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: LRH.mute,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                Auteur
              </div>
              <div
                style={{
                  ...display,
                  fontWeight: 700,
                  fontSize: 15,
                  color: LRH.navy,
                  letterSpacing: '-0.01em',
                  marginTop: 2,
                }}
              >
                {article.author?.name ?? 'Ligue Réunionnaise de Hockey'}
                {article.club && (
                  <span
                    style={{
                      ...mono,
                      fontSize: 11,
                      fontWeight: 600,
                      color: LRH.mute,
                      marginLeft: 10,
                      letterSpacing: '0.06em',
                    }}
                  >
                    · {article.club.name}, {article.club.city}
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/actualites"
              style={{
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                padding: '10px 16px',
                background: LRH.navy,
                color: '#fff',
                textDecoration: 'none',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Continuer →
            </Link>
          </div>
        </div>
      </div>

      <div style={{ height: isMobile ? 24 : 60 }} />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}

function ArticleHero({
  article,
  cat,
  date,
  mobileVariant,
}: {
  article: ArticlePayload;
  cat: ReturnType<typeof getCategoryMeta>;
  date: Date;
  mobileVariant: boolean;
}) {
  const hasCover = Boolean(article.coverImage);

  return (
    <div
      style={{
        position: 'relative',
        background: hasCover
          ? `linear-gradient(180deg, rgba(0,17,34,0.30) 0%, rgba(0,17,34,0.85) 100%), url(${article.coverImage}) center / cover no-repeat`
          : LRH.navy,
        color: '#fff',
        padding: mobileVariant ? '48px 16px 36px' : '88px 64px 56px',
        minHeight: mobileVariant ? 360 : 480,
        overflow: 'hidden',
        borderBottom: '4px solid ' + LRH.gold,
      }}
    >
      {/* Stripe overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(112deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 34px)',
          pointerEvents: 'none',
        }}
      />
      {!hasCover && (
        <div
          style={{
            position: 'absolute',
            top: '-30%',
            right: '-15%',
            width: 580,
            height: 580,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(243,188,28,0.18) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          minHeight: mobileVariant ? 280 : 380,
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        {/* Kicker row : category + date + reading time */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            marginBottom: mobileVariant ? 18 : 24,
          }}
        >
          <span
            style={{
              ...mono,
              fontSize: 10.5,
              fontWeight: 800,
              padding: '5px 11px',
              background: cat.bg,
              color: cat.fg,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {cat.label}
          </span>
          <span
            style={{
              ...mono,
              fontSize: 10.5,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            ● {formatDate(date)}
          </span>
          <span
            style={{
              ...mono,
              fontSize: 10.5,
              fontWeight: 700,
              color: LRH.gold,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            {article.readingTime} min de lecture
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            ...display,
            fontWeight: 800,
            fontSize: mobileVariant ? 32 : 60,
            lineHeight: 1.0,
            margin: 0,
            letterSpacing: '-0.035em',
            color: '#fff',
            textShadow: hasCover ? '0 4px 30px rgba(0,0,0,0.4)' : undefined,
            textWrap: 'balance',
            maxWidth: 980,
          }}
        >
          {article.title}
        </h1>

        {article.club && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: mobileVariant ? 18 : 24,
              padding: '6px 12px 6px 8px',
              background: 'rgba(243,188,28,0.14)',
              border: '1px solid rgba(243,188,28,0.32)',
              alignSelf: 'flex-start',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: LRH.gold,
              }}
            />
            <span
              style={{
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                color: LRH.gold,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Publié par {article.club.name} · {article.club.city}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
