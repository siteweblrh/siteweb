'use client';

import React, { useState, useEffect } from 'react';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { DashboardMobile } from '@/components/lrh/DashboardMobile';

export default function DashboardClient({ club, news, metrics, user }: any) {
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
    <>
      {isMobile ? (
        <DashboardMobile club={club} news={news} metrics={metrics} user={user} />
      ) : (
        <HomeDashboardDesktop club={club} news={news} metrics={metrics} user={user} />
      )}
    </>
  );
}
