'use client';

import React, { useEffect, useState } from 'react';
import { LRH, body, display, mono } from '../tokens';
import {
  HeaderDesktop, HeaderMobile, FooterDesktop, MobileTabBar,
  PageHero, PratiqueHub,
  SeasonToggle, MobileSeasonToggle,
} from '../sections';
import type { ContentKey } from '@/lib/siteContent';
import { useMode } from '../ModeProvider';

type ContentMap = Record<ContentKey, string>;

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023.98px)');
    const handler = () => setM(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return m;
}

export function PratiquePageClient({
  content,
  heroSubtitle,
}: {
  content: ContentMap;
  heroSubtitle: string;
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useMode();

  const ctaEmail = content['pratique.cta.email'];
  const ctaNote = content['pratique.cta.note'];

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh', overflowX: 'hidden' }}>
      {isMobile ? <HeaderMobile mode={mode} setMode={setMode} /> : <HeaderDesktop mode={mode} setMode={setMode} />}

      <PageHero
        mobileVariant={isMobile}
        index="07"
        kicker="Pratiques · Activités diverses"
        title={"Le hockey,\npour tous."}
        subtitle={heroSubtitle}
        tag="Loisir · Santé · Adapté"
        rightSlot={isMobile ? <MobileSeasonToggle mode={mode} setMode={setMode} /> : <SeasonToggle mode={mode} setMode={setMode} size="lg" />}
      />

      <PratiqueHub content={content} mobileVariant={isMobile} />

      {/* CTA contact partagé */}
      <section style={{
        background: LRH.navy, color: '#fff',
        padding: isMobile ? '36px 16px' : 'clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px)',
        position: 'relative', overflow: 'hidden',
        borderTop: '4px solid ' + LRH.gold,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(112deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 30px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 18,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...mono, fontSize: 10, fontWeight: 800,
              color: LRH.gold, letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}>◆ Commission développement</div>
            <div style={{
              ...display, fontWeight: 800,
              fontSize: isMobile ? 22 : 26,
              color: '#fff', letterSpacing: '-0.02em',
              marginTop: 6, lineHeight: 1.2,
            }}>Une question, un projet ?</div>
            <div style={{
              ...body, fontSize: 13.5,
              color: 'rgba(255,255,255,0.78)',
              marginTop: 8, whiteSpace: 'pre-line', maxWidth: 640,
            }}>{ctaNote}</div>
          </div>
          {ctaEmail && (
            <a
              href={`mailto:${ctaEmail}?subject=Pratiques%20hockey%20-%20LRH`}
              style={{
                ...display, fontWeight: 800,
                fontSize: isMobile ? 13 : 15,
                background: LRH.gold, color: LRH.navy,
                padding: isMobile ? '14px 16px' : '14px 22px',
                textDecoration: 'none',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                textAlign: 'center',
                border: '2px solid ' + LRH.gold,
                wordBreak: 'break-all',
              }}
            >{ctaEmail}</a>
          )}
        </div>
      </section>

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
