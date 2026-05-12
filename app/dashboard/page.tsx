'use client';

import React, { useState, useEffect } from 'react';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { DashboardMobile } from '@/components/lrh/DashboardMobile';

export default function DashboardPage() {
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
    <main className="min-h-screen">
      {isMobile ? <DashboardMobile /> : <HomeDashboardDesktop />}
    </main>
  );
}
