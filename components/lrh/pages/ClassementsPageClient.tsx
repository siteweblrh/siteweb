'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LRH, body, mono } from '../tokens';
import {
  HeaderDesktop, HeaderMobile, FooterDesktop, MobileTabBar,
  PageHero, StatsRibbon, CompetitionFilter, Podium, StandingsBoard, ScorersBoard,
  BracketBoard,
  SeasonToggle, MobileSeasonToggle,
  type Mode, type StatCell, type FilterOption, type PodiumEntry, type TopScorer,
} from '../sections';
import type {
  AllModeMatch,
  CompetitionWithStandings,
  BracketMatch,
} from '@/lib/queries/competition';

type ModePayload = {
  competitions: CompetitionWithStandings[];
  matches: AllModeMatch[];
  scorersByCompetition: Record<string, TopScorer[]>;
  bracketsByCompetition: Record<string, BracketMatch[]>;
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

function buildStats(comp: CompetitionWithStandings | undefined, scorers: TopScorer[]): StatCell[] {
  if (!comp || comp.standings.length === 0) {
    return [
      { kicker: 'Meilleure attaque', value: '—', accent: 'gold' },
      { kicker: 'Meilleure défense', value: '—', accent: 'navy' },
      { kicker: 'Plus de victoires', value: '—', accent: 'red' },
      { kicker: 'Meilleur buteur', value: '—', accent: 'gold' },
    ];
  }
  const bestAttack = [...comp.standings].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const bestDefense = [...comp.standings].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
  const mostWins = [...comp.standings].sort((a, b) => b.wins - a.wins)[0];
  const topScorer = scorers[0];

  return [
    { kicker: 'Meilleure attaque', value: bestAttack.goalsFor, unit: 'buts', hint: bestAttack.club.name, accent: 'gold' },
    { kicker: 'Meilleure défense', value: bestDefense.goalsAgainst, unit: 'encaissés', hint: bestDefense.club.name, accent: 'navy' },
    { kicker: 'Plus de victoires', value: mostWins.wins, unit: 'V', hint: mostWins.club.name, accent: 'red' },
    topScorer
      ? {
          kicker: 'Meilleur buteur',
          value: topScorer.goalsScored,
          unit: 'buts',
          hint: `${topScorer.firstName} ${topScorer.lastName} · ${topScorer.club.name}`,
          accent: 'gold',
        }
      : { kicker: 'Meilleur buteur', value: '—', hint: 'À renseigner', accent: 'gold' },
  ];
}

/** Stats minimales pour une coupe (pas de classement) : nb matchs joués,
 *  buts marqués total, meilleur buteur, finale prévue/jouée. */
function buildCupStats(
  comp: CompetitionWithStandings | undefined,
  bracket: BracketMatch[],
  scorers: TopScorer[],
): StatCell[] {
  if (!comp || bracket.length === 0) {
    return [
      { kicker: 'Tour actuel', value: '—', accent: 'gold' },
      { kicker: 'Matchs joués', value: 0, unit: 'match', accent: 'navy' },
      { kicker: 'Buts marqués', value: 0, unit: 'buts', accent: 'red' },
      { kicker: 'Meilleur buteur', value: '—', accent: 'gold' },
    ];
  }
  const played = bracket.filter((m) => m.status === 'FINISHED');
  const totalGoals = played.reduce(
    (acc, m) => acc + (m.homeScore ?? 0) + (m.awayScore ?? 0),
    0,
  );
  // "Tour actuel" = phase du dernier match programmé
  const upcoming = bracket.find((m) => m.status !== 'FINISHED');
  const PHASE_LABEL: Record<BracketMatch['phase'], string> = {
    REGULAR: '—',
    R32: '32e',
    R16: '16e',
    QUARTER: 'Quarts',
    SEMI: 'Demis',
    THIRD_PLACE: '3e place',
    FINAL: 'Finale',
  };
  const currentPhase = upcoming?.phase ?? bracket[bracket.length - 1]?.phase ?? 'REGULAR';
  const topScorer = scorers[0];
  return [
    { kicker: 'Tour actuel', value: PHASE_LABEL[currentPhase], accent: 'gold' },
    { kicker: 'Matchs joués', value: played.length, unit: `/ ${bracket.length}`, accent: 'navy' },
    { kicker: 'Buts marqués', value: totalGoals, unit: 'buts', accent: 'red' },
    topScorer
      ? {
          kicker: 'Meilleur buteur',
          value: topScorer.goalsScored,
          unit: 'buts',
          hint: `${topScorer.firstName} ${topScorer.lastName}`,
          accent: 'gold',
        }
      : { kicker: 'Meilleur buteur', value: '—', hint: 'À renseigner', accent: 'gold' },
  ];
}

function SeasonSelector({
  seasons,
  active,
  mobileVariant = false,
}: {
  seasons: string[];
  active: string | null;
  mobileVariant?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  if (seasons.length === 0) return null;

  const handleChange = (s: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (s === seasons[0]) {
      params.delete('season'); // saison la plus récente = pas de param
    } else {
      params.set('season', s);
    }
    const qs = params.toString();
    router.push(qs ? `/classements?${qs}` : '/classements');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#fff',
        border: '1px solid ' + LRH.hairStrong,
        borderLeft: `3px solid ${LRH.gold}`,
        padding: mobileVariant ? '6px 10px' : '8px 14px',
      }}
    >
      <span
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 800,
          color: LRH.gold,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        ◉ Saison
      </span>
      <select
        value={active ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          ...mono,
          fontSize: 11,
          fontWeight: 700,
          color: LRH.navy,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ClassementsPageClient({
  gazon,
  salle,
  heroSubtitle,
  seasons,
  activeSeason,
}: {
  gazon: ModePayload;
  salle: ModePayload;
  heroSubtitle: string;
  seasons: string[];
  activeSeason: string | null;
}) {
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

  const activeScorers = useMemo(
    () => (competitionId ? data.scorersByCompetition[competitionId] ?? [] : []),
    [data, competitionId],
  );

  const activeBracket = useMemo(
    () => (competitionId ? data.bracketsByCompetition[competitionId] ?? [] : []),
    [data, competitionId],
  );

  const filterOptions: FilterOption[] = data.competitions.map((c) => ({
    id: c.id,
    label: c.name,
    count: c.format === 'CUP' ? undefined : c.standings.length,
  }));

  const isCup = activeComp?.format === 'CUP';
  const hasPlayoffs = activeComp?.format === 'CHAMPIONSHIP_PLAYOFFS';

  const top3: PodiumEntry[] = useMemo(() => {
    if (!activeComp || isCup) return [];
    return activeComp.standings.slice(0, 3).map((s) => ({
      rank: s.rank,
      points: s.points,
      played: s.played,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      club: s.club,
    }));
  }, [activeComp, isCup]);

  const stats = useMemo(() => {
    if (isCup) return buildCupStats(activeComp, activeBracket, activeScorers);
    return buildStats(activeComp, activeScorers);
  }, [activeComp, activeBracket, activeScorers, isCup]);

  const scorersContext = activeComp ? `${activeComp.name} · ${activeComp.season}` : undefined;

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? <HeaderMobile mode={mode} setMode={setMode} /> : <HeaderDesktop mode={mode} setMode={setMode} />}

      <PageHero
        mobileVariant={isMobile}
        index="02"
        kicker={`Classement officiel · ${mode === 'gazon' ? 'D1 Gazon' : 'D1 Salle'}`}
        title={'Qui domine\nl’île ?'}
        subtitle={heroSubtitle}
        tag={activeComp ? `${activeComp.name} · ${activeComp.season}` : 'Aucune compétition'}
        rightSlot={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {seasons.length > 1 && (
              <SeasonSelector seasons={seasons} active={activeSeason} mobileVariant={isMobile} />
            )}
            {isMobile ? (
              <MobileSeasonToggle mode={mode} setMode={setMode} />
            ) : (
              <SeasonToggle mode={mode} setMode={setMode} size="lg" />
            )}
          </div>
        }
      />

      {data.competitions.length > 1 && (
        <CompetitionFilter
          options={filterOptions}
          active={competitionId}
          onSelect={setCompetitionId}
          mobileVariant={isMobile}
        />
      )}

      {/* Podium : seulement si pas une coupe pure */}
      {top3.length > 0 && <Podium top3={top3} mobileVariant={isMobile} />}

      <StatsRibbon cells={stats} mobileVariant={isMobile} />

      {activeComp ? (
        <>
          {/* CUP : pas de tableau classement, bracket uniquement */}
          {!isCup && (
            <StandingsBoard
              rows={activeComp.standings}
              matches={data.matches}
              mobileVariant={isMobile}
            />
          )}

          {/* Bracket : visible pour CUP et CHAMPIONSHIP_PLAYOFFS */}
          {(isCup || hasPlayoffs) && (
            <BracketBoard
              matches={activeBracket}
              mobileVariant={isMobile}
              title={isCup ? 'Tableau de la coupe' : 'Phase finale'}
              index={isCup ? '02' : '03'}
            />
          )}

          {/* Buteurs : toujours visible */}
          <div
            style={{
              background: LRH.paperWarm,
              padding: isMobile
                ? '32px 16px 0'
                : 'clamp(36px, 4.5vw, 48px) clamp(20px, 4.5vw, 64px) 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
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
                {isCup ? '03' : hasPlayoffs ? '04' : '03'} · Meilleurs buteurs
              </span>
              <span style={{ flex: 1, height: 1, background: LRH.hair }} />
            </div>
          </div>

          <ScorersBoard
            scorers={activeScorers}
            context={scorersContext}
            mobileVariant={isMobile}
          />
        </>
      ) : (
        <div style={{ padding: 64, textAlign: 'center' }}>
          <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>[ vide ]</div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>
            Aucune compétition pour cette discipline
            {activeSeason ? ` sur la saison ${activeSeason}` : ''}.
          </div>
        </div>
      )}

      <div style={{ height: isMobile ? 32 : 80 }} />

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
