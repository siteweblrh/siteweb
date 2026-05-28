import React from 'react';
import { redirect } from 'next/navigation';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';
import { listClubDocuments } from '@/lib/actions/clubDocument';
import { ClubDocumentsAdmin } from './ClubDocumentsAdmin';

export default async function ClubDocumentsPage() {
  const user = await getDashboardUser();
  if (!user) redirect('/auth/login');
  const club = user.club ?? null;
  if (!club) {
    return (
      <div style={{ padding: 48 }}>
        <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          ⚠ Accès restreint
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          Cette section est réservée aux managers de club.
        </div>
      </div>
    );
  }

  const [ctx, documents] = await Promise.all([
    getDashboardContext(),
    listClubDocuments(club.id),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="documents">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Gestion du club · Documents
            </div>
            <h2 style={{
              ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Documents partagés.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Règlement intérieur, statuts, autorisation parentale, formulaire d'inscription, etc. Colle un lien Google Drive (ou autre) — les documents marqués « Public » seront affichés sur la fiche club publique.
            </p>
          </div>

          <ClubDocumentsAdmin clubId={club.id} documents={JSON.parse(JSON.stringify(documents))} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
