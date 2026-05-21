import React from 'react';
import Link from 'next/link';
import { listContentOverrides } from '@/lib/actions/siteContent';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import {
  CONTENT_DEFS,
  CONTENT_CATEGORY_ORDER,
  CONTENT_CATEGORY_LABEL,
  CONTENT_CATEGORY_DESCRIPTION,
  CONTENT_CATEGORY_PUBLIC_URL,
  type ContentKey,
} from '@/lib/siteContent';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function ContenuAdminIndexPage() {
  const [ctx, overrides] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listContentOverrides(),
  ]);
  const { sidebarProps } = ctx;

  // Index : on calcule par catégorie le nb de clés total + nb d'overrides + dernière modif.
  const overridesByKey = new Map(overrides.map((o) => [o.key, o]));
  const stats: Record<string, { total: number; modified: number; lastUpdate: Date | null }> = {};
  for (const key of Object.keys(CONTENT_DEFS) as ContentKey[]) {
    const cat = CONTENT_DEFS[key].category;
    if (!stats[cat]) stats[cat] = { total: 0, modified: 0, lastUpdate: null };
    stats[cat].total++;
    const ov = overridesByKey.get(key);
    if (ov) {
      stats[cat].modified++;
      if (!stats[cat].lastUpdate || ov.updatedAt > stats[cat].lastUpdate) {
        stats[cat].lastUpdate = ov.updatedAt;
      }
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-contenu">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div
              style={{
                ...mono,
                fontSize: 11,
                color: LRH.red,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Administration ligue
            </div>
            <h2
              style={{
                ...display,
                fontWeight: 700,
                fontSize: 'clamp(22px, 4vw, 32px)',
                color: LRH.navy,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Contenu du site.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Choisissez la page ou le bloc à modifier. Chaque card regroupe les
              textes éditoriaux d&apos;une zone du site public — sous-titres, intros,
              CTAs, URLs réseaux sociaux. Cliquez pour ouvrir l&apos;éditeur dédié.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {CONTENT_CATEGORY_ORDER.map((cat, i) => {
              const s = stats[cat];
              if (!s || s.total === 0) return null;
              const label = CONTENT_CATEGORY_LABEL[cat] ?? cat;
              const desc = CONTENT_CATEGORY_DESCRIPTION[cat] ?? '';
              const publicUrl = CONTENT_CATEGORY_PUBLIC_URL[cat];
              const hasOverrides = s.modified > 0;
              const num = String(i + 1).padStart(2, '0');
              return (
                <Link
                  key={cat}
                  href={`/dashboard/ligue/contenu/${cat}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    background: '#fff',
                    border: '1px solid ' + LRH.hair,
                    borderLeft: `4px solid ${hasOverrides ? '#1d6b3f' : LRH.gold}`,
                    padding: '18px 20px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    minHeight: 180,
                    transition: 'box-shadow 0.18s, transform 0.18s',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  className="lrh-contenu-card"
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        ...mono,
                        fontSize: 10,
                        color: hasOverrides ? '#1d6b3f' : LRH.red,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      {num} · {hasOverrides ? 'Modifié' : 'Par défaut'}
                    </span>
                    {hasOverrides && (
                      <span
                        style={{
                          ...mono,
                          fontSize: 9,
                          fontWeight: 800,
                          color: '#1d6b3f',
                          background: 'rgba(29,107,63,0.1)',
                          border: '1px solid rgba(29,107,63,0.3)',
                          padding: '2px 6px',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                        }}
                      >
                        ◉ {s.modified}/{s.total}
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      ...display,
                      fontWeight: 700,
                      fontSize: 18,
                      color: LRH.navy,
                      margin: 0,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2,
                    }}
                  >
                    {label}
                  </h3>

                  {desc && (
                    <p
                      style={{
                        ...body,
                        fontSize: 12.5,
                        color: LRH.mute,
                        margin: 0,
                        lineHeight: 1.5,
                        flex: 1,
                      }}
                    >
                      {desc}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginTop: 4,
                      paddingTop: 10,
                      borderTop: '1px dashed ' + LRH.hairStrong,
                    }}
                  >
                    <span
                      style={{
                        ...mono,
                        fontSize: 10,
                        color: LRH.mute,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {s.total} clé{s.total > 1 ? 's' : ''}
                    </span>
                    {publicUrl && (
                      <span
                        style={{
                          ...mono,
                          fontSize: 9.5,
                          color: LRH.mute,
                          letterSpacing: '0.06em',
                        }}
                      >
                        · {publicUrl}
                      </span>
                    )}
                    <span style={{ flex: 1 }} />
                    <span
                      style={{
                        ...mono,
                        fontSize: 11,
                        fontWeight: 800,
                        color: LRH.navy,
                        letterSpacing: '0.1em',
                      }}
                    >
                      Modifier →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
