import React from 'react';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';
import { listYouthGatheringsAdmin } from '@/lib/queries/youth';
import { getDeclaredSeasonLabels } from '@/lib/queries/season';
import { prisma } from '@/lib/prisma';
import { YouthGatheringsAdmin } from './YouthGatheringsAdmin';

export default async function YouthGatheringsAdminPage() {
  const [ctx, rows, seasons, venues] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listYouthGatheringsAdmin(),
    getDeclaredSeasonLabels(),
    prisma.venue.findMany({
      select: { id: true, name: true, city: true },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    }),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-jeunes">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Compétition · Rassemblements jeunes
            </div>
            <h2 style={{
              ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Calendrier des rassemblements.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 760 }}>
              Les journées de rassemblement jeunes affichées sur la page publique
              /jeunes. Ce ne sont pas des matchs : les équipes se constituent sur
              place, donc rien n&apos;entre au classement. Une date reste en brouillon
              tant qu&apos;elle n&apos;est pas publiée, et un lieu laissé vide s&apos;affiche
              « Lieu à confirmer » côté public.
            </p>
          </div>

          <YouthGatheringsAdmin
            rows={rows}
            venues={venues}
            seasons={seasons}
            defaultSeason={seasons[0] ?? ''}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
