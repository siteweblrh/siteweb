'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LRH, body, mono, display } from '../tokens';
import {
  HeaderDesktop, HeaderMobile, FooterDesktop, MobileTabBar,
  PageHero, StatsRibbon, CompetitionFilter, CalendarBoard, Paginator,
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
const PAGE_SIZE = 20;

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
  nowMs,
}: {
  gazon: ModePayload;
  salle: ModePayload;
  heroSubtitle: string;
  /** Capturé côté server pour figer le pivot "présent" du tri custom et
   * éviter un hydration mismatch entre SSR et CSR. */
  nowMs: number;
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');
  const [competitionId, setCompetitionId] = useState<string>(ALL_ID);
  const [page, setPage] = useState(1);

  const data = mode === 'gazon' ? gazon : salle;

  useEffect(() => { setCompetitionId(ALL_ID); setPage(1); }, [mode]);
  useEffect(() => { setPage(1); }, [competitionId]);

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
    const all = competitionId === ALL_ID
      ? data.matches
      : data.matches.filter((m) => m.competition.id === competitionId);

    // Tri "présent d'abord" : matchs à venir (ascendant depuis maintenant),
    // puis matchs passés (descendant depuis maintenant). Le user voit en
    // page 1 les prochaines rencontres + les résultats récents.
    // `nowMs` est figé côté server pour garantir le même résultat SSR/CSR
    // (sinon hydration mismatch React #418).
    const upcoming: typeof all = [];
    const past: typeof all = [];
    for (const m of all) {
      if (new Date(m.kickoffAt).getTime() >= nowMs) upcoming.push(m);
      else past.push(m);
    }
    upcoming.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
    past.sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime());
    return [...upcoming, ...past];
  }, [data, competitionId, nowMs]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMatches = useMemo(
    () => filteredMatches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredMatches, currentPage],
  );

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

      {competitionId !== ALL_ID && (
        <div
          style={{
            padding: isMobile ? '12px 16px 0' : '14px 64px 0',
            display: 'flex',
            justifyContent: 'flex-end',
            background: LRH.paper,
          }}
        >
          <a
            href={`/api/competitions/${competitionId}/calendar.pdf`}
            target="_blank"
            rel="noopener"
            style={{
              ...mono, fontSize: 10.5, fontWeight: 700,
              padding: '8px 14px',
              background: LRH.navy, color: '#fff',
              textDecoration: 'none',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: '1px solid ' + LRH.navy,
            }}
          >
            ▤ Télécharger le calendrier PDF
          </a>
        </div>
      )}

      <CalendarBoard matches={paginatedMatches} mobileVariant={isMobile} />

      <Paginator
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredMatches.length}
        onPageChange={(p) => {
          setPage(p);
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        mobileVariant={isMobile}
        itemLabel="match"
      />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
