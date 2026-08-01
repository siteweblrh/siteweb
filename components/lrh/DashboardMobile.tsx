'use client';

import React from 'react';
import { sideName } from '@/lib/utils/match-side';
import {
  LRH, mono, display, body,
  ClubCrest, ImageSlot
} from './tokens';
import { LrhWordmark } from './tokens';

function DashMobileTopbar({ user, club }: any) {
  return (
    <div style={{ background: LRH.navy, color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LrhWordmark height={28} />
        <div>
          <div style={{ ...display, fontWeight: 700, fontSize: 13, lineHeight: 1 }}>Portail Clubs</div>
          <div style={{ ...mono, fontSize: 8.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginTop: 3 }}>
            {club?.name?.toUpperCase()}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: LRH.gold, color: LRH.navy, ...display, fontWeight: 800, fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {user?.name?.substring(0, 2).toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function DashMobileStats({ metrics }: any) {
  const stats = [
    { l: 'Licenciés', v: metrics.membersCount.toString(), d: '—' },
    { l: 'News',      v: metrics.newsCount.toString(),    d: '—' },
    { l: 'Sponsors',  v: metrics.sponsorsCount.toString(), d: '—' },
    { l: 'Matchs',    v: '0/0', d: '—' },
  ];
  return (
    <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          padding: 14, borderRadius: 12, background: '#fff', border: '1px solid ' + LRH.hair,
        }}>
          <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>{s.l}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <div style={{ ...display, fontWeight: 800, fontSize: 24, color: LRH.navy, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.v}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DashMobileRecent({ news }: any) {
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid ' + LRH.hair, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...display, fontWeight: 700, fontSize: 14, color: LRH.navy }}>Publications récentes</div>
          <span style={{ ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.06em' }}>{news.length}</span>
        </div>
        <div>
          {news.map((r: any, i: number) => (
            <div key={i} style={{
              padding: '12px 0', borderTop: '1px solid ' + LRH.hair,
              borderTopWidth: i === 0 ? 0 : 1, marginTop: i === 0 ? 12 : 0,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.published ? '#1F8A5B' : LRH.mute, marginTop: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ ...mono, fontSize: 8.5, color: r.published ? '#1F8A5B' : LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
                  {r.published ? 'En ligne' : 'Brouillon'}
                </div>
                <div style={{ ...body, fontSize: 12.5, fontWeight: 600, color: LRH.navy, marginTop: 3, lineHeight: 1.3 }}>{r.title}</div>
                <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.06em', marginTop: 4 }}>
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
          {news.length === 0 && (
            <div style={{ padding: '20px 0', textAlign: 'center', ...body, fontSize: 12, color: LRH.mute }}>
              Aucune publication
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardMobile({ club, news, metrics, user, summary = null }: any) {
  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      <DashMobileTopbar user={user} club={club} />
      <div style={{ padding: '22px 16px 0' }}>
        <h1 style={{ ...display, fontWeight: 700, fontSize: 28, color: LRH.navy, margin: 0, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
          Bonjour, {user?.name?.split(' ')[0]}
        </h1>
      </div>
      {summary && <DashMobileSummary summary={summary} clubId={club?.id} />}
      <DashMobileStats metrics={metrics} />
      <DashMobileRecent news={news} />
      {/* Tab bar and other items can remain for navigation */}
    </div>
  );
}

function DashMobileSummary({ summary, clubId }: { summary: any; clubId?: string }) {
  const { nextMatch, lastMatch, standings } = summary;
  if (!nextMatch && !lastMatch && (!standings || standings.length === 0)) return null;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Indian/Reunion' });

  return (
    <div style={{ padding: '20px 16px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {nextMatch && (
        <a
          href={`/match/${nextMatch.id}`}
          style={{
            textDecoration: 'none', color: 'inherit',
            background: '#fff', border: '1px solid ' + LRH.hair,
            borderLeft: `3px solid ${LRH.red}`,
            padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}
        >
          <div style={{ ...mono, fontSize: 9, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>
            Prochain · {nextMatch.competition.mode === 'GAZON' ? 'Gazon' : 'Salle'}
          </div>
          <div style={{ ...body, fontSize: 13, fontWeight: 700, color: LRH.navy, lineHeight: 1.3 }}>
            {sideName({ club: nextMatch.homeClub, label: nextMatch.homeLabel })} <span style={{ color: LRH.mute, margin: '0 4px' }}>vs</span> {sideName({ club: nextMatch.awayClub, label: nextMatch.awayLabel })}
          </div>
          <div style={{ ...mono, fontSize: 10.5, color: LRH.ink2 }}>
            {formatDate(nextMatch.kickoffAt)} · {formatTime(nextMatch.kickoffAt)}
          </div>
        </a>
      )}

      {lastMatch && lastMatch.homeScore != null && lastMatch.awayScore != null && (() => {
        const isHome = lastMatch.homeClubId === clubId;
        const ourScore = isHome ? lastMatch.homeScore : lastMatch.awayScore;
        const theirScore = isHome ? lastMatch.awayScore : lastMatch.homeScore;
        const opponent = isHome ? lastMatch.awayClub : lastMatch.homeClub;
        const result = ourScore > theirScore ? 'V' : ourScore < theirScore ? 'D' : 'N';
        const resultColor = result === 'V' ? '#1d6b3f' : result === 'D' ? LRH.red : LRH.mute;
        return (
          <a
            href={`/match/${lastMatch.id}`}
            style={{
              textDecoration: 'none', color: 'inherit',
              background: '#fff', border: '1px solid ' + LRH.hair,
              borderLeft: `3px solid ${resultColor}`,
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ background: resultColor, color: '#fff', padding: '4px 8px', fontWeight: 800, fontSize: 12, ...mono, letterSpacing: '0.08em' }}>
              {result}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                Dernier résultat
              </div>
              <div style={{ ...body, fontSize: 13, fontWeight: 700, color: LRH.navy }}>
                {isHome ? 'vs' : '@'} {opponent.name}
              </div>
            </div>
            <div style={{ ...display, fontSize: 22, fontWeight: 800, color: LRH.navy, letterSpacing: '-0.02em' }}>
              {ourScore} <span style={{ color: LRH.mute, fontWeight: 400 }}>—</span> {theirScore}
            </div>
          </a>
        );
      })()}
    </div>
  );
}
