import React from 'react';
import { getMembersForPicker } from '@/lib/queries/ligue';
import { getAllMvps } from '@/lib/queries/matchdayMvp';
import { prisma } from '@/lib/prisma';
import { LRH, display, mono } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { MvpAdmin } from './MvpAdmin';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function DashboardMvpPage() {
  const [ctx, awards, members, competitionRows] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    getAllMvps(),
    getMembersForPicker(),
    // Compétitions proposables + journées réellement présentes. `matchday` est
    // nullable sur Match : on ne propose que les numéros qui existent, plutôt
    // qu'un compteur théorique qui laisserait choisir une journée inexistante.
    prisma.competition.findMany({
      orderBy: [{ season: 'desc' }, { mode: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, mode: true, season: true,
        matches: { where: { NOT: { matchday: null } }, select: { matchday: true } },
      },
    }),
  ]);
  const competitionOptions = competitionRows.map((c) => ({
    id: c.id,
    name: c.name,
    mode: c.mode,
    season: c.season,
    matchdays: [...new Set(c.matches.map((m) => m.matchday as number))].sort((a, b) => a - b),
  }));
  const { sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-mvp">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Administration ligue
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy, margin: 0, letterSpacing: '-0.02em' }}>MVP de la journée.</h2>
            <p style={{ ...mono, fontSize: 12, color: LRH.mute, letterSpacing: '0.04em', marginTop: 10, maxWidth: 640 }}>
              Désignez le MVP d'une journée. Le libellé affiché est déduit de la compétition et du numéro de journée — il ne se saisit pas. La nomination la plus récente (date d'effet) de chaque discipline est affichée sur la page d'accueil.
            </p>
          </div>
          <MvpAdmin initialAwards={awards} members={members} competitions={competitionOptions} />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
