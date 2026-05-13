'use client';

import React, { useState, useEffect } from 'react';
import { HomeDesktop } from './HomeDesktop';
import { HomeMobile } from './HomeMobile';
import type { HomeData } from '@/lib/queries/home';

export default function LrhSite({ data }: { data: HomeData }) {
  const [mode, setMode] = useState<'gazon' | 'salle'>('gazon');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const modeData = mode === 'gazon' ? data.gazon : data.salle;

  return (
    <div className="w-full min-h-screen">
      {isMobile ? (
        <HomeMobile mode={mode} setMode={setMode} news={data.news} modeData={modeData} />
      ) : (
        <HomeDesktop mode={mode} setMode={setMode} news={data.news} modeData={modeData} />
      )}
    </div>
  );
}
