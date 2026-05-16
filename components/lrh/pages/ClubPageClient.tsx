'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LRH, body, mono, display, ClubCrest } from '../tokens';
import {
  HeaderDesktop,
  HeaderMobile,
  FooterDesktop,
  MobileTabBar,
  PageHero,
  StatsRibbon,
  CalendarBoard,
  StandingsBoard,
  NewsDesktop,
  NewsMobile,
  ClubProfile,
  EffectifBoard,
  SeasonToggle,
  MobileSeasonToggle,
  type Mode,
  type StatCell,
  type ClubSponsor,
  type EffectifMember,
} from '../sections';
import type {
  ClubMatch,
  ClubStandingsCompetition,
} from '@/lib/queries/club';
import type { HomeNewsItem } from '@/lib/queries/home';

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

function AnchorRail({
  items,
  mobileVariant,
}: {
  items: { id: string; label: string }[];
  mobileVariant: boolean;
}) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        background: LRH.paper,
        borderBottom: '1px solid ' + LRH.hair,
        padding: mobileVariant ? '12px 16px' : '14px 64px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        overflowX: 'auto',
        backdropFilter: 'saturate(140%) blur(8px)',
        WebkitBackdropFilter: 'saturate(140%) blur(8px)',
      }}
    >
      <span
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 700,
          color: LRH.mute,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        ▸ Sur cette page
      </span>
      <div style={{ display: 'flex', gap: 22 }}>
        {items.map((it, i) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            style={{
              ...body,
              fontSize: 12.5,
              fontWeight: 700,
              color: LRH.navy,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                ...mono,
                fontSize: 9.5,
                fontWeight: 700,
                color: LRH.red,
                letterSpacing: '0.1em',
              }}
            >
              {(i + 1).toString().padStart(2, '0')}
            </span>
            {it.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function computeClubStats(
  matches: ClubMatch[],
  standings: ClubStandingsCompetition[],
  clubId: string
): StatCell[] {
  const finished = matches.filter(
    (m) => m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null
  );
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const m of finished) {
    const isHome = m.homeClubId === clubId;
    const own = isHome ? m.homeScore! : m.awayScore!;
    const opp = isHome ? m.awayScore! : m.homeScore!;
    goalsFor += own;
    goalsAgainst += opp;
    if (own > opp) wins++;
    else if (own < opp) losses++;
    else draws++;
  }

  let bestRank: number | null = null;
  let bestCompName: string | null = null;
  for (const comp of standings) {
    const row = comp.standings.find((s) => s.club.id === clubId);
    if (row && (bestRank === null || row.rank < bestRank)) {
      bestRank = row.rank;
      bestCompName = comp.name;
    }
  }

  return [
    {
      kicker: 'Matchs joués',
      value: finished.length,
      hint: finished.length > 0 ? `${wins}V · ${draws}N · ${losses}D` : 'Saison à venir',
      accent: 'navy',
    },
    {
      kicker: 'Victoires',
      value: wins,
      unit: 'cette saison',
      accent: 'gold',
    },
    {
      kicker: 'Différence buts',
      value: (goalsFor - goalsAgainst > 0 ? '+' : '') + (goalsFor - goalsAgainst),
      hint: `${goalsFor} pour · ${goalsAgainst} contre`,
      accent: goalsFor - goalsAgainst >= 0 ? 'navy' : 'red',
    },
    {
      kicker: 'Classement',
      value: bestRank ? bestRank.toString().padStart(2, '0') : '—',
      hint: bestCompName ?? 'Non engagé',
      accent: 'red',
    },
  ];
}

function CompetitionStandingsBlock({
  comp,
  matches,
  highlightClubId,
  mobileVariant,
}: {
  comp: ClubStandingsCompetition;
  matches: ClubMatch[];
  highlightClubId: string;
  mobileVariant: boolean;
}) {
  // The current club's own row inside this competition
  const ownRow = comp.standings.find((s) => s.club.id === highlightClubId);

  return (
    <div style={{ marginBottom: mobileVariant ? 36 : 48 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          padding: mobileVariant ? '0 16px 8px' : '0 64px 12px',
        }}
      >
        <span
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            color: LRH.red,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {comp.season}
        </span>
        <span
          style={{
            ...display,
            fontWeight: 700,
            fontSize: mobileVariant ? 18 : 22,
            color: LRH.navy,
            letterSpacing: '-0.02em',
          }}
        >
          {comp.name}
        </span>
        {ownRow && (
          <span
            style={{
              marginLeft: 'auto',
              ...mono,
              fontSize: 11,
              fontWeight: 700,
              color: LRH.navy,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              border: '1px solid ' + LRH.navy,
            }}
          >
            {ownRow.rank.toString().padStart(2, '0')} / {comp.standings.length} · {ownRow.points} PTS
          </span>
        )}
      </div>
      <StandingsBoard
        rows={comp.standings}
        matches={matches}
        highlightClubId={highlightClubId}
        mobileVariant={mobileVariant}
      />
    </div>
  );
}

export function ClubPageClient({
  club,
  sponsors,
  matchesByMode,
  standingsByMode,
  news,
  members,
  memberCount,
}: {
  club: {
    id: string;
    slug: string;
    name: string;
    city: string;
    shortCode: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    socials?: { label: string; url: string }[] | null;
    description?: string | null;
    primaryColor?: string | null;
    logo?: string | null;
    foundedYear?: number | null;
  };
  sponsors: ClubSponsor[];
  matchesByMode: { GAZON: ClubMatch[]; SALLE: ClubMatch[] };
  standingsByMode: { GAZON: ClubStandingsCompetition[]; SALLE: ClubStandingsCompetition[] };
  news: HomeNewsItem[];
  members: EffectifMember[];
  memberCount: number;
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');

  const matches = mode === 'gazon' ? matchesByMode.GAZON : matchesByMode.SALLE;
  const standings = mode === 'gazon' ? standingsByMode.GAZON : standingsByMode.SALLE;

  const stats = useMemo(
    () => computeClubStats(matches, standings, club.id),
    [matches, standings, club.id]
  );

  const anchorItems = [
    { id: 'presentation', label: 'Présentation' },
    { id: 'matchs', label: 'Matchs' },
    { id: 'classement', label: 'Classement' },
    ...(members.length > 0 ? [{ id: 'effectif', label: 'Effectif' }] : []),
    ...(news.length > 0 ? [{ id: 'actualites', label: 'Actualités' }] : []),
  ];

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? (
        <HeaderMobile mode={mode} setMode={setMode} />
      ) : (
        <HeaderDesktop mode={mode} setMode={setMode} />
      )}

      {/* Back to /clubs */}
      <div
        style={{
          padding: isMobile ? '12px 16px 0' : '14px 64px 0',
          background: LRH.paper,
        }}
      >
        <Link
          href="/clubs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: '#fff',
            border: '1px solid ' + LRH.hairStrong,
            color: LRH.navy,
            textDecoration: 'none',
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          <span aria-hidden style={{ fontSize: 12 }}>
            ←
          </span>
          Tous les clubs
        </Link>
      </div>

      <PageHero
        mobileVariant={isMobile}
        index="04"
        kicker={`${club.shortCode ?? 'Club LRH'} · ${club.city}`}
        title={club.name}
        subtitle={`Calendrier, résultats et classement de ${club.name} dans les compétitions ${mode === 'gazon' ? 'gazon' : 'salle'} organisées par la LRH.`}
        tag={`Saison 2025–2026 · ${mode === 'gazon' ? 'Gazon' : 'Salle'}`}
        rightSlot={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 14 : 24,
              flexDirection: isMobile ? 'row-reverse' : 'row',
              justifyContent: isMobile ? 'space-between' : 'flex-end',
              width: isMobile ? '100%' : 'auto',
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                padding: 12,
                display: 'inline-flex',
              }}
            >
              {club.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={club.logo}
                  alt={`${club.name} logo`}
                  style={{
                    width: isMobile ? 56 : 80,
                    height: isMobile ? 56 : 80,
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <ClubCrest id={club.shortCode ?? undefined} size={isMobile ? 56 : 80} />
              )}
            </div>
            {isMobile ? (
              <MobileSeasonToggle mode={mode} setMode={setMode} />
            ) : (
              <SeasonToggle mode={mode} setMode={setMode} size="lg" />
            )}
          </div>
        }
      />

      <StatsRibbon cells={stats} mobileVariant={isMobile} />

      <AnchorRail items={anchorItems} mobileVariant={isMobile} />

      <ClubProfile
        club={{
          name: club.name,
          city: club.city,
          shortCode: club.shortCode,
          memberCount,
          email: club.email,
          phone: club.phone,
          website: club.website,
          address: club.address,
          socials: club.socials,
          description: club.description,
          primaryColor: club.primaryColor,
          logo: club.logo,
          foundedYear: club.foundedYear,
        }}
        sponsors={sponsors}
        mobileVariant={isMobile}
      />

      {/* Matchs */}
      <div
        id="matchs"
        style={{
          paddingTop: isMobile ? 28 : 40,
          background: LRH.paper,
        }}
      >
        <div style={{ padding: isMobile ? '0 16px 4px' : '0 64px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ width: 28, height: 2, background: LRH.gold }} />
            <span
              style={{
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                color: LRH.red,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              02 · Calendrier {mode === 'gazon' ? 'gazon' : 'salle'}
            </span>
          </div>
          <h2
            style={{
              ...display,
              fontWeight: 700,
              fontSize: isMobile ? 28 : 38,
              color: LRH.navy,
              margin: 0,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
            }}
          >
            Tous les matchs<br />de la saison.
          </h2>
        </div>
        <CalendarBoard
          matches={matches}
          mobileVariant={isMobile}
          emptyLabel={`Aucun match programmé pour ${club.name} en ${mode === 'gazon' ? 'gazon' : 'salle'} cette saison.`}
        />
      </div>

      {/* Classement(s) */}
      <div
        id="classement"
        style={{
          background: LRH.paperWarm,
          paddingTop: isMobile ? 32 : 48,
          paddingBottom: isMobile ? 32 : 56,
        }}
      >
        <div style={{ padding: isMobile ? '0 16px 12px' : '0 64px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ width: 28, height: 2, background: LRH.red }} />
            <span
              style={{
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                color: LRH.red,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              03 · Classement
            </span>
          </div>
          <h2
            style={{
              ...display,
              fontWeight: 700,
              fontSize: isMobile ? 28 : 38,
              color: LRH.navy,
              margin: 0,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
            }}
          >
            La position du club,<br />en contexte.
          </h2>
        </div>
        {standings.length === 0 ? (
          <div
            style={{
              margin: isMobile ? '16px 16px 0' : '24px 64px 0',
              padding: 32,
              background: '#fff',
              border: '1px solid ' + LRH.hair,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                ...mono,
                fontSize: 11,
                color: LRH.mute,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              [ vide ]
            </div>
            <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>
              {club.name} n'est engagé dans aucune compétition {mode === 'gazon' ? 'gazon' : 'salle'} cette saison.
            </div>
          </div>
        ) : (
          standings.map((comp) => (
            <CompetitionStandingsBlock
              key={comp.id}
              comp={comp}
              matches={matches}
              highlightClubId={club.id}
              mobileVariant={isMobile}
            />
          ))
        )}
      </div>

      {/* Effectif */}
      {members.length > 0 && (
        <EffectifBoard
          members={members}
          club={{
            name: club.name,
            shortCode: club.shortCode,
            logo: club.logo,
            primaryColor: club.primaryColor,
          }}
          mobileVariant={isMobile}
        />
      )}

      {/* Actualités */}
      {news.length > 0 && (
        <div id="actualites">
          {isMobile ? <NewsMobile news={news} /> : <NewsDesktop news={news} />}
        </div>
      )}

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
