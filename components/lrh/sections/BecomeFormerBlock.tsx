'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';
import type { ContentKey } from '@/lib/siteContent';

type ContentMap = Record<ContentKey, string>;

/**
 * Bloc « Devenir formateur ligue » sur /formation. Inspiré de
 * BecomeRefereeBlock — bandeau navy + diplôme/prérequis FFH + CTA.
 */
export function BecomeFormerBlock({
  content,
  mobileVariant = false,
}: {
  content: ContentMap;
  mobileVariant?: boolean;
}) {
  const title = content['formation.former.title'];
  const intro = content['formation.former.intro'];
  const ctaTitle = content['formation.cta.title'];
  const ctaNote = content['formation.cta.note'];
  const ctaEmail = content['formation.cta.email'];

  const prereqs = [
    { num: '01', text: content['formation.former.prereq1'] },
    { num: '02', text: content['formation.former.prereq2'] },
    { num: '03', text: content['formation.former.prereq3'] },
  ];

  return (
    <div
      id="formateur"
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
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'repeating-linear-gradient(112deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 30px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-20%', right: '-10%',
          width: '60%', height: '80%',
          background: 'radial-gradient(circle, rgba(243,188,28,0.18) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
          <span style={{ width: 28, height: 2, background: LRH.gold }} />
          <span
            style={{
              ...mono, fontSize: 10.5, fontWeight: 700,
              color: LRH.gold, letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            03 · Devenir formateur
          </span>
        </div>

        <h2
          style={{
            ...display, fontWeight: 800,
            fontSize: mobileVariant ? 36 : 'clamp(40px, 5.5vw, 64px)',
            color: '#fff', letterSpacing: '-0.04em',
            lineHeight: 0.95, margin: 0,
            whiteSpace: 'pre-line',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            ...body, fontSize: mobileVariant ? 14 : 16,
            color: 'rgba(255,255,255,0.78)',
            maxWidth: 760, marginTop: 16, lineHeight: 1.55,
            whiteSpace: 'pre-line',
          }}
        >
          {intro}
        </p>

        {/* Prérequis - timeline numérotée */}
        <div
          style={{
            marginTop: mobileVariant ? 32 : 44,
            display: 'flex', alignItems: 'baseline', gap: 12,
            marginBottom: 18,
          }}
        >
          <span style={{ width: 18, height: 1, background: LRH.gold }} />
          <span
            style={{
              ...mono, fontSize: 10, fontWeight: 700,
              color: LRH.gold, letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Prérequis fédéraux
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobileVariant ? '1fr' : 'repeat(3, 1fr)',
            gap: mobileVariant ? 12 : 'clamp(12px, 1.6vw, 22px)',
          }}
        >
          {prereqs.map((p, i) => (
            <div
              key={p.num}
              style={{
                position: 'relative',
                paddingTop: 12,
                borderTop: '2px solid ' + (i === 0 ? LRH.gold : 'rgba(255,255,255,0.18)'),
              }}
            >
              <div
                style={{
                  ...mono, fontSize: 10, fontWeight: 800,
                  color: LRH.gold, letterSpacing: '0.22em',
                  marginBottom: 8,
                }}
              >
                {p.num}
              </div>
              <div
                style={{
                  ...body, fontSize: 13.5,
                  color: 'rgba(255,255,255,0.86)',
                  lineHeight: 1.6, whiteSpace: 'pre-line',
                }}
              >
                {p.text}
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                ...mono, fontSize: 10, fontWeight: 800,
                color: LRH.gold, letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              ◆ Commission formation
            </div>
            <div
              style={{
                ...display, fontWeight: 800,
                fontSize: mobileVariant ? 20 : 24,
                color: '#fff', letterSpacing: '-0.02em',
                marginTop: 6, lineHeight: 1.2,
                whiteSpace: 'pre-line',
              }}
            >
              {ctaTitle}
            </div>
            <div
              style={{
                ...body, fontSize: 13,
                color: 'rgba(255,255,255,0.72)',
                marginTop: 6, whiteSpace: 'pre-line',
              }}
            >
              {ctaNote}
            </div>
          </div>
          {ctaEmail && (
            <a
              href={`mailto:${ctaEmail}?subject=Formation%20f%C3%A9d%C3%A9rale%20-%20Ligue%20R%C3%A9unionnaise`}
              style={{
                ...display, fontWeight: 800,
                fontSize: mobileVariant ? 13 : 15,
                background: LRH.gold, color: LRH.navy,
                padding: mobileVariant ? '14px 16px' : '14px 22px',
                textDecoration: 'none',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                textAlign: 'center',
                border: '2px solid ' + LRH.gold,
                transition: 'background 0.2s',
                wordBreak: 'break-all',
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
