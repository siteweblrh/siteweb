'use client';

import React, { useState, useEffect } from 'react';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { DashboardMobile } from '@/components/lrh/DashboardMobile';

export default function DashboardClient({ club, news, metrics, user, isAdmin = false }: any) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
