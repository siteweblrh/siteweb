'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';

export type EditorialSection = {
  num: string;
  title: string;
  body: string;
};

/**
 * Layout éditorial générique pour les pages de contenu pur (Hockey Loisirs,
 * Hockey Santé, futur Sport Adapté, etc.). Intro + sections numérotées + CTA.
 *
 * Toutes les valeurs viennent du SiteContent depuis la page wrapper — ce
 * composant ne fait que la mise en forme.
 */
export function EditorialBlock({
  introTitle,
  introBody,
  sections,
  ctaTitle,
  ctaEmail,
  ctaNote,
  ctaSubject,
  accent = LRH.red,
  mobileVariant = false,
}: {
  introTitle: string;
  introBody: string;
  sections: EditorialSection[];
  ctaTitle: string;
  ctaEmail: string;
  ctaNote: string;
  ctaSubject?: string;
  /** Couleur d'accent (border-left des cartes). Default red. */
  accent?: string;
  mobileVariant?: boolean;
}) {
  return (
    <>
      {/* Intro */}
      <section
        style={{
          background: LRH.paper,
          padding: mobileVariant
            ? '40px 16px'
            : 'clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobileVariant ? '1fr' : '1.2fr 1fr',
            gap: mobileVariant ? 24 : 56,
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ width: 28, height: 2, background: accent }} />
              <span
                style={{
                  ...mono, fontSize: 10.5, fontWeight: 700,
                  color: accent, letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                }}
              >
                01 · Présentation
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
      </section>

      {/* Sections numérotées */}
      <section
        style={{
          background: '#fff',
          borderTop: '1px solid ' + LRH.hair,
          padding: mobileVariant
            ? '36px 16px'
            : 'clamp(48px, 6vw, 72px) clamp(24px, 5vw, 64px)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobileVariant ? '1fr' : 'repeat(3, 1fr)',
            gap: mobileVariant ? 22 : 'clamp(20px, 2.4vw, 36px)',
          }}
        >
          {sections.map((s, i) => (
            <article
              key={i}
              style={{
                background: LRH.paper,
                border: '1px solid ' + LRH.hair,
                borderTop: `3px solid ${accent}`,
                padding: mobileVariant ? 18 : 24,
              }}
            >
              <div
                style={{
                  ...mono, fontSize: 10, fontWeight: 800,
                  color: accent, letterSpacing: '0.22em',
                  marginBottom: 10,
                }}
              >
                {s.num}
              </div>
              <h3
                style={{
                  ...display, fontWeight: 800,
                  fontSize: mobileVariant ? 20 : 22,
                  color: LRH.navy, margin: 0,
                  letterSpacing: '-0.02em', lineHeight: 1.15,
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  ...body, fontSize: 14,
                  color: LRH.ink2, marginTop: 12, marginBottom: 0,
                  lineHeight: 1.65, whiteSpace: 'pre-line',
                }}
              >
                {s.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA navy uniforme */}
      <section
        style={{
          background: LRH.navy, color: '#fff',
          padding: mobileVariant
            ? '36px 16px'
            : 'clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px)',
          position: 'relative', overflow: 'hidden',
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
            position: 'relative',
            display: 'flex',
            flexDirection: mobileVariant ? 'column' : 'row',
            alignItems: mobileVariant ? 'stretch' : 'center',
            gap: 18,
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
              ◆ Contact
            </div>
            <div
              style={{
                ...display, fontWeight: 800,
                fontSize: mobileVariant ? 22 : 26,
                color: '#fff', letterSpacing: '-0.02em',
                marginTop: 6, lineHeight: 1.2,
                whiteSpace: 'pre-line',
              }}
            >
              {ctaTitle}
            </div>
            <div
              style={{
                ...body, fontSize: 13.5,
                color: 'rgba(255,255,255,0.78)',
                marginTop: 8, whiteSpace: 'pre-line', maxWidth: 640,
              }}
            >
              {ctaNote}
            </div>
          </div>
          {ctaEmail && (
            <a
              href={`mailto:${ctaEmail}${ctaSubject ? `?subject=${encodeURIComponent(ctaSubject)}` : ''}`}
              style={{
                ...display, fontWeight: 800,
                fontSize: mobileVariant ? 13 : 15,
                background: LRH.gold, color: LRH.navy,
                padding: mobileVariant ? '14px 16px' : '14px 22px',
                textDecoration: 'none',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                textAlign: 'center',
                border: '2px solid ' + LRH.gold,
                wordBreak: 'break-all',
              }}
            >
              {ctaEmail}
            </a>
          )}
        </div>
      </section>
    </>
  );
}
