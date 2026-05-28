import React from 'react';
import { redirect } from 'next/navigation';
import {
  listCompetitionsAdmin,
  listClubsForAdmin,
  listMatchesAdmin,
  listAllCompetitionEntries,
} from '@/lib/actions/competition';
import { getAllVenues } from '@/lib/queries/venue';
import { getAllReferees } from '@/lib/queries/referee';
import { listDraftCalendars } from '@/lib/actions/draftCalendar';
import { CalendarAdmin } from './CalendarAdmin';
import { CalendarToolbar } from './CalendarToolbar';
import { DraftCalendarAdmin } from '../provisoire/DraftCalendarAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';

type SearchParams = { mode?: string };

export default async function MatchesCalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const mode: 'officiel' | 'brouillon' = sp.mode === 'brouillon' ? 'brouillon' : 'officiel';

  const user = await getDashboardUser();
  if (!user) redirect('/auth/login');
  const club = user.club ?? null;
  const isAdmin = user.role === 'ADMIN';

  if (!club && !isAdmin) {
    return (
      <div style={{ padding: 48 }}>
        <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          ⚠ Accès restreint
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          Cette section nécessite un compte rattaché à un club ou un compte administrateur.
        </div>
      </div>
    );
  }

  // Le mode Brouillon est admin-only (planification ligue).
  if (mode === 'brouillon' && !isAdmin) {
    redirect('/dashboard/matches/calendar');
  }

  // Fetch en parallèle. En mode Brouillon on n'a pas besoin de tous les
  // datasets liés aux Match — on ne les charge pas pour économiser des
  // round-trips.
  const ctxPromise = getDashboardContext();

  let officielData: Awaited<ReturnType<typeof loadOfficielData>> | null = null;
  let brouillonData: Awaited<ReturnType<typeof loadBrouillonData>> | null = null;

  if (mode === 'officiel') {
    [, officielData] = await Promise.all([ctxPromise, loadOfficielData(isAdmin, club?.id)]);
  } else {
    [, brouillonData] = await Promise.all([ctxPromise, loadBrouillonData()]);
  }
  const { sidebarProps } = await ctxPromise;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="calendar">
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
              Compétition · {mode === 'brouillon' ? 'Planification (brouillon)' : 'Vue calendrier'}
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
              {mode === 'brouillon' ? 'Calendrier provisoire.' : 'Calendrier des matchs.'}
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              {mode === 'brouillon'
                ? "Planifiez le squelette de la saison avant que les clubs ne s'engagent : choisissez les dates, la récurrence et le nombre de créneaux par journée. Les matchs réels seront générés via le tirage ou la création de journées."
                : 'Vue mensuelle de tous les matchs. Cliquez une case pour voir les matchs du jour, ajouter ou modifier un match. Pastilles navy = gazon, or = salle.'}
            </p>
          </div>

          {isAdmin && <CalendarToolbar mode={mode} isAdmin={isAdmin} />}

          {mode === 'brouillon' && brouillonData && (
            <DraftCalendarAdmin
              calendars={JSON.parse(JSON.stringify(brouillonData.calendars))}
              competitions={JSON.parse(JSON.stringify(brouillonData.competitions))}
              clubs={brouillonData.clubs.map((c) => ({ id: c.id, name: c.name, shortCode: c.shortCode }))}
              venues={brouillonData.venues.map((v) => ({ id: v.id, name: v.name, city: v.city }))}
              referees={brouillonData.referees.map((r) => ({ id: r.id, fullName: r.fullName }))}
              entriesByCompetition={brouillonData.entriesByCompetition}
            />
          )}
          {mode === 'officiel' && officielData && (
            <CalendarAdmin
              matches={officielData.matches}
              competitions={officielData.competitions}
              clubs={officielData.clubs}
              venues={officielData.venues}
              referees={officielData.referees}
              entriesByCompetition={officielData.entriesByCompetition}
              clubId={club?.id}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}

async function loadOfficielData(isAdmin: boolean, clubId: string | undefined) {
  const [matches, competitions, clubs, venues, referees, entriesByCompetition] = await Promise.all([
    listMatchesAdmin(isAdmin ? undefined : { clubId: clubId! }),
    listCompetitionsAdmin(),
    listClubsForAdmin(),
    getAllVenues(),
    getAllReferees(),
    listAllCompetitionEntries(),
  ]);
  return { matches, competitions, clubs, venues, referees, entriesByCompetition };
}

async function loadBrouillonData() {
  // Le mode brouillon a besoin de tous les datasets liés aux Match pour
  // alimenter la modale de conversion slot → match (équipes, lieux, arbitres,
  // inscriptions par compétition).
  const [calendars, competitions, clubs, venues, referees, entriesByCompetition] = await Promise.all([
    listDraftCalendars(),
    listCompetitionsAdmin(),
    listClubsForAdmin(),
    getAllVenues(),
    getAllReferees(),
    listAllCompetitionEntries(),
  ]);
  return { calendars, competitions, clubs, venues, referees, entriesByCompetition };
}
