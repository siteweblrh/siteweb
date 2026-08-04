import React from 'react';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';
import { listEngagements } from '@/lib/actions/engagement';
import type { EngagementStatus, EngagementPaymentStatus } from '@prisma/client';
import { EngagementsAdminList } from './EngagementsAdminList';
import { getActiveSeasonLabel } from '@/lib/queries/season';
import { SeasonFilterNav } from '@/components/lrh/dashboard/SeasonFilterNav';
import { ALL_SEASONS, seasonsOf } from '@/components/lrh/dashboard/SeasonFilter';

export const metadata = { title: 'Engagements — LRH' };

const STATUSES: EngagementStatus[] = ['SUBMITTED', 'VALIDATED', 'REJECTED'];
const PAYMENTS: EngagementPaymentStatus[] = ['PENDING', 'PAID'];

export default async function EngagementsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string; season?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as EngagementStatus) ? (sp.status as EngagementStatus) : undefined;
  const payment = PAYMENTS.includes(sp.payment as EngagementPaymentStatus) ? (sp.payment as EngagementPaymentStatus) : undefined;

  // ctx force le redirect si pas admin ; les actions re-vérifient le rôle.
  //
  // La liste est chargée SANS filtre de saison, puis filtrée ici : les saisons
  // proposées se déduisent des fiches existantes. Interroger la base pour
  // connaître la liste, puis une seconde fois pour filtrer, ferait deux
  // allers-retours là où le volume (une fiche par club et par saison) tient
  // largement en mémoire.
  const [ctx, all, activeSeason] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listEngagements({ status, payment }),
    getActiveSeasonLabel(),
  ]);
  const seasons = seasonsOf(all, (e) => e.season);
  const fallback = activeSeason && seasons.includes(activeSeason) ? activeSeason : ALL_SEASONS;
  const season = sp.season && seasons.includes(sp.season) ? sp.season : fallback;
  const engagements = season === ALL_SEASONS ? all : all.filter((e) => e.season === season);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-engagements">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Acteurs · Engagements
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy, margin: 0, letterSpacing: '-0.02em' }}>
              Fiches d'engagement des clubs.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Validez ou refusez les fiches soumises par les clubs et suivez le règlement des frais d'engagement.
            </p>
          </div>

          <div style={{ marginBottom: 'clamp(16px, 2.5vw, 24px)' }}>
            <SeasonFilterNav seasons={seasons} value={season} />
          </div>

          <EngagementsAdminList
            engagements={engagements}
            activeStatus={status ?? null}
            activePayment={payment ?? null}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
