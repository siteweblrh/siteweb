import React from 'react';
import { redirect } from 'next/navigation';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';
import { listTrainingSchedulesForClub } from '@/lib/actions/training';
import { listCategories } from '@/lib/actions/category';
import { getAllVenues, getClubVenuePreferences } from '@/lib/queries/venue';
import { TrainingAdmin } from './TrainingAdmin';

export default async function TrainingAdminPage() {
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

  const [ctx, schedules, categories, venues, clubVenues] = await Promise.all([
    getDashboardContext(),
    listTrainingSchedulesForClub(club.id),
    listCategories(),
    getAllVenues(),
    getClubVenuePreferences(club.id),
  ]);
  const { sidebarProps } = ctx;

  // IDs des terrains "préférés" du club (home + training, gazon + salle).
  // Sert à promouvoir ces terrains en tête du dropdown dans TrainingAdmin.
  const myVenueIds: string[] = [
    clubVenues?.homeVenueGazonId,
    clubVenues?.homeVenueSalleId,
    clubVenues?.trainingVenueGazonId,
    clubVenues?.trainingVenueSalleId,
  ].filter((v): v is string => Boolean(v));

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="training">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Gestion du club · Entraînements
            </div>
            <h2 style={{
              ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Créneaux d'entraînement.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Renseignez les créneaux par catégorie (Sénior, jeunes, etc.). Ils sont affichés
              sur la fiche publique de {club.name} et dans la page Licence pour aider les
              visiteurs à choisir un club + un créneau compatible.
            </p>
          </div>

          <TrainingAdmin
            clubId={club.id}
            schedules={schedules}
            categories={categories.map((c) => c.name)}
            venues={venues}
            myVenueIds={myVenueIds}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
