'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, mono, display, body } from '../tokens';
import type { ContentKey } from '@/lib/siteContent';

type ContentMap = Record<ContentKey, string>;

type HubCard = {
  href: string;
  tag: string;
  title: string;
  excerpt: string;
  accent: string;
  num: string;
};

/**
 * Hub de la page /pratique — présente les sous-disciplines (loisir, santé, …)
 * sous forme de cartes éditoriales cliquables.
 */
export function PratiqueHub({
  content,
  mobileVariant = false,
}: {
  content: ContentMap;
  mobileVariant?: boolean;
}) {
  const introTitle = content['pratique.intro.title'];
  const introBody = content['pratique.intro.body'];

  const cards: HubCard[] = [
    {
      href: '/pratique/loisir',
      tag: content['pratique.card.loisir.tag'],
      title: content['pratique.card.loisir.title'],
      excerpt: content['pratique.card.loisir.excerpt'],
      accent: LRH.gold,
      num: '01',
    },
    {
      href: '/pratique/sante',
      tag: content['pratique.card.sante.tag'],
      title: content['pratique.card.sante.title'],
      excerpt: content['pratique.card.sante.excerpt'],
      accent: LRH.red,
      num: '02',
    },
  ];

  return (
    <div
      id="formes"
      style={{
        background: LRH.paper,
        padding: mobileVariant
          ? '40px 16px'
          : 'clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px)',
      }}
    >
      {/* Intro narrative */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobileVariant ? '1fr' : '1.2fr 1fr',
          gap: mobileVariant ? 24 : 56,
          alignItems: 'flex-end',
          marginBottom: mobileVariant ? 32 : 48,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ width: 28, height: 2, background: LRH.red }} />
            <span
              style={{
                ...mono, fontSize: 10.5, fontWeight: 700,
                color: LRH.red, letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              01 · Formes de pratique
            </span>
          </div>
          <h2
            style={{
              ...display, fontWeight: 700,
              fontSize: mobileVariant ? 30 : 44,
              color: LRH.navy, margin: 0,
              letterSpacing: '-0.035em', lineHeight: 1.05,
              whiteSpace: 'pre-line',
            }}
          >
            {introTitle}
          </h2>
        </div>
        <p
          style={{
            ...body, fontSize: mobileVariant ? 14 : 15.5,
            color: LRH.ink2, lineHeight: 1.65,
            margin: 0, whiteSpace: 'pre-line',
          }}
        >
          {introBody}
        </p>
      </div>

      {/* Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobileVariant ? '1fr' : 'repeat(2, 1fr)',
          gap: mobileVariant ? 18 : 'clamp(20px, 2.4vw, 36px)',
        }}
      >
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            style={{
              display: 'flex', flexDirection: 'column',
              background: '#fff',
              border: '1px solid ' + LRH.hairStrong,
              borderLeft: `4px solid ${c.accent}`,
              padding: mobileVariant ? 22 : 28,
              textDecoration: 'none',
              color: 'inherit',
              minHeight: mobileVariant ? 'auto' : 280,
              position: 'relative',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,34,68,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
              <span
                style={{
                  ...mono, fontSize: 10, fontWeight: 800,
                  color: c.accent === LRH.gold ? '#B8860B' : c.accent,
                  letterSpacing: '0.22em',
                }}
              >
                {c.num}
              </span>
              <span
                style={{
                  ...mono, fontSize: 10, fontWeight: 700,
                  color: LRH.mute, letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {c.tag}
              </span>
            </div>
            <h3
              style={{
                ...display, fontWeight: 800,
                fontSize: mobileVariant ? 28 : 36,
                color: LRH.navy, margin: 0,
                letterSpacing: '-0.03em', lineHeight: 1.05,
              }}
            >
              {c.title}
            </h3>
            <p
              style={{
                ...body, fontSize: mobileVariant ? 14 : 15,
                color: LRH.ink2, marginTop: 14, marginBottom: 0,
                lineHeight: 1.6, flex: 1, whiteSpace: 'pre-line',
              }}
            >
              {c.excerpt}
            </p>
            <div
              style={{
                marginTop: 20,
                display: 'flex', alignItems: 'center', gap: 8,
                ...mono, fontSize: 11, fontWeight: 700,
                color: LRH.navy, letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              <span>En savoir plus</span>
              <span style={{ display: 'inline-block', transform: 'translateY(-1px)' }}>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
