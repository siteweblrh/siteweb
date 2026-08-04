'use client';

import React from 'react';
import { LRH, body } from './tokens';
import type { HomeNewsItem, ModeData } from '@/lib/queries/home';
import type { ContentKey } from '@/lib/siteContent';
// ⚠️ Imports directs par module, PAS via le barrel `./sections`.
//
// Le barrel réexporte 36 modules. Comme cet arbre est 'use client', importer
// via lui faisait entrer TOUT le barrel dans le chunk de la home : mesuré en
// prod le 2026-07-19, le chunk de 162 Ko embarquait ClubsMap, LicenceDirectory,
// CalendarBoard, StandingsBoard, RefereeRoster, BureauBoard, CommissionsBoard,
// ScorersBoard, CityCombobox, Podium, haversine et CITIES_DIRECTORY — aucun
// n'est sur la page d'accueil.
//
// Le JS du chemin critique gouverne le LCP mobile (~1 s par tranche de 40 Ko),
// donc cette fuite se payait directement sur le score. Garder les imports
// pointés sur les fichiers réels.
import { HeaderDesktop, type Mode } from './sections/Header';
import { HeroDesktop } from './sections/Hero';
import { BentoDesktop } from './sections/Bento';
import { CompetitionsDesktop } from './sections/Competitions';
import { NewsDesktop } from './sections/News';
import { FooterDesktop } from './sections/Footer';

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
