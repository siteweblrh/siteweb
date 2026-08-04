'use client';

import React from 'react';
import { LRH, body } from './tokens';
import type { HomeNewsItem, ModeData } from '@/lib/queries/home';
import type { ContentKey } from '@/lib/siteContent';
// ⚠️ Imports directs par module, PAS via le barrel `./sections` — voir
// l'explication détaillée en tête de HomeDesktop.tsx : le barrel réexporte 36
// modules et les faisait tous entrer dans le chunk client de la home.
import { HeaderMobile, type Mode } from './sections/Header';
import { HeroMobile } from './sections/Hero';
import { BentoMobile } from './sections/Bento';
import { CompetitionsMobile } from './sections/Competitions';
import { NewsMobile } from './sections/News';
import { MobileTabBar } from './sections/Footer';

type ContentMap = Record<ContentKey, string>;

export function HomeMobile({ mode, setMode, news, modeData, content }: {
  mode: Mode;
  setMode: (m: Mode) => void;
  news: HomeNewsItem[];
  modeData: ModeData;
  content: ContentMap;
}) {
  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100%' }}>
      <HeaderMobile mode={mode} setMode={setMode} />
      <HeroMobile
        mode={mode}
        featured={modeData.featured}
        headline={mode === 'gazon' ? content['home.hero.headline.gazon'] : content['home.hero.headline.salle']}
        backgroundImage={
          mode === 'gazon'
            ? content['home.hero.background.gazon']
            : content['home.hero.background.salle']
        }
      />
      <BentoMobile mode={mode} lastResult={modeData.lastResult} standingsTop={modeData.standingsTop} playerOfMonth={modeData.playerOfMonth} />
      <CompetitionsMobile upcoming={modeData.upcoming} />
      <NewsMobile news={news} />
      <MobileTabBar />
    </div>
  );
}
