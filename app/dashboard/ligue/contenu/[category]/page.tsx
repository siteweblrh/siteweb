import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listContentOverrides } from '@/lib/actions/siteContent';
import { CategoryEditor } from './CategoryEditor';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import {
  CONTENT_DEFS,
  CONTENT_CATEGORY_LABEL,
  CONTENT_CATEGORY_DESCRIPTION,
  CONTENT_CATEGORY_PUBLIC_URL,
  type ContentKey,
} from '@/lib/siteContent';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function ContenuCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const [ctx, overrides, { category }] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listContentOverrides(),
    params,
  ]);
  const { sidebarProps } = ctx;

  // Vérifier que la catégorie existe (au moins une clé l'utilise)
  const keysForCategory = (Object.keys(CONTENT_DEFS) as ContentKey[]).filter(
    (k) => CONTENT_DEFS[k].category === category,
  );
  if (keysForCategory.length === 0) notFound();

  const overridesMap = new Map(overrides.map((o) => [o.key, o.value]));
  const initialValues: Record<string, string> = {};
  const isOverridden: Record<string, boolean> = {};
  for (const k of keysForCategory) {
    const dbValue = overridesMap.get(k);
    initialValues[k] = dbValue ?? CONTENT_DEFS[k].default;
    isOverridden[k] = dbValue != null;
  }

  const label = CONTENT_CATEGORY_LABEL[category] ?? category;
  const description = CONTENT_CATEGORY_DESCRIPTION[category];
  const publicUrl = CONTENT_CATEGORY_PUBLIC_URL[category];
  const modifiedCount = keysForCategory.filter((k) => isOverridden[k]).length;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-contenu">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(18px, 2.5vw, 24px)' }}>
            <Link
              href="/dashboard/ligue/contenu"
              style={{
                ...mono,
                fontSize: 11,
                color: LRH.mute,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 12,
              }}
            >
              ← Contenu du site
            </Link>
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
              Édition · {keysForCategory.length} clé{keysForCategory.length > 1 ? 's' : ''}
              {modifiedCount > 0 && (
                <>
                  {' '}·{' '}
                  <span style={{ color: '#1d6b3f' }}>
                    {modifiedCount} modifiée{modifiedCount > 1 ? 's' : ''}
                  </span>
                </>
              )}
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
              {label}
            </h2>
            {description && (
              <p
                style={{
                  ...body,
                  fontSize: 13,
                  color: LRH.mute,
                  margin: '8px 0 0',
                  maxWidth: 720,
                  lineHeight: 1.5,
                }}
              >
                {description}
              </p>
            )}
            {publicUrl && (
              <div style={{ marginTop: 12 }}>
                <Link
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...mono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: LRH.navy,
                    background: '#fff',
                    border: '1px solid ' + LRH.hairStrong,
                    padding: '7px 12px',
                    textDecoration: 'none',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  ↗ Voir la page publique
                </Link>
              </div>
            )}
          </div>

          <CategoryEditor
            category={category}
            categoryLabel={label}
            keys={keysForCategory}
            initialValues={initialValues}
            isOverridden={isOverridden}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
