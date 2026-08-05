'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LRH, body, display, mono, MODE_COLOR, categoryAccent } from '../tokens';
import { SeasonUrlSelector } from '../sections/SeasonUrlSelector';
import {
  HeaderDesktop, HeaderMobile, FooterDesktop, MobileTabBar,
  PageHero, StandingsBoard,
  SeasonToggle, MobileSeasonToggle,
  type Mode,
} from '../sections';
import type { ContentKey } from '@/lib/siteContent';
import type { YouthCompetition, AllModeMatch } from '@/lib/queries/competition';

type ContentMap = Record<ContentKey, string>;

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023.98px)');
    const handler = () => setM(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
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

function CategoryFilter({
  categories, active, onPick, mobileVariant,
}: {
  categories: string[];
  active: string | 'ALL';
  onPick: (cat: string | 'ALL') => void;
  mobileVariant: boolean;
}) {
  const items: { key: string | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'Toutes' },
    ...categories.map((c) => ({ key: c, label: c })),
  ];
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8,
    }}>
      {items.map((it) => {
        const isActive = active === it.key;
        const accent = it.key === 'ALL' ? LRH.navy : categoryAccent(String(it.key));
        return (
          <button
            key={String(it.key)}
            type="button"
            onClick={() => onPick(it.key)}
            style={{
              ...mono, fontSize: 11, fontWeight: 700,
              padding: '7px 13px',
              border: '1px solid ' + (isActive ? accent : LRH.hairStrong),
              background: isActive ? accent : '#fff',
              color: isActive ? '#fff' : LRH.ink2,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function CompetitionBlock({
  comp, matchesForMode, mobileVariant,
}: {
  comp: YouthCompetition;
  matchesForMode: AllModeMatch[];
  mobileVariant: boolean;
}) {
  const modeMeta = MODE_COLOR[comp.mode];
  const accent = categoryAccent(comp.category);
  const isCup = comp.format === 'CUP';
  // On filtre les matches pour ne garder que ceux qui touchent cette compétition.
  const matches = matchesForMode.filter((m) => m.competition?.id === comp.id);

  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hairStrong,
        borderLeft: `4px solid ${accent}`,
      }}
    >
      {/* Header compétition */}
      <header
        style={{
          padding: mobileVariant ? '16px 16px 14px' : '20px 22px 16px',
          borderBottom: '1px solid ' + LRH.hair,
          display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', gap: 12,
        }}
      >
        <span style={{
          ...mono, fontSize: 10, fontWeight: 800,
          padding: '4px 8px',
          background: accent, color: '#fff',
          letterSpacing: '0.16em',
        }}>
          {comp.category}
        </span>
        <span style={{
          ...mono, fontSize: 10, fontWeight: 700,
          padding: '4px 8px',
          background: modeMeta.soft, color: modeMeta.bg,
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          ◉ {modeMeta.label}
        </span>
        <h3 style={{
          ...display, fontWeight: 800,
          fontSize: mobileVariant ? 16 : 20,
          color: LRH.navy, margin: 0,
          letterSpacing: '-0.02em', lineHeight: 1.2,
          flex: '1 1 220px',
          overflowWrap: 'break-word', wordBreak: 'break-word',
        }}>
          {comp.name}
        </h3>
        <span style={{
          ...mono, fontSize: 10, color: LRH.mute,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {comp.season} · {comp._count.entries} équipe{comp._count.entries > 1 ? 's' : ''}
        </span>
      </header>

      {/* Body : classement OU placeholder coupe OU placeholder vide */}
      {isCup ? (
        <div style={{
          padding: mobileVariant ? '24px 16px' : '32px 22px',
          textAlign: 'center',
        }}>
          <div style={{
            ...mono, fontSize: 10, fontWeight: 700,
            color: LRH.mute, letterSpacing: '0.22em',
            textTransform: 'uppercase', marginBottom: 10,
          }}>⚡ Format coupe</div>
          <p style={{
            ...body, fontSize: 14, color: LRH.ink2,
            margin: '0 auto 16px', maxWidth: 460, lineHeight: 1.6,
          }}>
            Cette compétition se joue en élimination directe — pas de classement régulier, consultez le bracket pour les confrontations.
          </p>
          <Link
            href={`/classements?mode=${comp.mode.toLowerCase()}`}
            style={{
              ...mono, fontSize: 11, fontWeight: 700,
              padding: '10px 18px',
              background: LRH.navy, color: '#fff',
              textDecoration: 'none',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              display: 'inline-block',
            }}
          >
            Voir le bracket →
          </Link>
        </div>
      ) : comp.standings.length === 0 ? (
        <div style={{
          padding: mobileVariant ? '24px 16px' : '32px 22px',
          textAlign: 'center',
        }}>
          <div style={{
            ...mono, fontSize: 10, fontWeight: 700,
            color: LRH.mute, letterSpacing: '0.22em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>◌ Classement à venir</div>
          <p style={{
            ...body, fontSize: 13.5, color: LRH.ink2,
            margin: 0, lineHeight: 1.6,
          }}>
            Les premières journées n'ont pas encore été jouées. Le classement sera mis à jour automatiquement après chaque match terminé.
          </p>
        </div>
      ) : (
        // Mode "compact" du StandingsBoard intégré dans une card
        <div style={{ padding: mobileVariant ? '0' : '0' }}>
          <StandingsBoard
            rows={comp.standings}
            matches={matches}
            mobileVariant={mobileVariant}
          />
        </div>
      )}

      {/* Actions */}
      <footer
        style={{
          padding: mobileVariant ? '12px 16px 14px' : '14px 22px 18px',
          borderTop: '1px solid ' + LRH.hair,
          display: 'flex', flexWrap: 'wrap', gap: 10,
        }}
      >
        <Link
          href={`/competitions?mode=${comp.mode.toLowerCase()}`}
          style={{
            ...mono, fontSize: 10.5, fontWeight: 700,
            padding: '8px 14px',
            background: 'transparent', color: LRH.navy,
            border: '1px solid ' + LRH.hairStrong,
            textDecoration: 'none',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            flex: '1 1 auto', textAlign: 'center', minWidth: 140,
          }}
        >
          Calendrier complet →
        </Link>
        {!isCup && comp.standings.length > 0 && (
          <Link
            href={`/classements?mode=${comp.mode.toLowerCase()}&season=${encodeURIComponent(comp.season)}`}
            style={{
              ...mono, fontSize: 10.5, fontWeight: 700,
              padding: '8px 14px',
              background: 'transparent', color: LRH.navy,
              border: '1px solid ' + LRH.hairStrong,
              textDecoration: 'none',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              flex: '1 1 auto', textAlign: 'center', minWidth: 140,
            }}
          >
            Vue complète →
          </Link>
        )}
      </footer>
    </article>
  );
}

function InfoBlock({
  num, title, body: text, accent = LRH.red, mobileVariant,
}: {
  num: string;
  title: string;
  body: string;
  accent?: string;
  mobileVariant: boolean;
}) {
  return (
    <article style={{
      background: '#fff',
      border: '1px solid ' + LRH.hair,
      borderTop: `3px solid ${accent}`,
      padding: mobileVariant ? 18 : 22,
    }}>
      <div style={{
        ...mono, fontSize: 10, fontWeight: 800,
        color: accent, letterSpacing: '0.22em',
        marginBottom: 10,
      }}>{num}</div>
      <h3 style={{
        ...display, fontWeight: 800,
        fontSize: mobileVariant ? 19 : 21,
        color: LRH.navy, margin: 0,
        letterSpacing: '-0.02em', lineHeight: 1.15,
      }}>{title}</h3>
      <p style={{
        ...body, fontSize: 14,
        color: LRH.ink2, marginTop: 12, marginBottom: 0,
        lineHeight: 1.65, whiteSpace: 'pre-line',
      }}>{text}</p>
    </article>
  );
}

export function JeunesPageClient({
  competitions,
  matchesByMode,
  seasons,
  activeSeason,
  content,
  heroSubtitle,
}: {
  competitions: YouthCompetition[];
  matchesByMode: { GAZON: AllModeMatch[]; SALLE: AllModeMatch[] };
  seasons: string[];
  activeSeason: string | null;
  content: ContentMap;
  heroSubtitle: string;
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');
  const [activeCat, setActiveCat] = useState<string | 'ALL'>('ALL');

  const categories = useMemo(() => {
    // Liste des catégories dynamiques présentes dans la sélection (déjà filtrée
    // par saison côté server). Ordre : tri alpha "naturel" (U9 avant U11).
    const set = new Set(competitions.map((c) => c.category));
    return Array.from(set).sort((a, b) => {
      // Si les deux sont U<n>, tri numérique. Sinon tri alpha.
      const ma = a.match(/^U(\d+)/i);
      const mb = b.match(/^U(\d+)/i);
      if (ma && mb) return parseInt(ma[1], 10) - parseInt(mb[1], 10);
      if (ma) return -1;
      if (mb) return 1;
      return a.localeCompare(b);
    });
  }, [competitions]);

  const modeUpper: 'GAZON' | 'SALLE' = mode === 'gazon' ? 'GAZON' : 'SALLE';

  const filtered = useMemo(() => {
    return competitions.filter((c) => {
      if (c.mode !== modeUpper) return false;
      if (activeCat !== 'ALL' && c.category !== activeCat) return false;
      return true;
    });
  }, [competitions, modeUpper, activeCat]);

  const introTitle = content['jeunes.intro.title'];
  const introBody = content['jeunes.intro.body'];
  const emptyText = content['jeunes.empty.text'];
  const ctaTitle = content['jeunes.cta.title'];
  const ctaEmail = content['jeunes.cta.email'];
  const ctaNote = content['jeunes.cta.note'];

  const infoBlocks = [
    { num: '01', title: content['jeunes.encadr.title'], body: content['jeunes.encadr.body'], accent: LRH.gold },
    { num: '02', title: content['jeunes.detection.title'], body: content['jeunes.detection.body'], accent: LRH.red },
    { num: '03', title: content['jeunes.ethique.title'], body: content['jeunes.ethique.body'], accent: LRH.navy },
  ];

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh', overflowX: 'hidden' }}>
      {isMobile ? <HeaderMobile mode={mode} setMode={setMode} /> : <HeaderDesktop mode={mode} setMode={setMode} />}

      <PageHero
        mobileVariant={isMobile}
        index="05"
        kicker="Championnat · Catégories jeunes"
        title={"La relève\nsur le terrain."}
        subtitle={heroSubtitle}
        tag={`${competitions.length} compétition${competitions.length > 1 ? 's' : ''} référencée${competitions.length > 1 ? 's' : ''}`}
        rightSlot={isMobile ? <MobileSeasonToggle mode={mode} setMode={setMode} /> : <SeasonToggle mode={mode} setMode={setMode} size="lg" />}
      />

      <AnchorRail
        mobileVariant={isMobile}
        items={[
          { id: 'competitions', label: 'Compétitions & classements' },
          { id: 'encadrement', label: 'Encadrement & éthique' },
          { id: 'contact', label: 'Contact' },
        ]}
      />

      {/* Intro */}
      <section style={{
        background: LRH.paper,
        padding: isMobile ? '36px 16px 20px' : 'clamp(48px, 6vw, 72px) clamp(24px, 5vw, 64px) 20px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
          gap: isMobile ? 24 : 56,
          alignItems: 'flex-end',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ width: 28, height: 2, background: LRH.red }} />
              <span style={{
                ...mono, fontSize: 10.5, fontWeight: 700,
                color: LRH.red, letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}>01 · Compétitions par catégorie</span>
            </div>
            <h2 style={{
              ...display, fontWeight: 700,
              fontSize: isMobile ? 30 : 44,
              color: LRH.navy, margin: 0,
              letterSpacing: '-0.035em', lineHeight: 1.05,
              whiteSpace: 'pre-line',
            }}>{introTitle}</h2>
          </div>
          <p style={{
            ...body, fontSize: isMobile ? 14 : 15.5,
            color: LRH.ink2, lineHeight: 1.65,
            margin: 0, whiteSpace: 'pre-line',
          }}>{introBody}</p>
        </div>
      </section>

      {/* Bandeau filtres : catégorie + saison */}
      <div style={{
        background: '#fff',
        borderTop: '1px solid ' + LRH.hair,
        borderBottom: '1px solid ' + LRH.hair,
        padding: isMobile ? '14px 16px' : '16px clamp(24px, 5vw, 64px)',
        display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', gap: isMobile ? 14 : 24,
        justifyContent: 'space-between',
      }}>
        <CategoryFilter
          categories={categories}
          active={activeCat}
          onPick={setActiveCat}
          mobileVariant={isMobile}
        />
        {seasons.length > 1 && (
          <SeasonUrlSelector
            seasons={seasons}
            active={activeSeason}
            basePath="/jeunes"
            mobileVariant={isMobile}
          />
        )}
      </div>

      {/* Liste des compétitions */}
      <section id="competitions" style={{
        background: LRH.paper,
        padding: isMobile ? '24px 16px 40px' : '32px clamp(24px, 5vw, 64px) clamp(48px, 5vw, 72px)',
      }}>
        {filtered.length === 0 ? (
          <div style={{
            background: '#fff',
            border: '1px dashed ' + LRH.hairStrong,
            padding: isMobile ? 22 : 36,
            textAlign: 'center',
          }}>
            <div style={{
              ...mono, fontSize: 10, fontWeight: 700,
              color: LRH.mute, letterSpacing: '0.22em',
              textTransform: 'uppercase', marginBottom: 10,
            }}>◌ Aucune compétition</div>
            <p style={{
              ...body, fontSize: 14.5,
              color: LRH.ink2, lineHeight: 1.65,
              margin: '0 auto', maxWidth: 540,
              whiteSpace: 'pre-line',
            }}>{emptyText}</p>
          </div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: isMobile ? 20 : 32,
          }}>
            {filtered.map((c) => (
              <CompetitionBlock
                key={c.id}
                comp={c}
                matchesForMode={matchesByMode[c.mode]}
                mobileVariant={isMobile}
              />
            ))}
          </div>
        )}
      </section>

      {/* Info blocks : encadrement / détection / éthique */}
      <section id="encadrement" style={{
        background: '#fff',
        borderTop: '1px solid ' + LRH.hair,
        padding: isMobile ? '40px 16px' : 'clamp(48px, 6vw, 72px) clamp(24px, 5vw, 64px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22 }}>
          <span style={{ width: 28, height: 2, background: LRH.gold }} />
          <span style={{
            ...mono, fontSize: 10.5, fontWeight: 700,
            color: LRH.navy, letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}>02 · Cadre & valeurs</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: isMobile ? 16 : 'clamp(16px, 2vw, 24px)',
        }}>
          {infoBlocks.map((b) => (
            <InfoBlock key={b.num} {...b} mobileVariant={isMobile} />
          ))}
        </div>
      </section>

      {/* CTA contact */}
      <section id="contact" style={{
        background: LRH.navy, color: '#fff',
        padding: isMobile ? '36px 16px' : 'clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px)',
        position: 'relative', overflow: 'hidden',
        borderTop: '4px solid ' + LRH.gold,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(112deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 30px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 18,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...mono, fontSize: 10, fontWeight: 800,
              color: LRH.gold, letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}>◆ Commission jeunesse</div>
            <div style={{
              ...display, fontWeight: 800,
              fontSize: isMobile ? 22 : 26,
              color: '#fff', letterSpacing: '-0.02em',
              marginTop: 6, lineHeight: 1.2,
              whiteSpace: 'pre-line',
            }}>{ctaTitle}</div>
            <div style={{
              ...body, fontSize: 13.5,
              color: 'rgba(255,255,255,0.78)',
              marginTop: 8, whiteSpace: 'pre-line', maxWidth: 640,
            }}>{ctaNote}</div>
          </div>
          {ctaEmail && (
            <a
              href={`mailto:${ctaEmail}?subject=Championnat%20Jeunes%20-%20LRH`}
              style={{
                ...display, fontWeight: 800,
                fontSize: isMobile ? 13 : 15,
                background: LRH.gold, color: LRH.navy,
                padding: isMobile ? '14px 16px' : '14px 22px',
                textDecoration: 'none',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                textAlign: 'center',
                border: '2px solid ' + LRH.gold,
                wordBreak: 'break-all',
              }}
            >{ctaEmail}</a>
          )}
        </div>
      </section>

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
