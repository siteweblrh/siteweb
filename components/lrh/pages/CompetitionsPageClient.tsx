'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LRH, body, mono, display } from '../tokens';
import {
  HeaderDesktop, HeaderMobile, FooterDesktop, MobileTabBar,
  PageHero, StatsRibbon, CompetitionFilter, CalendarBoard,
  SeasonToggle, MobileSeasonToggle,
  type Mode, type StatCell, type FilterOption,
} from '../sections';
import type { AllModeMatch, CompetitionForMode } from '@/lib/queries/competition';
import { formatMatchDay, formatMatchTime } from '@/lib/utils/match-format';

type ModePayload = {
  matches: AllModeMatch[];
  competitions: CompetitionForMode[];
};

const ALL_ID = '__all__';

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

function buildStats(matches: AllModeMatch[], mode: Mode): StatCell[] {
  const now = Date.now();
  const upcoming = matches.filter((m) => new Date(m.kickoffAt).getTime() >= now && m.status !== 'FINISHED');
  const played = matches.filter((m) => m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null);
  const totalGoals = played.reduce((acc, m) => acc + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0);
  const next = upcoming[0];
  const nextLabel = next ? `${formatMatchDay(next.kickoffAt)} · ${formatMatchTime(next.kickoffAt)}` : '—';
  const avg = played.length > 0 ? (totalGoals / played.length).toFixed(1) : '—';

  return [
    { kicker: 'Prochain', value: nextLabel, hint: next ? `${next.homeClub.name} vs ${next.awayClub.name}` : 'Aucun à venir', accent: 'red' },
    { kicker: 'Matchs joués', value: played.length, unit: `/ ${matches.length}`, hint: `Saison ${mode === 'gazon' ? 'gazon' : 'salle'}`, accent: 'navy' },
    { kicker: 'Buts marqués', value: totalGoals, unit: 'buts', hint: `${avg} en moyenne / match`, accent: 'gold' },
    { kicker: 'À venir', value: upcoming.length, unit: 'rencontres', hint: 'Programmées', accent: 'navy' },
  ];
}

export function CompetitionsPageClient({
  gazon,
  salle,
  heroSubtitle,
}: {
  gazon: ModePayload;
  salle: ModePayload;
  heroSubtitle: string;
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');
  const [competitionId, setCompetitionId] = useState<string>(ALL_ID);

  const data = mode === 'gazon' ? gazon : salle;

  useEffect(() => { setCompetitionId(ALL_ID); }, [mode]);

  const filterOptions: FilterOption[] = useMemo(() => {
    const all: FilterOption = { id: ALL_ID, label: 'Toutes', count: data.matches.length };
    const byComp = data.competitions.map((c) => ({
      id: c.id,
      label: c.name,
      count: data.matches.filter((m) => m.competition.id === c.id).length,
    }));
    return [all, ...byComp];
  }, [data]);

  const filteredMatches = useMemo(() => {
    if (competitionId === ALL_ID) return data.matches;
    return data.matches.filter((m) => m.competition.id === competitionId);
  }, [data, competitionId]);

  const stats = useMemo(() => buildStats(filteredMatches, mode), [filteredMatches, mode]);

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? <HeaderMobile mode={mode} setMode={setMode} /> : <HeaderDesktop mode={mode} setMode={setMode} />}

      <PageHero
        mobileVariant={isMobile}
        index="01"
        kicker="Calendrier officiel · Ligue Réunionnaise"
        title={'Tous les matchs.\nUne île. Deux disciplines.'}
        subtitle={heroSubtitle}
        tag={`Saison ${mode === 'gazon' ? 'Gazon 2025–2026' : 'Indoor 2025–2026'}`}
        rightSlot={isMobile ? <MobileSeasonToggle mode={mode} setMode={setMode} /> : <SeasonToggle mode={mode} setMode={setMode} size="lg" />}
      />

      <StatsRibbon cells={stats} mobileVariant={isMobile} />

      <CompetitionFilter
        options={filterOptions}
        active={competitionId}
        onSelect={setCompetitionId}
        mobileVariant={isMobile}
      />

      <CalendarBoard matches={filteredMatches} mobileVariant={isMobile} />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
