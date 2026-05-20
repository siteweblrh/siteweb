import React from 'react';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';
import { listCategories } from '@/lib/actions/category';
import { CategoriesAdmin } from './CategoriesAdmin';

export default async function CategoriesAdminPage() {
  const [ctx, categories] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listCategories(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-categories">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Système · Catégories
            </div>
            <h2 style={{
              ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Catégories d'âge & de niveau.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Liste éditable utilisée par les compétitions (dropdown) et les horaires
              d'entraînement des clubs. Supprimer une catégorie n'efface pas les
              compétitions ou créneaux existants — elle disparaît juste du dropdown.
            </p>
          </div>

          <CategoriesAdmin initialCategories={categories} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
