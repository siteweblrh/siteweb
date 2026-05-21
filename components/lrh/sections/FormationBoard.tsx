'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';
import type { ContentKey } from '@/lib/siteContent';

type ContentMap = Record<ContentKey, string>;

type Diplome = {
  code: 'DF1' | 'DF2' | 'DF3';
  num: string;
  title: string;
  publicVise: string;
  prereq: string;
  format: string;
  validation: string;
};

export function FormationBoard({
  content,
  mobileVariant = false,
}: {
  content: ContentMap;
  mobileVariant?: boolean;
}) {
  const introTitle = content['formation.intro.title'];
  const introBody = content['formation.intro.body'];

  const objectifs = [
    { tag: content['formation.obj1.tag'], text: content['formation.obj1.text'] },
    { tag: content['formation.obj2.tag'], text: content['formation.obj2.text'] },
    { tag: content['formation.obj3.tag'], text: content['formation.obj3.text'] },
  ];

  const diplomes: Diplome[] = [
    {
      code: 'DF1', num: '01',
      title: content['formation.df1.title'],
      publicVise: content['formation.df1.public'],
      prereq: content['formation.df1.prereq'],
      format: content['formation.df1.format'],
      validation: content['formation.df1.validation'],
    },
    {
      code: 'DF2', num: '02',
      title: content['formation.df2.title'],
      publicVise: content['formation.df2.public'],
      prereq: content['formation.df2.prereq'],
      format: content['formation.df2.format'],
      validation: content['formation.df2.validation'],
    },
    {
      code: 'DF3', num: '03',
      title: content['formation.df3.title'],
      publicVise: content['formation.df3.public'],
      prereq: content['formation.df3.prereq'],
      format: content['formation.df3.format'],
      validation: content['formation.df3.validation'],
    },
  ];

  return (
    <div
      id="diplomes"
      style={{
        background: LRH.paper,
        padding: mobileVariant
          ? '40px 16px'
          : 'clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px)',
      }}
    >
      {/* Intro + objectifs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobileVariant ? '1fr' : '1.2fr 1fr',
          gap: mobileVariant ? 28 : 56,
          alignItems: 'flex-start',
          marginBottom: mobileVariant ? 36 : 56,
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
              01 · Académie fédérale
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
          <p
            style={{
              ...body, fontSize: mobileVariant ? 14 : 15.5,
              color: LRH.ink2, marginTop: 22, lineHeight: 1.65,
              maxWidth: 580, whiteSpace: 'pre-line',
            }}
          >
            {introBody}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 1,
            background: LRH.hair,
            border: '1px solid ' + LRH.hair,
          }}
        >
          {objectifs.map((obj, i) => (
            <div
              key={i}
              style={{
                padding: mobileVariant ? '18px 16px' : '20px 22px',
                background: '#fff',
                position: 'relative',
                borderLeft: `3px solid ${i === 0 ? LRH.gold : i === 1 ? LRH.red : LRH.navy}`,
              }}
            >
              <div
                style={{
                  ...mono, fontSize: 9.5, fontWeight: 800,
                  color: i === 0 ? '#B8860B' : i === 1 ? LRH.red : LRH.navy,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                ◉ {obj.tag}
              </div>
              <div
                style={{
                  ...body, fontSize: 13.5, color: LRH.ink2,
                  lineHeight: 1.55, whiteSpace: 'pre-line',
                }}
              >
                {obj.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Header section diplômes */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22 }}>
        <span style={{ width: 28, height: 2, background: LRH.gold }} />
        <span
          style={{
            ...mono, fontSize: 10.5, fontWeight: 700,
            color: LRH.navy, letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          02 · Les trois diplômes fédéraux
        </span>
      </div>

      {/* Diplômes grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobileVariant ? '1fr' : 'repeat(3, 1fr)',
          gap: mobileVariant ? 16 : 'clamp(16px, 2vw, 28px)',
        }}
      >
        {diplomes.map((d) => (
          <article
            key={d.code}
            style={{
              background: '#fff',
              border: '1px solid ' + LRH.hairStrong,
              borderTop: `4px solid ${d.code === 'DF1' ? LRH.gold : d.code === 'DF2' ? LRH.red : LRH.navy}`,
              padding: mobileVariant ? 18 : 22,
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            <header style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span
                style={{
                  ...mono, fontSize: 10, fontWeight: 800,
                  color: d.code === 'DF1' ? '#B8860B' : d.code === 'DF2' ? LRH.red : LRH.navy,
                  letterSpacing: '0.22em',
                }}
              >
                {d.num}
              </span>
              <h3
                style={{
                  ...display, fontWeight: 800,
                  fontSize: mobileVariant ? 20 : 22,
                  color: LRH.navy, margin: 0,
                  letterSpacing: '-0.02em', lineHeight: 1.1,
                }}
              >
                {d.title}
              </h3>
            </header>

            {[
              { label: 'Public visé', value: d.publicVise },
              { label: 'Prérequis', value: d.prereq },
              { label: 'Modalités', value: d.format },
              { label: 'Validation', value: d.validation },
            ].map((row, i) => (
              <div key={i} style={{ borderTop: i === 0 ? 'none' : '1px dashed ' + LRH.hairStrong, paddingTop: i === 0 ? 0 : 12 }}>
                <div
                  style={{
                    ...mono, fontSize: 9.5, fontWeight: 700,
                    color: LRH.mute, letterSpacing: '0.18em',
                    textTransform: 'uppercase', marginBottom: 5,
                  }}
                >
                  ▸ {row.label}
                </div>
                <div
                  style={{
                    ...body, fontSize: 13, color: LRH.ink2,
                    lineHeight: 1.55, whiteSpace: 'pre-line',
                  }}
                >
                  {row.value}
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}
