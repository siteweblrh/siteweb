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

export function HomeDesktop({ mode, setMode, news, modeData, content }: {
  mode: Mode;
  setMode: (m: Mode) => void;
  news: HomeNewsItem[];
  modeData: ModeData;
  content: ContentMap;
}) {
  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink }}>
      <HeaderDesktop mode={mode} setMode={setMode} />
      <HeroDesktop
        mode={mode}
        modeData={modeData}
        headline={mode === 'gazon' ? content['home.hero.headline.gazon'] : content['home.hero.headline.salle']}
        subtitle={content['home.hero.subtitle']}
      />
      <BentoDesktop mode={mode} lastResult={modeData.lastResult} standingsTop={modeData.standingsTop} />
      <CompetitionsDesktop mode={mode} upcoming={modeData.upcoming} />
      <NewsDesktop news={news} />
      <FooterDesktop />
    </div>
  );
}
