'use client';

import React, { useState, useEffect } from 'react';
import { HomeDesktop } from './HomeDesktop';
import { HomeMobile } from './HomeMobile';

export default function LrhSite() {
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

  return (
    <div className="w-full min-h-screen">
      {isMobile ? (
        <HomeMobile mode={mode} setMode={setMode} />
      ) : (
        <HomeDesktop mode={mode} setMode={setMode} />
      )}
    </div>
  );
}
