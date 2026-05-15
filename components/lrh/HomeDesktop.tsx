'use client';

import React from 'react';
import { LRH, body } from './tokens';
import type { HomeNewsItem, ModeData } from '@/lib/queries/home';
import {
  HeaderDesktop,
  HeroDesktop,
  BentoDesktop,
  CompetitionsDesktop,
  NewsDesktop,
  FooterDesktop,
  type Mode,
} from './sections';

export function HomeDesktop({ mode, setMode, news, modeData }: {
  mode: Mode;
  setMode: (m: Mode) => void;
  news: HomeNewsItem[];
  modeData: ModeData;
}) {
  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink }}>
      <HeaderDesktop mode={mode} setMode={setMode} />
      <HeroDesktop mode={mode} featured={modeData.featured} />
      <BentoDesktop mode={mode} lastResult={modeData.lastResult} standingsTop={modeData.standingsTop} />
      <CompetitionsDesktop mode={mode} upcoming={modeData.upcoming} />
      <NewsDesktop news={news} />
      <FooterDesktop />
    </div>
  );
}
