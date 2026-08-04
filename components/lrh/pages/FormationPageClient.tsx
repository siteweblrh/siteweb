'use client';

import React, { useEffect, useState } from 'react';
import { LRH, body, mono } from '../tokens';
import {
  HeaderDesktop, HeaderMobile, FooterDesktop, MobileTabBar,
  PageHero, FormationBoard, BecomeFormerBlock,
  SeasonToggle, MobileSeasonToggle,
  type Mode,
} from '../sections';
import type { ContentKey } from '@/lib/siteContent';
import { currentSeasonLabel } from '@/lib/utils/season';

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

function AnchorRail({ items, mobileVariant }: { items: { id: string; label: string }[]; mobileVariant: boolean }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 5,
      background: LRH.paper,
      borderBottom: '1px solid ' + LRH.hair,
      padding: mobileVariant ? '12px 16px' : '14px 64px',
      display: 'flex', alignItems: 'center', gap: 18,
      overflowX: 'auto',
      backdropFilter: 'saturate(140%) blur(8px)',
      WebkitBackdropFilter: 'saturate(140%) blur(8px)',
    }}>
      <span style={{
        ...mono, fontSize: 10, fontWeight: 700,
        color: LRH.mute, letterSpacing: '0.18em',
        textTransform: 'uppercase', flexShrink: 0,
      }}>▸ Sur cette page</span>
      <div style={{ display: 'flex', gap: 22 }}>
        {items.map((it, i) => (
          <a key={it.id} href={`#${it.id}`} style={{
            ...body, fontSize: 12.5, fontWeight: 700,
            color: LRH.navy, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              ...mono, fontSize: 9.5, fontWeight: 700,
              color: LRH.red, letterSpacing: '0.1em',
            }}>{(i + 1).toString().padStart(2, '0')}</span>
            {it.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function FormationPageClient({
  content,
  heroSubtitle,
}: {
  content: ContentMap;
  heroSubtitle: string;
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh', overflowX: 'hidden' }}>
      {isMobile ? <HeaderMobile mode={mode} setMode={setMode} /> : <HeaderDesktop mode={mode} setMode={setMode} />}

      <PageHero
        mobileVariant={isMobile}
        index="06"
        kicker="Académie · Formation fédérale"
        title={"Former\nles cadres."}
        subtitle={heroSubtitle}
        tag={`DF1 · DF2 · DF3 · Saison ${currentSeasonLabel()}`}
        rightSlot={isMobile ? <MobileSeasonToggle mode={mode} setMode={setMode} /> : <SeasonToggle mode={mode} setMode={setMode} size="lg" />}
      />

      <AnchorRail
        mobileVariant={isMobile}
        items={[
          { id: 'diplomes', label: 'Diplômes fédéraux' },
          { id: 'formateur', label: 'Devenir formateur' },
        ]}
      />

      <FormationBoard content={content} mobileVariant={isMobile} />
      <BecomeFormerBlock content={content} mobileVariant={isMobile} />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
