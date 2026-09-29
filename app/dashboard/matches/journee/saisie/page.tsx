import React from 'react';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { getDashboardContext } from '@/lib/dashboard/context';
import { prisma } from '@/lib/prisma';
import { ImportClient, type CompetitionOption } from './ImportClient';

/**
 * Saisie rapide de journée : coller la feuille de match, relire le plan,
 * enregistrer. Cadrage : docs/SAISIE_RAPIDE_JOURNEE.md.
 *
 * Coût (règle n°2) — Portée : écran d'admin. Deux requêtes au chargement,
 * aucune page publique ne passe par ici.
 */
export default async function MatchdayImportPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string; matchday?: string }>;
}) {
  const [ctx, params, competitions] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    searchParams,
    prisma.competition.findMany({
      where: { matches: { some: { matchday: { not: null } } } },
      orderBy: [{ season: 'desc' }, { name: 'asc' }],
      select: {
        id: true, name: true, season: true, mode: true, category: true,
        matches: {
          where: { matchday: { not: null } },
          select: { matchday: true, kickoffAt: true, status: true },
        },
      },
    }),
  ]);
  const { sidebarProps } = ctx;

  // Journées par compétition : date du premier match, nombre de rencontres,
  // nombre déjà terminées — de quoi choisir sans ouvrir le calendrier.
  const options: CompetitionOption[] = competitions.map((c) => {
    const byDay = new Map<number, { date: Date; total: number; finished: number }>();
    for (const m of c.matches) {
      const d = byDay.get(m.matchday!) ?? { date: m.kickoffAt, total: 0, finished: 0 };
      d.total += 1;
      if (m.status === 'FINISHED') d.finished += 1;
      if (m.kickoffAt < d.date) d.date = m.kickoffAt;
      byDay.set(m.matchday!, d);
    }
    return {
      id: c.id,
      label: `${c.name} · ${c.season}`,
      mode: c.mode,
      matchdays: [...byDay.entries()]
        .sort(([a], [b]) => a - b)
        .map(([matchday, d]) => ({ matchday, date: d.date.toISOString(), total: d.total, finished: d.finished })),
    };
  });

  const initialMatchday = Number(params.matchday);

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="calendar">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Compétition · Saisie rapide
            </div>
            <h1 style={{
              ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Saisir les résultats d&apos;une journée.
            </h1>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 760 }}>
              Collez la feuille de match (scores, buteurs, cartons, blessures). L&apos;écran
              montre ce qu&apos;il va enregistrer et <strong>bloque tout ce qu&apos;il ne peut pas
              trancher seul</strong> : un score qui ne colle pas, un joueur inconnu, un nom
              approchant. Rien n&apos;est écrit avant « Enregistrer ».
            </p>
          </div>

          <ImportClient
            competitions={options}
            initialCompetitionId={
              options.some((o) => o.id === params.competition) ? params.competition! : (options[0]?.id ?? '')
            }
            initialMatchday={Number.isInteger(initialMatchday) && initialMatchday > 0 ? initialMatchday : null}
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
