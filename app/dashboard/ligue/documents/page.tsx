import React from 'react';
import { redirect } from 'next/navigation';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';
import { listDocumentsAdmin } from '@/lib/actions/document';
import { DocumentsAdmin } from './DocumentsAdmin';

export default async function LigueDocumentsPage() {
  const [ctx, documents] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listDocumentsAdmin(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-documents">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Communication · Documents officiels
            </div>
            <h2 style={{
              ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Documents de la ligue.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Règlement de compétition, formulaires d'inscription, statuts LRH, procès-verbaux. Les clubs y accèdent en lecture seule depuis leur dashboard. Les documents marqués « Public » sont aussi accessibles sur le site public.
            </p>
          </div>

          <DocumentsAdmin documents={JSON.parse(JSON.stringify(documents))} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
