import React from 'react';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';
import { listSeasons } from '@/lib/actions/season';
import { SeasonsAdmin } from './SeasonsAdmin';

export const metadata = { title: 'Saisons' };

export default async function SeasonsAdminPage() {
  // `requireAdmin: true` fait le contrôle de rôle AVANT le rendu. Les actions
  // mutatives le refont côté serveur : masquer un écran n'est pas une sécurité.
  const [ctx, seasons] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listSeasons(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-saisons">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Système · Saisons
            </div>
            <h2 style={{
              ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Cycle de vie des saisons.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Une saison se crée en préparation, puis s’ouvre le jour où elle
              démarre — c’est ce geste qui fait basculer le site public. Une
              seule saison peut être en cours à la fois ; ouvrir la suivante
              clôt automatiquement la précédente, qui reste consultable.
            </p>
          </div>

          <SeasonsAdmin initialSeasons={seasons} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
