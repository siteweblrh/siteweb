'use client';

import React, { useEffect, useState } from 'react';
import { LRH, mono, display, body } from '../tokens';
import {
  HeaderDesktop,
  HeaderMobile,
  FooterDesktop,
  MobileTabBar,
  PageHero,
  LicenceDirectory,
  SeasonToggle,
  MobileSeasonToggle,
  type Mode,
} from '../sections';
import type { DirectoryClub } from '@/lib/queries/club';

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return m;
}

export function LicencePageClient({
  clubs,
  heroSubtitle,
  introText,
}: {
  clubs: DirectoryClub[];
  heroSubtitle: string;
  introText: string;
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? (
        <HeaderMobile mode={mode} setMode={setMode} />
      ) : (
        <HeaderDesktop mode={mode} setMode={setMode} />
      )}

      <PageHero
        mobileVariant={isMobile}
        index="07"
        kicker="S'engager dans un club"
        title={'Prendre\nsa licence.'}
        subtitle={heroSubtitle}
        tag={`${clubs.length} club${clubs.length > 1 ? 's' : ''} affilié${clubs.length > 1 ? 's' : ''} à la Ligue`}
        rightSlot={
          isMobile ? (
            <MobileSeasonToggle mode={mode} setMode={setMode} />
          ) : (
            <SeasonToggle mode={mode} setMode={setMode} size="lg" />
          )
        }
      />

      {/* Intro */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid ' + LRH.hair,
          padding: isMobile
            ? '24px 16px'
            : 'clamp(28px, 3.5vw, 44px) clamp(24px, 5vw, 64px)',
        }}
      >
        <div style={{ maxWidth: 820 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
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
              ◉ Comment ça fonctionne
            </span>
          </div>
          <p
            style={{
              ...body,
              fontSize: isMobile ? 14 : 15.5,
              color: LRH.ink2,
              lineHeight: 1.65,
              margin: 0,
              whiteSpace: 'pre-line',
            }}
          >
            {introText}
          </p>
        </div>
      </div>

      <LicenceDirectory clubs={clubs} mobileVariant={isMobile} />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
