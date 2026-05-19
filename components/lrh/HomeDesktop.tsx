'use client';

import React from 'react';
import { LRH, body } from './tokens';
import type { HomeNewsItem, ModeData } from '@/lib/queries/home';
import type { ContentKey } from '@/lib/siteContent';
import {
  HeaderDesktop,
  HeroDesktop,
  BentoDesktop,
  CompetitionsDesktop,
  NewsDesktop,
  FooterDesktop,
  type Mode,
} from './sections';

type ContentMap = Record<ContentKey, string>;

export function HomeDesktop({ mode, setMode, news, modeData, content, season }: {
  mode: Mode;
  setMode: (m: Mode) => void;
  news: HomeNewsItem[];
  modeData: ModeData;
  content: ContentMap;
  season: string | null;
}) {
  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink }}>
      <HeaderDesktop mode={mode} setMode={setMode} />
      <HeroDesktop
        mode={mode}
        modeData={modeData}
        season={season}
        headline={mode === 'gazon' ? content['home.hero.headline.gazon'] : content['home.hero.headline.salle']}
        subtitle={content['home.hero.subtitle']}
        backgroundImage={
          mode === 'gazon'
            ? content['home.hero.background.gazon']
            : content['home.hero.background.salle']
        }
      />
      <BentoDesktop mode={mode} lastResult={modeData.lastResult} standingsTop={modeData.standingsTop} playerOfMonth={modeData.playerOfMonth} />
      <CompetitionsDesktop upcoming={modeData.upcoming} />
      <NewsDesktop news={news} />
      <FooterDesktop />
    </div>
  );
}
