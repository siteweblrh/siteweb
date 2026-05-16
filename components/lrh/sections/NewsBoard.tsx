'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, mono, body } from '../tokens';
import { NewsCard } from './News';
import { NEWS_CATEGORIES, type NewsCategory } from '@/lib/blog/categories';
import type { HomeNewsItem } from '@/lib/queries/home';

export function NewsBoard({
  articles,
  activeCategory,
  mobileVariant = false,
}: {
  articles: HomeNewsItem[];
  activeCategory: NewsCategory | null;
  mobileVariant?: boolean;
}) {
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div style={{ background: LRH.paper }}>
      {/* Category filter sticky */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid ' + LRH.hair,
          padding: mobileVariant ? '14px 16px' : '18px 64px',
          position: 'sticky',
          top: 0,
          zIndex: 4,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <span
          style={{
            ...mono,
            fontSize: 10,
            fontWeight: 700,
            color: LRH.mute,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginRight: 6,
          }}
        >
          ▸ Filtrer
        </span>
        <CategoryChip active={activeCategory === null} label="Tous" href="/actualites" />
        {NEWS_CATEGORIES.map((c) => (
          <CategoryChip
            key={c.value}
            active={activeCategory === c.value}
            label={c.label}
            href={`/actualites?c=${c.value}`}
            bg={c.bg}
            fg={c.fg}
          />
        ))}
      </div>

      {articles.length === 0 ? (
        <div
          style={{
            padding: mobileVariant ? '48px 16px' : '80px 64px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: 11,
              color: LRH.mute,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            [ aucun article ]
          </div>
          <div
            style={{
              ...body,
              fontSize: 14,
              color: LRH.ink2,
              marginTop: 12,
              maxWidth: 460,
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.5,
            }}
          >
            Aucun article publié pour le moment
            {activeCategory ? ' dans cette catégorie' : ''}.
          </div>
        </div>
      ) : (
        <>
          {/* Featured article — full width hero card */}
          {featured && (
            <div
              style={{
                background: LRH.paperWarm,
                padding: mobileVariant ? '24px 16px 8px' : '40px 64px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ width: 22, height: 2, background: LRH.gold }} />
                <span
                  style={{
                    ...mono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: LRH.gold,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                  }}
                >
                  ★ À la une
                </span>
                <span style={{ flex: 1, height: 1, background: LRH.hair }} />
              </div>
              <FeaturedNewsCard item={featured} mobileVariant={mobileVariant} />
            </div>
          )}

          {/* Rest of the grid */}
          {rest.length > 0 && (
            <div
              style={{
                padding: mobileVariant ? '28px 16px 56px' : '40px 64px 80px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <span style={{ width: 22, height: 2, background: LRH.red }} />
                <span
                  style={{
                    ...mono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: LRH.red,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                  }}
                >
                  Toutes les publications · {rest.length}
                </span>
                <span style={{ flex: 1, height: 1, background: LRH.hair }} />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: mobileVariant
                    ? '1fr'
                    : 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: mobileVariant ? 16 : 20,
                }}
              >
                {rest.map((a) => (
                  <NewsCard
                    key={a.id}
                    item={a}
                    variant={mobileVariant ? 'mobile' : 'desktop'}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  label,
  href,
  bg,
  fg,
}: {
  active: boolean;
  label: string;
  href: string;
  bg?: string;
  fg?: string;
}) {
  return (
    <Link
      href={href}
      style={{
        ...mono,
        fontSize: 10.5,
        fontWeight: 700,
        padding: '7px 14px',
        background: active ? bg ?? LRH.navy : '#fff',
        color: active ? fg ?? '#fff' : LRH.navy,
        border: '1px solid ' + (active ? bg ?? LRH.navy : LRH.hairStrong),
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        display: 'inline-block',
      }}
    >
      {label}
    </Link>
  );
}

function FeaturedNewsCard({
  item,
  mobileVariant,
}: {
  item: HomeNewsItem;
  mobileVariant: boolean;
}) {
  // Réutilise NewsCard avec big=true mais dans un cadre dédié "à la une".
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <NewsCard
        item={item}
        big
        variant={mobileVariant ? 'mobile' : 'desktop'}
      />
    </div>
  );
}
