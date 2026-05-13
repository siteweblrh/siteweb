'use client';

import React from 'react';
import Link from 'next/link';
import {
  LRH, mono, display, body, heroPlaceholderStyle, LrhLockup,
  ClubCrest, ImageSlot, clubName, CTAButton, Card, CardHeader, CardHeaderDark, Stat
} from './tokens';
import { getCategoryMeta } from '@/lib/blog/categories';
import { generateExcerpt, getReadingTimeMinutes } from '@/lib/utils/excerpt';
import type { HomeNewsItem, ModeData } from '@/lib/queries/home';
import { formatMatchDay, formatMatchTime, formatStatus } from '@/lib/utils/match-format';

const CATEGORY_TONE: Record<string, 'sun' | 'turf' | 'indoor' | 'paper' | 'navy'> = {
  ACTUALITE: 'sun',
  RESULTAT: 'turf',
  EVENEMENT: 'indoor',
  COMMUNIQUE: 'paper',
};

function MobileHeader({ mode, setMode }: { mode: 'gazon' | 'salle', setMode: (m: 'gazon' | 'salle') => void }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid ' + LRH.hair, position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{
        background: LRH.navy, color: 'rgba(255,255,255,0.7)',
        padding: '5px 16px', ...mono, fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase', textAlign: 'center',
      }}>
        ● Saint-Denis · 27°C — J–04 Coupe de la Réunion
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
        <LrhLockup height={44} />
        <a href="/dashboard" style={{
          width: 36, height: 36, borderRadius: 8, background: LRH.paperWarm,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...mono, fontWeight: 800, fontSize: 14, color: LRH.navy,
          textDecoration: 'none'
        }}>≡</a>
      </div>
      <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex', padding: 4, borderRadius: 999, background: LRH.navy, width: '100%',
        }}>
          {(['gazon', 'salle'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, ...body, fontWeight: 700, fontSize: 12,
              color: mode === m ? LRH.navy : 'rgba(255,255,255,0.65)',
              background: mode === m ? LRH.gold : 'transparent',
              border: 'none', borderRadius: 999, padding: '10px 0',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: mode === m ? LRH.navy : 'rgba(255,255,255,0.3)' }} />
              {m === 'gazon' ? 'Gazon' : 'Salle'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileHero({ mode, featured }: { mode: 'gazon' | 'salle', featured: ModeData['featured'] }) {
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
        {/* Glass score */}
        {featured && (
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
            <div style={{
              padding: 16, borderRadius: 16,
              background: 'rgba(15,25,45,0.5)',
              backdropFilter: 'blur(20px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: '#fff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 9, letterSpacing: '0.16em', color: LRH.gold, textTransform: 'uppercase', marginBottom: 12 }}>
                <span>★ Match Choc{featured.matchday ? ` · J${featured.matchday}` : ''}</span>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{formatMatchDay(featured.kickoffAt)} {formatMatchTime(featured.kickoffAt)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ClubCrest id={featured.homeClub.shortCode ?? undefined} size={32} />
                <div style={{ flex: 1, ...display, fontWeight: 700, fontSize: 13 }}>{featured.homeClub.name}</div>
                <div style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em' }}>{featured.homeScore ?? '—'}</div>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ClubCrest id={featured.awayClub.shortCode ?? undefined} size={32} />
                <div style={{ flex: 1, ...display, fontWeight: 700, fontSize: 13 }}>{featured.awayClub.name}</div>
                <div style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', color: (featured.awayScore ?? 0) > (featured.homeScore ?? 0) ? LRH.gold : '#fff' }}>{featured.awayScore ?? '—'}</div>
              </div>
            </div>
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

function MobileBento({ mode, lastResult, standingsTop }: { mode: 'gazon' | 'salle', lastResult: ModeData['lastResult'], standingsTop: ModeData['standingsTop'] }) {
  return (
    <div style={{ padding: '36px 16px 0' }}>
      <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>
        01 · La semaine
      </div>
      <h2 style={{ ...display, fontWeight: 700, fontSize: 30, color: LRH.navy, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
        Résultats &amp; classement.
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        {/* Last result */}
        {lastResult ? (
          <Card>
            <CardHeader kicker="Dernier résultat" meta={lastResult.matchday ? `J${lastResult.matchday}` : ''} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <ClubCrest id={lastResult.homeClub.shortCode ?? undefined} size={40} />
              <div style={{ flex: 1, ...display, fontWeight: 700, fontSize: 14, color: LRH.navy }}>{lastResult.homeClub.name}</div>
              <div style={{ ...display, fontWeight: 800, fontSize: 30, color: (lastResult.homeScore ?? 0) > (lastResult.awayScore ?? 0) ? LRH.navy : LRH.mute, letterSpacing: '-0.03em' }}>{lastResult.homeScore ?? '—'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <ClubCrest id={lastResult.awayClub.shortCode ?? undefined} size={40} />
              <div style={{ flex: 1, ...display, fontWeight: 700, fontSize: 14, color: LRH.navy }}>{lastResult.awayClub.name}</div>
              <div style={{ ...display, fontWeight: 800, fontSize: 30, color: (lastResult.awayScore ?? 0) > (lastResult.homeScore ?? 0) ? LRH.red : LRH.mute, letterSpacing: '-0.03em' }}>{lastResult.awayScore ?? '—'}</div>
            </div>
            {lastResult.sponsor && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed ' + LRH.hairStrong, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Présenté par</span>
                <div style={{ padding: '3px 8px', borderRadius: 3, background: LRH.navy, color: LRH.gold, ...display, fontWeight: 800, fontSize: 10 }}>{lastResult.sponsor.name.toUpperCase()}</div>
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <CardHeader kicker="Dernier résultat" meta="" />
            <p style={{ ...body, fontSize: 13, color: LRH.mute, marginTop: 12 }}>Aucun résultat.</p>
          </Card>
        )}

        {/* Top 3 */}
        <Card dark>
          <CardHeaderDark kicker="Top 3" meta={mode === 'gazon' ? 'D1 GAZON' : 'D1 SALLE'} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {standingsTop.length === 0 ? (
              <div style={{ ...body, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Aucun classement.</div>
            ) : standingsTop.map((s) => (
              <div key={s.club.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ ...display, fontWeight: 800, fontSize: 20, color: s.rank === 1 ? LRH.gold : '#fff', minWidth: 24 }}>{s.rank.toString().padStart(2, '0')}</div>
                <ClubCrest id={s.club.shortCode ?? undefined} size={30} />
                <div style={{ flex: 1, ...display, fontWeight: 600, fontSize: 13 }}>{s.club.name}</div>
                <div style={{ ...display, fontWeight: 700, fontSize: 16 }}>{s.points}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MobileCompetitions({ mode, upcoming }: { mode: 'gazon' | 'salle', upcoming: ModeData['upcoming'] }) {
  return (
    <div style={{ padding: '36px 0 0' }}>
      <div style={{ padding: '0 16px' }}>
        <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>
          02 · Calendrier
        </div>
        <h2 style={{ ...display, fontWeight: 700, fontSize: 30, color: LRH.navy, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          Les prochaines journées.
        </h2>
      </div>
      <div style={{
        marginTop: 18, padding: '0 16px 4px', display: 'flex', gap: 8, overflowX: 'auto',
      }}>
        {['D1 ' + (mode === 'gazon' ? 'Gazon' : 'Salle'), 'D2', 'U18', 'Féminines', 'Coupe'].map((c, i) => (
          <div key={c} style={{
            padding: '7px 12px', borderRadius: 999, flexShrink: 0,
            background: i === 0 ? LRH.navy : '#fff', color: i === 0 ? '#fff' : LRH.ink2,
            border: i === 0 ? 'none' : '1px solid ' + LRH.hairStrong,
            ...body, fontSize: 11.5, fontWeight: 700,
          }}>{c}</div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {upcoming.length === 0 ? (
          <Card style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: 0 }}>Aucun match programmé.</p>
          </Card>
        ) : upcoming.map((m) => (
          <Card key={m.id} style={{ padding: 16 }}>
            <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.12em', marginBottom: 10 }}>
              {formatMatchDay(m.kickoffAt)} · {formatMatchTime(m.kickoffAt)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ClubCrest id={m.homeClub.shortCode ?? undefined} size={28} />
                <span style={{ ...display, fontSize: 13, fontWeight: 600, color: LRH.navy }}>{m.homeClub.name}</span>
              </div>
              <span style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.1em' }}>VS</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse' }}>
                <ClubCrest id={m.awayClub.shortCode ?? undefined} size={28} />
                <span style={{ ...display, fontSize: 13, fontWeight: 600, color: LRH.navy }}>{m.awayClub.name}</span>
              </div>
            </div>
            {m.venue && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + LRH.hair, ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                📍 {m.venue}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function MobileNews({ news }: { news: HomeNewsItem[] }) {
  return (
    <div style={{ padding: '40px 16px 16px', background: LRH.paper }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          03 · Actualités
        </div>
        <Link href="/actualites" style={{ ...mono, fontSize: 10, color: LRH.navy, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none' }}>
          Voir tout →
        </Link>
      </div>
      <h2 style={{ ...display, fontWeight: 700, fontSize: 30, color: LRH.navy, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
        Le terrain raconte<br/>plus que le score.
      </h2>
      {news.length === 0 ? (
        <div style={{ marginTop: 22, padding: 24, background: '#fff', borderRadius: 12, border: '1px solid ' + LRH.hair, textAlign: 'center' }}>
          <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: 0 }}>Aucune actualité publiée pour le moment.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
          {news.map((item, i) => {
            const cat = getCategoryMeta(item.category);
            const tone = CATEGORY_TONE[item.category] ?? 'sun';
            const big = i === 0;
            const minutes = getReadingTimeMinutes(item.content);
            return (
              <Link key={item.id} href={`/actualites/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {item.coverImage ? (
                    <div style={{ height: big ? 200 : 140, background: `url(${item.coverImage}) center / cover no-repeat` }} />
                  ) : (
                    <ImageSlot label={cat.label} height={big ? 200 : 140} tone={tone} radius={0} />
                  )}
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ padding: '3px 8px', borderRadius: 3, background: cat.bg, color: cat.fg, ...mono, fontSize: 8.5, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase' }}>{cat.label}</div>
                      <div style={{ ...mono, fontSize: 9, color: LRH.mute }}>● {minutes.toString().padStart(2, '0')} min</div>
                    </div>
                    <h3 style={{ ...display, fontWeight: 700, fontSize: big ? 22 : 18, color: LRH.navy, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{item.title}</h3>
                    {item.club && (
                      <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed ' + LRH.hairStrong, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Publié par</span>
                        <span style={{ ...display, fontWeight: 800, fontSize: 11, color: LRH.navy }}>{item.club.name}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileTabBar() {
  return (
    <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid ' + LRH.hair, padding: '10px 0 calc(10px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'space-around' }}>
      {[
        { l: 'Accueil', active: true },
        { l: 'Matchs' },
        { l: 'Clubs' },
        { l: 'Licence' },
        { l: 'Compte' },
      ].map((t) => (
        <div key={t.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: t.active ? LRH.navy : LRH.hair }} />
          <div style={{ ...mono, fontSize: 8.5, fontWeight: 700, color: t.active ? LRH.navy : LRH.mute, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t.l}</div>
        </div>
      ))}
    </div>
  );
}

export function HomeMobile({ mode, setMode, news, modeData }: { mode: 'gazon' | 'salle', setMode: (m: 'gazon' | 'salle') => void, news: HomeNewsItem[], modeData: ModeData }) {
  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100%' }}>
      <MobileHeader mode={mode} setMode={setMode} />
      <MobileHero mode={mode} featured={modeData.featured} />
      <MobileBento mode={mode} lastResult={modeData.lastResult} standingsTop={modeData.standingsTop} />
      <MobileCompetitions mode={mode} upcoming={modeData.upcoming} />
      <MobileNews news={news} />
      <MobileTabBar />
    </div>
  );
}
