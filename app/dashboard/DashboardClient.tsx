'use client';

import React, { useState, useEffect } from 'react';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { DashboardMobile } from '@/components/lrh/DashboardMobile';

export default function DashboardClient({ club, news, metrics, user, isAdmin = false }: any) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // matchMedia : event uniquement au franchissement du breakpoint,
    // pas à chaque pixel de resize. Moins de re-renders, fluidité++.
    const mq = window.matchMedia('(max-width: 1023.98px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Admin doit TOUJOURS voir le dashboard complet (HomeDashboardDesktop) — il
  // a sa propre logique responsive (sidebar drawer + burger en mobile) et
  // c'est le seul layout qui expose toute la navigation admin (Compétition,
  // Acteurs, Ligue, Communication, Système). DashboardMobile est un home
  // mobile-first orienté club manager, sans aucun lien de navigation : si on
  // le servait à un admin il se retrouve coincé sur l'écran d'accueil.
  if (isAdmin || !isMobile) {
    return <HomeDashboardDesktop club={club} news={news} metrics={metrics} user={user} isAdmin={isAdmin} />;
  }
  return <DashboardMobile club={club} news={news} metrics={metrics} user={user} />;
}
