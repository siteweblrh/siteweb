import React from 'react';
import { prisma } from "@/lib/prisma";
import { LRH, display, mono, body, Card, ClubCrest } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { ResponsiveTableScroll } from '@/components/dashboard/ResponsiveTable';
import { getDashboardContext } from '@/lib/dashboard/context';

export default async function StandingsDashboardPage() {
  // Parallélisé : user/club/metrics/news + competitions en simultané au lieu
  // d'enchaîner 5 awaits (gain ~300-500ms sur Neon serverless).
  const [ctx, competitions] = await Promise.all([
    getDashboardContext(),
    prisma.competition.findMany({
      include: {
        standings: {
          include: {
            club: { select: { id: true, slug: true, shortCode: true, name: true } },
          },
          orderBy: { rank: 'asc' },
        },
      },
      orderBy: { season: 'desc' },
    }),
  ]);
  const { club, sidebarProps } = ctx;

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="standings">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Compétition
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy, margin: 0 }}>Classements officiels.</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(20px, 3vw, 32px)' }}>
            {competitions.map((comp) => (
              <div key={comp.id}>
                <h3 style={{ ...display, fontWeight: 700, fontSize: 'clamp(16px, 2.5vw, 20px)', color: LRH.navy, marginBottom: 14 }}>
                  {comp.name} — {comp.season}
                </h3>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  <ResponsiveTableScroll>
                    <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', ...body, fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: LRH.paperWarm, borderBottom: '1px solid ' + LRH.hair }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', width: 40 }}>Pos</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Club</th>
                          <th style={{ padding: '12px 12px', textAlign: 'center' }}>J</th>
                          <th style={{ padding: '12px 12px', textAlign: 'center' }}>V</th>
                          <th style={{ padding: '12px 12px', textAlign: 'center' }}>N</th>
                          <th style={{ padding: '12px 12px', textAlign: 'center' }}>D</th>
                          <th style={{ padding: '12px 12px', textAlign: 'center' }}>BP</th>
                          <th style={{ padding: '12px 12px', textAlign: 'center' }}>BC</th>
                          <th style={{ padding: '12px 12px', textAlign: 'center' }}>Diff</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comp.standings.map((s) => (
                          <tr key={s.id} style={{ borderBottom: '1px solid ' + LRH.hair, background: s.clubId === club?.id ? 'rgba(243,188,28,0.05)' : 'transparent' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 800 }}>{s.rank}</td>
                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <ClubCrest id={s.club.shortCode ?? undefined} size={24} />
                                <span style={{ fontWeight: 600 }}>{s.club.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'center' }}>{s.played}</td>
                            <td style={{ padding: '12px 12px', textAlign: 'center' }}>{s.wins}</td>
                            <td style={{ padding: '12px 12px', textAlign: 'center' }}>{s.draws}</td>
                            <td style={{ padding: '12px 12px', textAlign: 'center' }}>{s.losses}</td>
                            <td style={{ padding: '12px 12px', textAlign: 'center' }}>{s.goalsFor}</td>
                            <td style={{ padding: '12px 12px', textAlign: 'center' }}>{s.goalsAgainst}</td>
                            <td style={{ padding: '12px 12px', textAlign: 'center' }}>{s.goalsFor - s.goalsAgainst}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>{s.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ResponsiveTableScroll>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}
