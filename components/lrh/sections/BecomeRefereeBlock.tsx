'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';
import type { ContentKey } from '@/lib/siteContent';

// Le bloc consomme uniquement les clés "arbitrage.path.*" mais accepte le
// ContentMap complet pour simplifier l'injection depuis la page.
type ContentMap = Record<ContentKey, string>;

export function BecomeRefereeBlock({
  mobileVariant = false,
  content,
}: {
  mobileVariant?: boolean;
  content: ContentMap;
}) {
  const title = content['arbitrage.path.title'];
  const intro = content['arbitrage.path.intro'];
  const ctaTitle = content['arbitrage.path.cta.title'];
  const ctaNote = content['arbitrage.path.cta.note'];
  const ctaEmail = content['arbitrage.path.cta.email'];

  const why = [
    { tag: content['arbitrage.path.why1.tag'], text: content['arbitrage.path.why1.text'] },
    { tag: content['arbitrage.path.why2.tag'], text: content['arbitrage.path.why2.text'] },
    { tag: content['arbitrage.path.why3.tag'], text: content['arbitrage.path.why3.text'] },
  ];

  const steps = [
    { num: '01', title: content['arbitrage.path.step1.title'], desc: content['arbitrage.path.step1.desc'] },
    { num: '02', title: content['arbitrage.path.step2.title'], desc: content['arbitrage.path.step2.desc'] },
    { num: '03', title: content['arbitrage.path.step3.title'], desc: content['arbitrage.path.step3.desc'] },
    { num: '04', title: content['arbitrage.path.step4.title'], desc: content['arbitrage.path.step4.desc'] },
  ];

  return (
    <div
      style={{
        background: LRH.navy,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        padding: mobileVariant
          ? '40px 16px'
          : 'clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px)',
        borderTop: '4px solid ' + LRH.gold,
      }}
    >
      {/* Diagonal stripe pattern signature */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(112deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 30px)',
          pointerEvents: 'none',
        }}
      />
      {/* Gold spotlight */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '60%',
          height: '80%',
          background: 'radial-gradient(circle, rgba(243,188,28,0.18) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
          <span style={{ width: 28, height: 2, background: LRH.gold }} />
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
            08 · Rejoindre le corps arbitral
          </span>
        </div>

        <h2
          style={{
            ...display,
            fontWeight: 800,
            fontSize: mobileVariant ? 36 : 'clamp(40px, 5.5vw, 64px)',
            color: '#fff',
            letterSpacing: '-0.04em',
            lineHeight: 0.95,
            margin: 0,
            whiteSpace: 'pre-line',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            ...body,
            fontSize: mobileVariant ? 14 : 16,
            color: 'rgba(255,255,255,0.78)',
            maxWidth: 720,
            marginTop: 16,
            lineHeight: 1.55,
            whiteSpace: 'pre-line',
          }}
        >
          {intro}
        </p>

        {/* Pourquoi */}
        <div
          style={{
            marginTop: mobileVariant ? 28 : 36,
            display: 'grid',
            gridTemplateColumns: mobileVariant ? '1fr' : 'repeat(3, 1fr)',
            gap: mobileVariant ? 14 : 'clamp(14px, 1.6vw, 24px)',
          }}
        >
          {why.map((w, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderLeft: `3px solid ${LRH.gold}`,
                padding: mobileVariant ? 14 : 18,
              }}
            >
              <div
                style={{
                  ...mono,
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: LRH.gold,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                ◉ {w.tag}
              </div>
              <div
                style={{
                  ...body,
                  fontSize: 13.5,
                  color: 'rgba(255,255,255,0.86)',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line',
                }}
              >
                {w.text}
              </div>
            </div>
          ))}
        </div>

        {/* Parcours */}
        <div
          style={{
            marginTop: mobileVariant ? 36 : 48,
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <span style={{ width: 18, height: 1, background: LRH.gold }} />
          <span
            style={{
              ...mono,
              fontSize: 10,
              fontWeight: 700,
              color: LRH.gold,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Parcours type
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobileVariant ? '1fr' : 'repeat(4, 1fr)',
            gap: mobileVariant ? 12 : 'clamp(12px, 1.4vw, 20px)',
          }}
        >
          {steps.map((s, i) => (
            <div
              key={s.num}
              style={{
                position: 'relative',
                paddingTop: 12,
                borderTop: '2px solid ' + (i === 0 ? LRH.gold : 'rgba(255,255,255,0.18)'),
              }}
            >
              <div
                style={{
                  ...mono,
                  fontSize: 10,
                  fontWeight: 800,
                  color: LRH.gold,
                  letterSpacing: '0.22em',
                  marginBottom: 6,
                }}
              >
                {s.num}
              </div>
              <div
                style={{
                  ...display,
                  fontWeight: 800,
                  fontSize: mobileVariant ? 17 : 18,
                  color: '#fff',
                  letterSpacing: '-0.015em',
                  marginBottom: 6,
                }}
              >
                {s.title}
              </div>
              <div
                style={{
                  ...body,
                  fontSize: 12.5,
                  color: 'rgba(255,255,255,0.72)',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line',
                }}
              >
                {s.desc}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: mobileVariant ? 32 : 44,
            display: 'flex',
            flexDirection: mobileVariant ? 'column' : 'row',
            gap: 14,
            alignItems: mobileVariant ? 'stretch' : 'center',
            background: 'rgba(243,188,28,0.08)',
            border: '1px solid rgba(243,188,28,0.32)',
            padding: mobileVariant ? 18 : 24,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                ...mono,
                fontSize: 10,
                fontWeight: 800,
                color: LRH.gold,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              ◆ Comment postuler
            </div>
            <div
              style={{
                ...display,
                fontWeight: 800,
                fontSize: mobileVariant ? 20 : 24,
                color: '#fff',
                letterSpacing: '-0.02em',
                marginTop: 6,
                lineHeight: 1.2,
                whiteSpace: 'pre-line',
              }}
            >
              {ctaTitle}
            </div>
            <div
              style={{
                ...body,
                fontSize: 13,
                color: 'rgba(255,255,255,0.72)',
                marginTop: 6,
                whiteSpace: 'pre-line',
              }}
            >
              {ctaNote}
            </div>
          </div>
          {ctaEmail && (
            <a
              href={`mailto:${ctaEmail}?subject=Candidature%20arbitrage`}
              style={{
                ...display,
                fontWeight: 800,
                fontSize: mobileVariant ? 14 : 15,
                background: LRH.gold,
                color: LRH.navy,
                padding: '14px 22px',
                textDecoration: 'none',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                border: '2px solid ' + LRH.gold,
                transition: 'background 0.2s',
              }}
            >
              {ctaEmail}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
