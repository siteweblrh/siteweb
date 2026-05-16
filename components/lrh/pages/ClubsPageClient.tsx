'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LRH, body } from '../tokens';
import {
  HeaderDesktop,
  HeaderMobile,
  FooterDesktop,
  MobileTabBar,
  PageHero,
  StatsRibbon,
  ClubsBoard,
  ClubsMap,
  SeasonToggle,
  MobileSeasonToggle,
  type Mode,
  type StatCell,
} from '../sections';
import type { ClubsListItem } from '@/lib/queries/club';

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
  const standalone = clubs.filter((c) => c.kind === 'STANDALONE').length;
  const ententes = clubs.filter((c) => c.kind === 'ENTENTE').length;
  const cities = new Set(clubs.map((c) => c.city)).size;
  const totalMembers = clubs.reduce((acc, c) => acc + c._count.members, 0);

  return [
    {
      kicker: 'Clubs affiliés',
      value: standalone,
      unit: standalone > 1 ? 'structures' : 'structure',
      hint: 'Indépendants',
      accent: 'red',
    },
    {
      kicker: 'Ententes',
      value: ententes,
      unit: 'inter-clubs',
      hint: 'Équipes mutualisées',
      accent: 'gold',
    },
    {
      kicker: 'Communes',
      value: cities,
      unit: cities > 1 ? 'villes' : 'ville',
      hint: 'Couverture île',
      accent: 'navy',
    },
    {
      kicker: 'Licenciés',
      value: totalMembers,
      unit: totalMembers > 1 ? 'membres' : 'membre',
      hint: 'Tous clubs confondus',
      accent: 'navy',
    },
  ];
}

export function ClubsPageClient({ clubs }: { clubs: ClubsListItem[] }) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');
  const stats = useMemo(() => buildStats(clubs), [clubs]);

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
        subtitle="Saint-Denis au Tampon, du Port à la Possession — toutes les structures qui font vivre le hockey à La Réunion, gazon et salle confondus."
        tag={`${clubs.length} structure${clubs.length > 1 ? 's' : ''} engagée${clubs.length > 1 ? 's' : ''}`}
        rightSlot={
          isMobile ? (
            <MobileSeasonToggle mode={mode} setMode={setMode} />
          ) : (
            <SeasonToggle mode={mode} setMode={setMode} size="lg" />
          )
        }
      />

      <StatsRibbon cells={stats} mobileVariant={isMobile} />

      <ClubsMap clubs={clubs} mobileVariant={isMobile} />

      <ClubsBoard clubs={clubs} mobileVariant={isMobile} />

      <div style={{ height: isMobile ? 32 : 60 }} />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
