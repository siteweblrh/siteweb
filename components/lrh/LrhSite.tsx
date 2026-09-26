'use client';

import React from 'react';
import { HomeDesktop } from './HomeDesktop';
import { HomeMobile } from './HomeMobile';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import { useMode } from './ModeProvider';
import type { HomeData } from '@/lib/queries/home';
import type { ContentKey } from '@/lib/siteContent';

type ContentMap = Record<ContentKey, string>;

export default function LrhSite({
  data,
  content,
  ssrIsMobile = false,
}: {
  data: HomeData;
  content: ContentMap;
  /** Valeur isMobile détectée server-side via User-Agent. Crucial pour
   *  éviter le hydration mismatch React #418. */
  ssrIsMobile?: boolean;
}) {
  const [mode, setMode] = useMode();
  const isMobile = useIsMobile(ssrIsMobile);

  const modeData = mode === 'gazon' ? data.gazon : data.salle;
  // Le bloc jeunes suit le toggle gazon/salle comme le reste de la home ; il se
  // masque de lui-même tant que la discipline affichée n'a aucun résultat jeune.
  const youthBlocks = mode === 'gazon' ? data.youth.GAZON : data.youth.SALLE;

  return (
    <div className="w-full min-h-screen">
      {isMobile ? (
        <HomeMobile mode={mode} setMode={setMode} news={data.news} modeData={modeData} youth={youthBlocks} content={content} />
      ) : (
        <HomeDesktop mode={mode} setMode={setMode} news={data.news} modeData={modeData} youth={youthBlocks} content={content} />
      )}
    </div>
  );
}
