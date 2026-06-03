import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getEngagementById } from '@/lib/actions/engagement';
import { normalizeEngagementData } from '@/lib/engagement/schema';
import { EngagementAdminDetail } from './EngagementAdminDetail';

export const metadata = { title: "Fiche d'engagement — LRH" };

export default async function EngagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [ctx, engagement] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    getEngagementById(id),
  ]);
  if (!engagement) notFound();
  const { sidebarProps } = ctx;
  const data = normalizeEngagementData(engagement.data);

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-engagements">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <Link href="/dashboard/ligue/engagements" style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
            ← Toutes les fiches
          </Link>
          <div style={{ margin: '12px 0 24px' }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Engagement · Saison {engagement.season}
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy, margin: 0, letterSpacing: '-0.02em' }}>
              {engagement.club.name}.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0' }}>{engagement.club.city}</p>
          </div>

          <EngagementAdminDetail
            id={engagement.id}
            season={engagement.season}
            status={engagement.status}
            paymentStatus={engagement.paymentStatus}
            paymentMethod={engagement.paymentMethod}
            rejectedReason={engagement.rejectedReason}
            signedByName={engagement.signedByName}
            signedCity={engagement.signedCity}
            signedAt={engagement.signedAt ? engagement.signedAt.toISOString() : null}
            submittedByEmail={engagement.submittedByEmail}
            validatedByEmail={engagement.validatedByEmail}
            data={data}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
