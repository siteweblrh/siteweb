import React from 'react';
import { listCompetitionsAdmin } from '@/lib/actions/competition';
import { listDraftCalendars } from '@/lib/actions/draftCalendar';
import { DraftCalendarAdmin } from './DraftCalendarAdmin';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function DraftCalendarPage() {
  const [ctx, calendars, competitions] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    listDraftCalendars(),
    listCompetitionsAdmin(),
  ]);
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="draft-calendar">
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
              Compétition · Planification
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
              Calendrier provisoire.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Planifiez le squelette de la saison avant que les clubs ne s'engagent : choisissez les dates,
              la récurrence et le nombre de créneaux par journée. Les matchs réels seront générés plus tard
              via le tirage ou la création de journées.
            </p>
          </div>

          <DraftCalendarAdmin
            calendars={JSON.parse(JSON.stringify(calendars))}
            competitions={JSON.parse(JSON.stringify(competitions))}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
