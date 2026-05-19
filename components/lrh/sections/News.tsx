'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, mono, display, body, ImageSlot } from '../tokens';
import { getCategoryMeta } from '@/lib/blog/categories';
import { generateExcerpt, getReadingTimeMinutes } from '@/lib/utils/excerpt';
import { optimizeImageUrl } from '@/lib/utils/image-url';
import type { HomeNewsItem } from '@/lib/queries/home';
import { SectionHeading, MobileSectionLabel, MobileSectionTitle } from './SectionHeading';

const CATEGORY_TONE: Record<string, 'sun' | 'turf' | 'indoor' | 'paper' | 'navy'> = {
  ACTUALITE: 'sun',
  RESULTAT: 'turf',
  EVENEMENT: 'indoor',
  COMMUNIQUE: 'paper',
};

export function NewsCard({ item, big, variant = 'desktop' }: {
  item: HomeNewsItem;
  big?: boolean;
  variant?: 'desktop' | 'mobile';
}) {
  const cat = getCategoryMeta(item.category);
  const tone = CATEGORY_TONE[item.category] ?? 'sun';
  const minutes = getReadingTimeMinutes(item.content);
  const isMobile = variant === 'mobile';
  const imageHeight = isMobile ? (big ? 200 : 140) : (big ? 320 : 200);
  const excerpt = !isMobile ? (item.excerpt ?? generateExcerpt(item.content, big ? 180 : 110)) : null;

  return (
    <Link href={`/actualites/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid ' + LRH.hair,
          borderTop: `3px solid ${cat.bg}`,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          height: '100%',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 22px rgba(0,34,68,0.10)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      >
        {item.coverImage ? (
          // optimizeImageUrl injecte f_auto,q_auto,w_<width> sur les URLs
          // Cloudinary legacy. Width adapté à la card (big mobile/desktop).
          <div style={{ height: imageHeight, background: `url(${optimizeImageUrl(item.coverImage, isMobile ? 640 : (big ? 960 : 480))}) center / cover no-repeat` }} />
        ) : (
          <ImageSlot label={cat.label} height={imageHeight} tone={tone} radius={0} />
        )}
        <div style={{ padding: isMobile ? 18 : 22, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 10 : 14 }}>
            <div style={{
              padding: isMobile ? '3px 8px' : '4px 10px',
              background: cat.bg, color: cat.fg,
              ...mono, fontSize: isMobile ? 8.5 : 9,
              letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
            }}>{cat.label}</div>
            <div style={{ ...mono, fontSize: isMobile ? 9 : 10, color: LRH.mute, letterSpacing: '0.08em' }}>
              ● {minutes.toString().padStart(2, '0')} min{isMobile ? '' : ' de lecture'}
            </div>
          </div>
          <h3 style={{
            ...display, fontWeight: 700,
            fontSize: isMobile ? (big ? 22 : 18) : (big ? 32 : 22),
            color: LRH.navy, margin: 0,
            letterSpacing: '-0.02em', lineHeight: isMobile ? 1.15 : 1.1,
            textWrap: 'balance',
          }}>{item.title}</h3>
          {excerpt && (
            <div style={{ ...body, fontSize: 13.5, color: LRH.ink2, marginTop: 12, lineHeight: 1.55 }}>{excerpt}</div>
          )}
          <div style={{ flex: 1 }} />
          {item.club && (
            <div style={{
              marginTop: isMobile ? 14 : 20, paddingTop: isMobile ? 10 : 14,
              borderTop: '1px dashed ' + LRH.hairStrong,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ ...mono, fontSize: isMobile ? 9 : 9.5, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Publié par
              </span>
              <span style={{ ...display, fontWeight: 800, fontSize: isMobile ? 11 : 12, color: LRH.navy, letterSpacing: '0.04em' }}>
                {item.club.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function NewsDesktop({ news }: { news: HomeNewsItem[] }) {
  if (news.length === 0) {
    return (
      <div style={{ padding: 'clamp(28px, 4vw, 32px) clamp(20px, 4.5vw, 64px) clamp(48px, 7vw, 80px)', background: LRH.paper }}>
        <SectionHeading
          kicker="02 · L'actualité"
          title="Le terrain raconte<br/>plus que le score."
          action="Toute l'actualité"
          actionHref="/actualites"
        />
        <div style={{
          marginTop: 32, padding: 48, textAlign: 'center',
          background: '#fff', border: '1px solid ' + LRH.hair,
        }}>
          <p style={{ ...body, fontSize: 14, color: LRH.mute, margin: 0 }}>Aucune actualité publiée pour le moment.</p>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: 'clamp(28px, 4vw, 32px) clamp(20px, 4.5vw, 64px) clamp(48px, 7vw, 80px)', background: LRH.paper }}>
      <SectionHeading
        kicker="02 · L'actualité"
        title="Le terrain raconte<br/>plus que le score."
        action="Toute l'actualité"
        actionHref="/actualites"
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(14px, 1.6vw, 20px)', marginTop: 32 }}>
        {news.map((item, i) => <NewsCard key={item.id} item={item} big={i === 0} variant="desktop" />)}
      </div>
    </div>
  );
}

export function NewsMobile({ news }: { news: HomeNewsItem[] }) {
  return (
    <div style={{ padding: '40px 16px 16px', background: LRH.paper }}>
      <MobileSectionLabel kicker="03 · Actualités" action="Voir tout" actionHref="/actualites" />
      <MobileSectionTitle>Le terrain raconte<br/>plus que le score.</MobileSectionTitle>
      {news.length === 0 ? (
        <div style={{
          marginTop: 22, padding: 24, background: '#fff',
          border: '1px solid ' + LRH.hair, textAlign: 'center',
        }}>
          <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: 0 }}>Aucune actualité publiée pour le moment.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
          {news.map((item, i) => <NewsCard key={item.id} item={item} big={i === 0} variant="mobile" />)}
        </div>
      )}
    </div>
  );
}
