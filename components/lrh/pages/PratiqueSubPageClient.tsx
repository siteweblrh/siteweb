'use client';

import React, { useEffect, useState } from 'react';
import { LRH, body } from '../tokens';
import {
  HeaderDesktop, HeaderMobile, FooterDesktop, MobileTabBar,
  PageHero, EditorialBlock, type EditorialSection,
  SeasonToggle, MobileSeasonToggle,
  type Mode,
} from '../sections';

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

export type PratiqueSubPageProps = {
  pageIndex: string;
  kicker: string;
  heroTitle: string;
  heroSubtitle?: string;
  heroTag: string;
  accent: string;
  introTitle: string;
  introBody: string;
  sections: EditorialSection[];
  ctaTitle: string;
  ctaEmail: string;
  ctaNote: string;
  ctaSubject?: string;
};

export function PratiqueSubPageClient(props: PratiqueSubPageProps) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh', overflowX: 'hidden' }}>
      {isMobile ? <HeaderMobile mode={mode} setMode={setMode} /> : <HeaderDesktop mode={mode} setMode={setMode} />}

      <PageHero
        mobileVariant={isMobile}
        index={props.pageIndex}
        kicker={props.kicker}
        title={props.heroTitle}
        subtitle={props.heroSubtitle}
        tag={props.heroTag}
        rightSlot={isMobile ? <MobileSeasonToggle mode={mode} setMode={setMode} /> : <SeasonToggle mode={mode} setMode={setMode} size="lg" />}
      />

      <EditorialBlock
        introTitle={props.introTitle}
        introBody={props.introBody}
        sections={props.sections}
        ctaTitle={props.ctaTitle}
        ctaEmail={props.ctaEmail}
        ctaNote={props.ctaNote}
        ctaSubject={props.ctaSubject}
        accent={props.accent}
        mobileVariant={isMobile}
      />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
