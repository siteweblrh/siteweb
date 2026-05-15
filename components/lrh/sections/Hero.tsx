'use client';

import React from 'react';
import {
  LRH, mono, display, body, heroPlaceholderStyle, ClubCrest, CTAButton,
} from '../tokens';
import type { ModeData } from '@/lib/queries/home';
import { formatMatchDay, formatMatchTime, formatStatus } from '@/lib/utils/match-format';
import type { Mode } from './Header';

type Featured = NonNullable<ModeData['featured']>;

export function MatchChocGlass({ match, size = 'lg' }: { match: Featured; size?: 'lg' | 'sm' }) {
  const home = match.homeClub;
  const away = match.awayClub;
  const hs = match.homeScore;
  const as = match.awayScore;
  const homeWinning = hs != null && as != null && hs > as;
  const awayWinning = hs != null && as != null && as > hs;
  const isLg = size === 'lg';
  const crestSize = isLg ? 48 : 32;
  const nameFs = isLg ? 15 : 13;
  const scoreFs = isLg ? 38 : 26;
  const padding = isLg ? 22 : 16;

  return (
    <div style={{
      width: isLg ? 380 : '100%', padding,
      background: 'rgba(15,25,45,0.42)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      borderRadius: isLg ? 20 : 16,
      border: '1px solid rgba(255,255,255,0.14)',
      boxShadow: isLg ? '0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
      color: '#fff',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        ...mono, fontSize: isLg ? 10 : 9, letterSpacing: isLg ? '0.18em' : '0.16em',
        color: LRH.gold, textTransform: 'uppercase', marginBottom: isLg ? 14 : 12,
      }}>
        <span>★ Match Choc{match.matchday ? ` · J${match.matchday}` : ''}</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>
          {formatMatchDay(match.kickoffAt)} {formatMatchTime(match.kickoffAt)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: isLg ? 14 : 10 }}>
        <ClubCrest id={home.shortCode ?? undefined} size={crestSize} />
        <div style={{ flex: 1 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: nameFs }}>{home.name}</div>
          {isLg && <div style={{ ...mono, fontSize: 10, opacity: 0.55, letterSpacing: '0.06em' }}>Domicile</div>}
        </div>
        <div style={{
          ...display, fontWeight: 800, fontSize: scoreFs, lineHeight: 1, letterSpacing: '-0.04em',
          color: homeWinning ? LRH.gold : '#fff',
        }}>
          {hs ?? '—'}
        </div>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: isLg ? '14px 0' : '10px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: isLg ? 14 : 10 }}>
        <ClubCrest id={away.shortCode ?? undefined} size={crestSize} />
        <div style={{ flex: 1 }}>
          <div style={{ ...display, fontWeight: 700, fontSize: nameFs }}>{away.name}</div>
          {isLg && <div style={{ ...mono, fontSize: 10, opacity: 0.55, letterSpacing: '0.06em' }}>Visiteur</div>}
        </div>
        <div style={{
          ...display, fontWeight: 800, fontSize: scoreFs, lineHeight: 1, letterSpacing: '-0.04em',
          color: awayWinning ? LRH.gold : '#fff',
        }}>
          {as ?? '—'}
        </div>
      </div>
      {isLg && (
        <div style={{
          marginTop: 16, padding: '10px 12px', borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ ...mono, fontSize: 10, opacity: 0.7, letterSpacing: '0.08em' }}>
            {formatStatus(match.status, hs, as)}
          </div>
          {match.venue && (
            <div style={{ ...mono, fontSize: 10, opacity: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {match.venue.split('·')[0]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HeroDesktop({ mode, featured }: { mode: Mode; featured: ModeData['featured'] }) {
  const headline = mode === 'gazon' ? 'LE HOCKEY PEÏ,\nNIVEAU SUPÉRIEUR.' : 'LA SALLE\nÉLECTRIQUE.';
  return (
    <div style={{ padding: '32px 64px 0' }}>
      <div style={{
        position: 'relative', height: 640, borderRadius: 24, overflow: 'hidden',
        ...heroPlaceholderStyle({ tone: mode }),
      }}>
        <div style={{
          position: 'absolute', top: 20, left: 24,
          ...mono, fontSize: 10.5, color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          [&nbsp;HD&nbsp;VIDEO&nbsp;·&nbsp;{mode === 'gazon' ? 'STADE MANÈS · LE PORT' : 'GYMNASE CASABONA · LE TAMPON'}&nbsp;] — drop a 16:9 still or loop here
        </div>
        <div style={{
          position: 'absolute', top: 20, right: 24,
          display: 'flex', gap: 10, alignItems: 'center',
          ...mono, fontSize: 10.5, color: 'rgba(255,255,255,0.7)',
          letterSpacing: '0.12em',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: LRH.red,
            boxShadow: '0 0 0 4px rgba(168,32,47,0.25)',
          }} />
          LIVE
        </div>

        <div style={{
          position: 'absolute', left: 40, bottom: 40, right: 40,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32,
        }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.gold,
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14,
            }}>
              ● Saison {mode === 'gazon' ? 'Gazon 2025–2026' : 'Indoor 2026'} — Journée 14
            </div>
            <h1 style={{
              ...display, fontWeight: 800, fontSize: 88,
              lineHeight: 0.95, color: '#fff', margin: 0,
              letterSpacing: '-0.03em', whiteSpace: 'pre-line',
              textShadow: '0 2px 30px rgba(0,0,0,0.3)',
            }}>{headline}</h1>
            <div style={{
              marginTop: 24, ...body, fontSize: 15, color: 'rgba(255,255,255,0.78)',
              maxWidth: 480, lineHeight: 1.55,
            }}>
              Suivez les matchs, classements et licences de la Ligue Réunionnaise de Hockey en temps réel — gazon &amp; salle, du Port au Tampon, partout dans l'île.
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <CTAButton variant="gold" size="lg">Voir le live</CTAButton>
              <CTAButton variant="ghost" size="lg">
                <span style={{ color: '#fff' }}>Calendrier complet</span>
              </CTAButton>
            </div>
          </div>

          {featured && <MatchChocGlass match={featured} size="lg" />}
        </div>
      </div>
    </div>
  );
}

export function HeroMobile({ mode, featured }: { mode: Mode; featured: ModeData['featured'] }) {
  const headline = mode === 'gazon' ? 'LE HOCKEY\nPEÏ,\nNIVEAU\nSUPÉRIEUR.' : 'LA SALLE\nÉLECTRIQUE.';
  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div style={{
        position: 'relative', height: 540, borderRadius: 18, overflow: 'hidden',
        ...heroPlaceholderStyle({ tone: mode }),
      }}>
        <div style={{
          position: 'absolute', top: 14, left: 16, right: 16,
          display: 'flex', justifyContent: 'space-between',
          ...mono, fontSize: 8.5, color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          <span>[ {featured?.venue ? featured.venue.split('·')[0].trim().toUpperCase() : 'LRH'} ]</span>
          <span style={{ color: LRH.gold }}>{featured?.status === 'LIVE' ? '● LIVE' : ''}</span>
        </div>
        <div style={{
          position: 'absolute', left: 16, top: 60, right: 16,
        }}>
          <div style={{
            ...mono, fontSize: 9, color: LRH.gold,
            letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            ● Saison {mode === 'gazon' ? "'25–'26" : 'Indoor 26'}{featured?.matchday ? ` — J${featured.matchday}` : ''}
          </div>
          <h1 style={{
            ...display, fontWeight: 800, fontSize: 52,
            lineHeight: 0.92, color: '#fff', margin: 0,
            letterSpacing: '-0.035em', whiteSpace: 'pre-line',
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}>{headline}</h1>
        </div>
        {featured && (
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
            <MatchChocGlass match={featured} size="sm" />
          </div>
        )}
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <CTAButton variant="red" size="lg">Prendre une licence</CTAButton>
        <button style={{
          ...body, fontWeight: 700, fontSize: 13, color: LRH.navy,
          background: '#fff', border: '1px solid ' + LRH.hairStrong,
          borderRadius: 8, padding: '14px 16px',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          flexShrink: 0,
        }}>Live</button>
      </div>
    </div>
  );
}
