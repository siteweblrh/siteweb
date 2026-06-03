import React from 'react';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';
import { listEngagements } from '@/lib/actions/engagement';
import type { EngagementStatus, EngagementPaymentStatus } from '@prisma/client';
import { EngagementsAdminList } from './EngagementsAdminList';

export const metadata = { title: 'Engagements — LRH' };

const STATUSES: EngagementStatus[] = ['SUBMITTED', 'VALIDATED', 'REJECTED'];
const PAYMENTS: EngagementPaymentStatus[] = ['PENDING', 'PAID'];

export default async function EngagementsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as EngagementStatus) ? (sp.status as EngagementStatus) : undefined;
  const payment = PAYMENTS.includes(sp.payment as EngagementPaymentStatus) ? (sp.payment as EngagementPaymentStatus) : undefined;

  // ctx force le redirect si pas admin ; les actions re-vérifient le rôle.
  const [ctx, engagements] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listEngagements({ status, payment }),
  ]);
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
