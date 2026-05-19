import React from 'react';
import { listContentOverrides } from '@/lib/actions/siteContent';
import { ContenuAdmin } from './ContenuAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { CONTENT_DEFS } from '@/lib/siteContent';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function ContenuAdminPage() {
  const [ctx, overrides] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listContentOverrides(),
  ]);
  const { sidebarProps } = ctx;

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
