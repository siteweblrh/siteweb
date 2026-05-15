'use client';

import React, { useEffect, useState } from 'react';
import { LRH, body, mono } from '../tokens';
import {
  HeaderDesktop, HeaderMobile, FooterDesktop, MobileTabBar,
  PageHero, LiguePresentation, BureauBoard, CommissionsBoard,
  SeasonToggle, MobileSeasonToggle,
  type Mode, type LigueStat,
} from '../sections';
import type { BureauMemberRow, CommissionRow } from '@/lib/queries/ligue';

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

function AnchorRail({ items, mobileVariant }: { items: { id: string; label: string }[]; mobileVariant: boolean }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 5,
      background: LRH.paper,
      borderBottom: '1px solid ' + LRH.hair,
      padding: mobileVariant ? '12px 16px' : '14px 64px',
      display: 'flex', alignItems: 'center', gap: 18,
      overflowX: 'auto',
      backdropFilter: 'saturate(140%) blur(8px)',
      WebkitBackdropFilter: 'saturate(140%) blur(8px)',
    }}>
      <span style={{
        ...mono, fontSize: 10, fontWeight: 700,
        color: LRH.mute, letterSpacing: '0.18em',
        textTransform: 'uppercase', flexShrink: 0,
      }}>▸ Sur cette page</span>
      <div style={{ display: 'flex', gap: 22 }}>
        {items.map((it, i) => (
          <a key={it.id} href={`#${it.id}`} style={{
            ...body, fontSize: 12.5, fontWeight: 700,
            color: LRH.navy, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              ...mono, fontSize: 9.5, fontWeight: 700,
              color: LRH.red, letterSpacing: '0.1em',
            }}>{(i + 1).toString().padStart(2, '0')}</span>
            {it.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function LiguePageClient({
  bureau, commissions, stats,
}: {
  bureau: BureauMemberRow[];
  commissions: CommissionRow[];
  stats: LigueStat[];
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? <HeaderMobile mode={mode} setMode={setMode} /> : <HeaderDesktop mode={mode} setMode={setMode} />}

      <PageHero
        mobileVariant={isMobile}
        index="03"
        kicker="Institution · Ligue Réunionnaise de Hockey"
        title={'La Ligue,\nde l\'intérieur.'}
        subtitle="Bureau exécutif, commissions thématiques et organes de fonctionnement — l'institution qui structure le hockey à La Réunion."
        tag="Affiliée FFH · Saison 2025–2026"
        rightSlot={isMobile ? <MobileSeasonToggle mode={mode} setMode={setMode} /> : <SeasonToggle mode={mode} setMode={setMode} size="lg" />}
      />

      <AnchorRail
        mobileVariant={isMobile}
        items={[
          { id: 'presentation', label: 'Présentation' },
          { id: 'bureau', label: 'Bureau' },
          { id: 'commissions', label: 'Commissions' },
        ]}
      />

      <LiguePresentation stats={stats} mobileVariant={isMobile} />
      <BureauBoard members={bureau} mobileVariant={isMobile} />
      <CommissionsBoard commissions={commissions} mobileVariant={isMobile} />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
