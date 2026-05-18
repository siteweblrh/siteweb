'use client';

import React from 'react';
import { LRH, body } from './tokens';
import type { HomeNewsItem, ModeData } from '@/lib/queries/home';
import type { ContentKey } from '@/lib/siteContent';
import {
  HeaderMobile,
  HeroMobile,
  BentoMobile,
  CompetitionsMobile,
  NewsMobile,
  MobileTabBar,
  type Mode,
} from './sections';

type ContentMap = Record<ContentKey, string>;

export function HomeMobile({ mode, setMode, news, modeData, content, season }: {
  mode: Mode;
  setMode: (m: Mode) => void;
  news: HomeNewsItem[];
  modeData: ModeData;
  content: ContentMap;
  season: string | null;
}) {
  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100%' }}>
      <HeaderMobile mode={mode} setMode={setMode} />
      <HeroMobile
        mode={mode}
        featured={modeData.featured}
        season={season}
        headline={mode === 'gazon' ? content['home.hero.headline.gazon'] : content['home.hero.headline.salle']}
        backgroundImage={
          mode === 'gazon'
            ? content['home.hero.background.gazon']
            : content['home.hero.background.salle']
        }
      />
      <BentoMobile mode={mode} lastResult={modeData.lastResult} standingsTop={modeData.standingsTop} playerOfMonth={modeData.playerOfMonth} />
      <CompetitionsMobile mode={mode} upcoming={modeData.upcoming} />
      <NewsMobile news={news} />
      <MobileTabBar />
    </div>
  );
}
