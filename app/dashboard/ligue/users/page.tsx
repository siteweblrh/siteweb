import React from 'react';
import { listUsersAdmin } from '@/lib/actions/user';
import { listClubsAdmin } from '@/lib/actions/club';
import { UsersAdmin } from './UsersAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function UsersAdminPage() {
  const [ctx, users, clubs] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listUsersAdmin(),
    listClubsAdmin(),
  ]);
  const { user, sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-users">
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
              Comptes.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Créez les comptes administrateurs de la ligue et les managers de club. Un manager rattaché à un club peut gérer ses matchs, ses terrains et ses actualités depuis son espace dédié.
            </p>
          </div>
          <UsersAdmin initialUsers={users} clubs={clubs} currentUserId={user.id} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
