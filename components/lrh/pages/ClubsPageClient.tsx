'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { LRH, body, mono } from '../tokens';
import {
  HeaderDesktop,
  HeaderMobile,
  FooterDesktop,
  MobileTabBar,
  PageHero,
  StatsRibbon,
  ClubsBoard,
  SeasonToggle,
  MobileSeasonToggle,
  type StatCell,
} from '../sections';
import type { ClubsListItem } from '@/lib/queries/club';
import { useMode } from '../ModeProvider';

// ClubsMap = SVG Réunion (~700 lignes + paths géographiques) ≈ 30-50 Kio.
// On le lazy-load pour ne pas alourdir le bundle initial de /clubs : la liste
// (ClubsBoard) s'affiche d'abord, la carte arrive après. `ssr: false` car
// ResizeObserver + measurements DOM ne peuvent pas tourner côté server.
const ClubsMap = dynamic(
  () => import('../sections').then((mod) => ({ default: mod.ClubsMap })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: 420,
          background: LRH.paperWarm,
          border: '1px dashed ' + LRH.hairStrong,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...mono,
          fontSize: 11,
          color: LRH.mute,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        ◌ Carte en cours de chargement
      </div>
    ),
  },
);

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return m;
}

function buildStats(clubs: ClubsListItem[]): StatCell[] {
  const standalone = clubs.length;
  const cities = new Set(clubs.map((c) => c.city)).size;
  const totalMembers = clubs.reduce((acc, c) => acc + c._count.members, 0);
  const avgMembers = standalone > 0 ? Math.round(totalMembers / standalone) : 0;

  return [
    {
      kicker: 'Clubs affiliés',
      value: standalone,
      unit: standalone > 1 ? 'structures' : 'structure',
      hint: 'À la Ligue',
      accent: 'red',
    },
    {
      kicker: 'Communes',
      value: cities,
      unit: cities > 1 ? 'villes' : 'ville',
      hint: 'Couverture île',
      accent: 'gold',
    },
    {
      kicker: 'Licenciés',
      value: totalMembers,
      unit: totalMembers > 1 ? 'membres' : 'membre',
      hint: 'Tous clubs confondus',
      accent: 'navy',
    },
    {
      kicker: 'Effectif moyen',
      value: avgMembers,
      unit: 'par club',
      hint: 'Licenciés / structure',
      accent: 'navy',
    },
  ];
}

export function ClubsPageClient({
  clubs,
  heroSubtitle,
}: {
  clubs: ClubsListItem[];
  heroSubtitle: string;
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useMode();
  // Page /clubs : on ne montre que les clubs autonomes (STANDALONE). Les
  // ententes inter-clubs restent en DB et continuent à apparaître dans les
  // compétitions où elles jouent, mais ne sont pas listées comme "club"
  // dans l'annuaire public.
  const standaloneClubs = useMemo(
    () => clubs.filter((c) => c.kind === 'STANDALONE'),
    [clubs],
  );
  const stats = useMemo(() => buildStats(standaloneClubs), [standaloneClubs]);

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? (
        <HeaderMobile mode={mode} setMode={setMode} />
      ) : (
        <HeaderDesktop mode={mode} setMode={setMode} />
      )}

      <PageHero
        mobileVariant={isMobile}
        index="05"
        kicker="Affiliés à la Ligue"
        title={'Les clubs\nde l’île.'}
        subtitle={heroSubtitle}
        tag={`${standaloneClubs.length} club${standaloneClubs.length > 1 ? 's' : ''} affilié${standaloneClubs.length > 1 ? 's' : ''}`}
        rightSlot={
          isMobile ? (
            <MobileSeasonToggle mode={mode} setMode={setMode} />
          ) : (
            <SeasonToggle mode={mode} setMode={setMode} size="lg" />
          )
        }
      />

      <StatsRibbon cells={stats} mobileVariant={isMobile} />

      <ClubsMap clubs={standaloneClubs} mobileVariant={isMobile} />

      <ClubsBoard clubs={standaloneClubs} mobileVariant={isMobile} />

      <div style={{ height: isMobile ? 32 : 60 }} />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
