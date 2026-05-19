import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listContentOverrides } from '@/lib/actions/siteContent';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { ContenuAdmin } from './ContenuAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { CONTENT_DEFS } from '@/lib/siteContent';

export default async function ContenuAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });
  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ padding: 48 }}>
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          ⚠ Accès restreint
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          L&apos;édition des textes du site est réservée aux administrateurs de la ligue.
        </div>
      </div>
    );
  }

  const club = user.club;
  const [overrides, metrics, news] = await Promise.all([
    listContentOverrides(),
    club ? getClubMetrics(club.id) : Promise.resolve({ newsCount: 0, membersCount: 0, sponsorsCount: 0 }),
    club ? getNews(club.id) : Promise.resolve([]),
  ]);

  // Build initial values : override DB si présent, sinon default hard-codé.
  const overridesMap = new Map(overrides.map((o) => [o.key, o.value]));
  const initialValues: Record<string, string> = {};
  const isOverridden: Record<string, boolean> = {};
  for (const key of Object.keys(CONTENT_DEFS)) {
    const dbValue = overridesMap.get(key);
    initialValues[key] = dbValue ?? CONTENT_DEFS[key as keyof typeof CONTENT_DEFS].default;
    isOverridden[key] = dbValue != null;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop
        club={club}
        news={news}
        metrics={metrics}
        user={session.user}
        activeTab="ligue-contenu"
        isAdmin
      >
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 24 }}>
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
                fontSize: 32,
                color: LRH.navy,
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Contenu du site.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Textes éditoriaux des pages publiques. Modifiez la valeur d&apos;une clé pour
              écraser le texte par défaut ; cliquez sur « Restaurer » pour reprendre
              le texte original. Les changements sont visibles immédiatement.
            </p>
          </div>
          <ContenuAdmin initialValues={initialValues} isOverridden={isOverridden} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
