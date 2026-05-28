import React from 'react';
import { redirect } from 'next/navigation';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';
import { listDocumentsForClub, type DocumentClubRow } from '@/lib/actions/document';

export default async function ClubDocumentsPage() {
  const user = await getDashboardUser();
  if (!user) redirect('/auth/login');

  const [ctx, documents] = await Promise.all([
    getDashboardContext(),
    listDocumentsForClub(),
  ]);
  const { sidebarProps } = ctx;

  // Groupe par catégorie pour lisibilité ; "Sans catégorie" en fin.
  const grouped = new Map<string, DocumentClubRow[]>();
  for (const d of documents) {
    const key = d.category || '— Sans catégorie —';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  }
  const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
    if (a.startsWith('—')) return 1;
    if (b.startsWith('—')) return -1;
    return a.localeCompare(b, 'fr');
  });

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="documents">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Gestion du club · Documents
            </div>
            <h2 style={{
              ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Documents de la ligue.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Règlements, formulaires, statuts officiels mis à disposition par la LRH. Cliquez sur un document pour l'ouvrir ou le télécharger depuis Google Drive.
            </p>
          </div>

          {documents.length === 0 ? (
            <div style={{
              padding: 48, textAlign: 'center',
              background: '#fff', border: '2px dashed ' + LRH.hairStrong,
            }}>
              <div style={{ ...display, fontSize: 18, color: LRH.navy, marginBottom: 8 }}>
                Aucun document partagé
              </div>
              <div style={{ ...body, fontSize: 13, color: LRH.mute }}>
                La ligue n'a pas encore publié de document. Revenez plus tard, ou contactez la LRH.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {sortedCategories.map((cat) => (
                <div key={cat}>
                  <div style={{
                    ...mono, fontSize: 10, fontWeight: 700,
                    color: LRH.navy, letterSpacing: '0.16em',
                    textTransform: 'uppercase', marginBottom: 10,
                  }}>
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grouped.get(cat)!.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#fff',
                          border: '1px solid ' + LRH.hair,
                          borderLeft: `3px solid ${LRH.gold}`,
                          padding: '14px 16px',
                          textDecoration: 'none',
                          color: LRH.ink,
                          display: 'flex', alignItems: 'flex-start', gap: 14,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            ...body, fontSize: 14, fontWeight: 700, color: LRH.navy,
                            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                          }}>
                            📄 {doc.title}
                            <span style={{ color: LRH.gold, fontSize: 12 }}>↗</span>
                          </div>
                          {doc.description && (
                            <div style={{ ...body, fontSize: 12.5, color: LRH.mute, marginTop: 4, lineHeight: 1.45 }}>
                              {doc.description}
                            </div>
                          )}
                          <div style={{
                            ...mono, fontSize: 9.5, color: LRH.mute,
                            letterSpacing: '0.04em', marginTop: 6,
                          }}>
                            Ajouté le {new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
