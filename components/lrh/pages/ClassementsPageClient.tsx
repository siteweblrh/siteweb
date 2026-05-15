'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LRH, body, mono, display } from '../tokens';
import {
  HeaderDesktop, HeaderMobile, FooterDesktop, MobileTabBar,
  PageHero, StatsRibbon, CompetitionFilter, Podium, StandingsBoard,
  SeasonToggle, MobileSeasonToggle,
  type Mode, type StatCell, type FilterOption, type PodiumEntry,
} from '../sections';
import type { AllModeMatch, CompetitionWithStandings } from '@/lib/queries/competition';

type ModePayload = {
  competitions: CompetitionWithStandings[];
  matches: AllModeMatch[];
};

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

function buildStats(comp: CompetitionWithStandings | undefined): StatCell[] {
  if (!comp || comp.standings.length === 0) {
    return [
      { kicker: 'Meilleure attaque', value: '—', accent: 'gold' },
      { kicker: 'Meilleure défense', value: '—', accent: 'navy' },
      { kicker: 'Plus de victoires', value: '—', accent: 'red' },
      { kicker: 'Total matchs joués', value: 0, accent: 'navy' },
    ];
  }
  const bestAttack = [...comp.standings].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const bestDefense = [...comp.standings].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
  const mostWins = [...comp.standings].sort((a, b) => b.wins - a.wins)[0];
  const totalPlayed = comp.standings.reduce((acc, s) => acc + s.played, 0) / 2;

  return [
    { kicker: 'Meilleure attaque', value: bestAttack.goalsFor, unit: 'buts', hint: bestAttack.club.name, accent: 'gold' },
    { kicker: 'Meilleure défense', value: bestDefense.goalsAgainst, unit: 'encaissés', hint: bestDefense.club.name, accent: 'navy' },
    { kicker: 'Plus de victoires', value: mostWins.wins, unit: 'V', hint: mostWins.club.name, accent: 'red' },
    { kicker: 'Total matchs joués', value: Math.round(totalPlayed), unit: 'rencontres', hint: 'Sur la saison', accent: 'navy' },
  ];
}

export function ClassementsPageClient({ gazon, salle }: { gazon: ModePayload; salle: ModePayload }) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');
  const data = mode === 'gazon' ? gazon : salle;
  const [competitionId, setCompetitionId] = useState<string>(data.competitions[0]?.id ?? '');

  useEffect(() => {
    setCompetitionId(data.competitions[0]?.id ?? '');
  }, [data]);

  const activeComp = useMemo(
    () => data.competitions.find((c) => c.id === competitionId),
    [data, competitionId],
  );

  const filterOptions: FilterOption[] = data.competitions.map((c) => ({
    id: c.id, label: c.name, count: c.standings.length,
  }));

  const top3: PodiumEntry[] = useMemo(() => {
    if (!activeComp) return [];
    return activeComp.standings.slice(0, 3).map((s) => ({
      rank: s.rank,
      points: s.points,
      played: s.played,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      club: s.club,
    }));
  }, [activeComp]);

  const stats = useMemo(() => buildStats(activeComp), [activeComp]);

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? <HeaderMobile mode={mode} setMode={setMode} /> : <HeaderDesktop mode={mode} setMode={setMode} />}

      <PageHero
        mobileVariant={isMobile}
        index="02"
        kicker={`Classement officiel · ${mode === 'gazon' ? 'D1 Gazon' : 'D1 Salle'}`}
        title={'Qui domine\nl’île ?'}
        subtitle="Points, différence de buts, forme récente — le tableau officiel mis à jour après chaque journée."
        tag={activeComp ? `${activeComp.name} · ${activeComp.season}` : 'Aucune compétition'}
        rightSlot={isMobile ? <MobileSeasonToggle mode={mode} setMode={setMode} /> : <SeasonToggle mode={mode} setMode={setMode} size="lg" />}
      />

      {data.competitions.length > 1 && (
        <CompetitionFilter
          options={filterOptions}
          active={competitionId}
          onSelect={setCompetitionId}
          mobileVariant={isMobile}
        />
      )}

      {top3.length > 0 && <Podium top3={top3} mobileVariant={isMobile} />}

      <StatsRibbon cells={stats} mobileVariant={isMobile} />

      {activeComp ? (
        <StandingsBoard
          rows={activeComp.standings}
          matches={data.matches}
          mobileVariant={isMobile}
        />
      ) : (
        <div style={{ padding: 64, textAlign: 'center' }}>
          <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>[ vide ]</div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>
            Aucune compétition pour cette discipline.
          </div>
        </div>
      )}

      <div style={{ height: isMobile ? 32 : 80 }} />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
