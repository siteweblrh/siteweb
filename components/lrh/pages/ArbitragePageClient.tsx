'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LRH, mono, display, body } from '../tokens';
import {
  HeaderDesktop,
  HeaderMobile,
  FooterDesktop,
  MobileTabBar,
  PageHero,
  StatsRibbon,
  RefereeRoster,
  RefereeDesignations,
  BecomeRefereeBlock,
  CommissionPanel,
  SeasonToggle,
  MobileSeasonToggle,
  type Mode,
  type StatCell,
} from '../sections';
import type { PublicRefereeRow, DesignationRow } from '@/lib/queries/referee';
import type { CommissionRow } from '@/lib/queries/ligue';

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

type DesignationsByMode = {
  gazon: { upcoming: DesignationRow[]; recent: DesignationRow[] };
  salle: { upcoming: DesignationRow[]; recent: DesignationRow[] };
};

function buildStats(
  referees: PublicRefereeRow[],
  designations: DesignationsByMode,
  mode: Mode,
): StatCell[] {
  const total = referees.length;
  const national = referees.filter((r) => r.level === 'NATIONAL').length;
  const jeunes = referees.filter((r) => r.level === 'JEUNE').length;
  const d = mode === 'gazon' ? designations.gazon : designations.salle;
  const upcoming = d.upcoming.length;

  return [
    { kicker: 'Effectif', value: total, unit: total > 1 ? 'arbitres' : 'arbitre', hint: 'Tous niveaux', accent: 'navy' },
    { kicker: 'Élite', value: national, unit: national > 1 ? 'fédéraux' : 'fédéral', hint: 'Niveau national', accent: 'gold' },
    { kicker: 'Relève', value: jeunes, unit: jeunes > 1 ? 'jeunes arbitres' : 'jeune arbitre', hint: 'En formation', accent: 'red' },
    { kicker: 'À venir', value: upcoming, unit: 'désignations', hint: mode === 'gazon' ? 'Sur gazon' : 'En salle', accent: 'navy' },
  ];
}

export function ArbitragePageClient({
  referees,
  designations,
  commission,
}: {
  referees: PublicRefereeRow[];
  designations: DesignationsByMode;
  commission: CommissionRow | null;
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');
  const stats = useMemo(
    () => buildStats(referees, designations, mode),
    [referees, designations, mode],
  );
  const currentDesignations = mode === 'gazon' ? designations.gazon : designations.salle;

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? (
        <HeaderMobile mode={mode} setMode={setMode} />
      ) : (
        <HeaderDesktop mode={mode} setMode={setMode} />
      )}

      <PageHero
        mobileVariant={isMobile}
        index="06"
        kicker="Le sifflet officiel"
        title={'Arbitrage.'}
        subtitle="Le corps arbitral de la Ligue — effectif officiel, désignations sur les matchs gazon et salle, parcours de formation et commission dédiée."
        tag={`${referees.length} arbitre${referees.length > 1 ? 's' : ''} en activité`}
        rightSlot={
          isMobile ? (
            <MobileSeasonToggle mode={mode} setMode={setMode} />
          ) : (
            <SeasonToggle mode={mode} setMode={setMode} size="lg" />
          )
        }
      />

      <StatsRibbon cells={stats} mobileVariant={isMobile} />

      <RefereeRoster referees={referees} mobileVariant={isMobile} />

      <RefereeDesignations
        upcoming={currentDesignations.upcoming}
        recent={currentDesignations.recent}
        mobileVariant={isMobile}
      />

      {commission && (
        <CommissionSection commission={commission} mobileVariant={isMobile} />
      )}

      <BecomeRefereeBlock
        mobileVariant={isMobile}
        contactEmail="arbitrage@hockey-reunion.re"
      />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}

function CommissionSection({
  commission,
  mobileVariant,
}: {
  commission: CommissionRow;
  mobileVariant: boolean;
}) {
  return (
    <div
      style={{
        background: LRH.paper,
        padding: mobileVariant
          ? '32px 16px'
          : 'clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
        <span style={{ width: 28, height: 2, background: LRH.gold }} />
        <span
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            color: LRH.gold,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          05 · Commission d&apos;arbitrage
        </span>
        <span style={{ flex: 1, height: 1, background: LRH.hair }} />
      </div>
      <h2
        style={{
          ...display,
          fontWeight: 800,
          fontSize: mobileVariant ? 30 : 44,
          color: LRH.navy,
          margin: 0,
          letterSpacing: '-0.035em',
          lineHeight: 1.05,
          marginBottom: 20,
        }}
      >
        Au cœur de la décision.
      </h2>
      <CommissionPanel
        c={commission}
        isOpen={true}
        onToggle={() => {}}
        mobileVariant={mobileVariant}
      />
    </div>
  );
}
