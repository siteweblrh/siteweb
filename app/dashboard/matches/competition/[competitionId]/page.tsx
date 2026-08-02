import React from 'react';
import { redirect, notFound } from 'next/navigation';
import {
  listClubsForAdmin,
  listAllCompetitionEntries,
} from '@/lib/actions/competition';
import { getAllVenues } from '@/lib/queries/venue';
import { getAllReferees } from '@/lib/queries/referee';
import { listDraftCalendars } from '@/lib/actions/draftCalendar';
import { LRH } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardUser, getDashboardContext } from '@/lib/dashboard/context';
import { CompetitionPlanClient } from './CompetitionPlanClient';

/**
 * Écran de pilotage d'UNE compétition — la cible esquissée le 2026-08-01.
 *
 * Le calendrier de saison répond à « quand joue-t-on ? ». Cet écran répond à
 * « où en est cette compétition ? », qui est la question qu'un dirigeant se
 * pose vraiment. Il déroule les quatre étapes — équipes, dates, tirage,
 * publication — puis la liste des journées avec leur état.
 *
 * Coût : lecture admin, jamais publique, une seule visite à la fois. On réutilise
 * `listDraftCalendars()` plutôt que d'écrire une requête dédiée — c'est la même
 * que le hub calendrier, donc rien de neuf à maintenir, et le surcoût (les
 * autres calendriers) est négligeable devant le risque d'une seconde source de
 * vérité qui divergerait.
 */
export default async function CompetitionPlanPage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const { competitionId } = await params;

  const user = await getDashboardUser();
  if (!user) redirect('/auth/login');
  if (user.role !== 'ADMIN') redirect('/dashboard/matches/calendar');

  const ctxPromise = getDashboardContext();
  const [ctx, calendars, clubs, venues, referees, entriesByCompetition] = await Promise.all([
    ctxPromise,
    listDraftCalendars(),
    listClubsForAdmin(),
    getAllVenues(),
    getAllReferees(),
    listAllCompetitionEntries(),
  ]);

  // Une compétition ne vit que dans un seul calendrier à la fois (garde-fou
  // serveur côté ajout), donc le premier trouvé est le bon.
  const calendar = calendars.find((c) =>
    c.competitions.some((dcc) => dcc.competitionId === competitionId),
  );
  if (!calendar) notFound();

  const link = calendar.competitions.find((dcc) => dcc.competitionId === competitionId)!;
  const slots = calendar.slots.filter((s) => s.competitionId === competitionId);

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...ctx.sidebarProps} activeTab="calendar">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <CompetitionPlanClient
        calendarId={calendar.id}
        calendarName={calendar.name}
        season={calendar.season}
        competition={JSON.parse(JSON.stringify(link.competition))}
        slots={JSON.parse(JSON.stringify(slots))}
        clubs={clubs.map((c) => ({ id: c.id, name: c.name, shortCode: c.shortCode }))}
        venues={venues.map((v) => ({ id: v.id, name: v.name, city: v.city }))}
        referees={referees.map((r) => ({ id: r.id, fullName: r.fullName }))}
        teamCount={(entriesByCompetition[competitionId] ?? []).length}
            entriesByCompetition={entriesByCompetition}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
