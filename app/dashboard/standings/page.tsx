import React from 'react';
import Link from 'next/link';
import { sideName } from '@/lib/utils/match-side';
import { prisma } from "@/lib/prisma";
import { LRH, display, mono, body, Card, ClubCrest } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { ResponsiveTableScroll } from '@/components/dashboard/ResponsiveTable';
import { getDashboardContext } from '@/lib/dashboard/context';
import { getTopScorersForCompetition } from '@/lib/queries/scorers';
import { getBracket } from '@/lib/queries/competition';
import { formatReunionDate } from '@/lib/utils/datetime-reunion';
import { getActiveSeasonLabel } from '@/lib/queries/season';
import { SeasonFilterNav } from '@/components/lrh/dashboard/SeasonFilterNav';
import { ALL_SEASONS, seasonsOf } from '@/components/lrh/dashboard/SeasonFilter';

const PHASE_LABEL: Record<string, string> = {
  R32: '32e de finale',
  R16: '16e de finale',
  QUARTER: 'Quart de finale',
  SEMI: 'Demi-finale',
  THIRD_PLACE: 'Match 3e place',
  FINAL: 'Finale',
};

export default async function StandingsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;
  // 1. Load context + compétitions avec compteurs (pour filtrer celles
  //    sans match joué).
  const [ctx, competitions, activeSeason, unscoredButPlayed] = await Promise.all([
    getDashboardContext(),
    prisma.competition.findMany({
      include: {
        standings: {
          include: {
            club: { select: { id: true, slug: true, shortCode: true, name: true } },
          },
          orderBy: { rank: 'asc' },
        },
        _count: {
          select: {
            // Total des matchs FINISHED (toutes phases). Sert au filtre
            // "compé pas commencée" — si 0, on masque la compé entière.
            matches: { where: { status: 'FINISHED' } },
          },
        },
      },
      orderBy: { season: 'desc' },
    }),
    getActiveSeasonLabel(),
    // Matchs dont les deux scores sont saisis mais dont le statut n'est pas
    // FINISHED : ils sont invisibles pour updateStandings() et font qu'un
    // classement « oublie » un match sans qu'aucune erreur ne soit levée.
    // Une requête de plus sur un écran déjà dynamique et authentifié, en
    // parallèle des autres — pas de coût de réveil Neon supplémentaire.
    prisma.match.findMany({
      where: {
        status: { not: 'FINISHED' },
        homeScore: { not: null },
        awayScore: { not: null },
      },
      select: {
        id: true,
        status: true,
        homeScore: true,
        awayScore: true,
        homeLabel: true,
        awayLabel: true,
        competition: { select: { name: true, season: true } },
        homeClub: { select: { name: true, shortCode: true } },
        awayClub: { select: { name: true, shortCode: true } },
      },
      orderBy: { kickoffAt: 'asc' },
      take: 20,
    }),
  ]);
  const { club, isAdmin, sidebarProps } = ctx;

  // 2. On masque les compés qui n'ont aucun match FINISHED. Un standings
  //    avec played=0 partout ne vaut pas la place qu'il prend à l'écran.
  const played = competitions.filter((c) => c._count.matches > 0);

  // Filtre de saison. Défaut : la saison EN_COURS si elle a des classements,
  // sinon toutes — un écran de classements vide au chargement n'aiderait
  // personne (même raisonnement que sur /classements côté public).
  const seasons = seasonsOf(played, (c) => c.season);
  const fallback = activeSeason && seasons.includes(activeSeason) ? activeSeason : ALL_SEASONS;
  const season = seasonParam && seasons.includes(seasonParam) ? seasonParam : fallback;
  const liveCompetitions = season === ALL_SEASONS ? played : played.filter((c) => c.season === season);

  // 3. Pour chaque compé restante : buteurs + phase finale en parallèle.
  const enriched = await Promise.all(
    liveCompetitions.map(async (comp) => {
      const [scorers, bracket] = await Promise.all([
        getTopScorersForCompetition(comp.id, 10),
        comp.format !== 'CHAMPIONSHIP' ? getBracket(comp.id) : Promise.resolve([]),
      ]);
      return { ...comp, scorers, bracket };
    }),
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="standings">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Compétition
            </div>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy, margin: 0 }}>Classements officiels.</h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Compétitions en cours ou terminées uniquement. Les compétitions créées mais qui n'ont pas encore commencé n'apparaissent pas tant qu'aucun match n'est joué.
            </p>
          </div>

          <div style={{ marginBottom: 'clamp(16px, 2.5vw, 24px)' }}>
            <SeasonFilterNav seasons={seasons} value={season} />
          </div>

          {/* Réservé aux admins : la requête n'est pas scopée à un club, la
              montrer à un manager exposerait les matchs des autres. */}
          {isAdmin && unscoredButPlayed.length > 0 && (
            <div
              role="alert"
              style={{
                marginBottom: 'clamp(16px, 2.5vw, 24px)',
                background: '#fff',
                border: '1px solid ' + LRH.gold,
                borderLeft: '4px solid ' + LRH.gold,
                padding: '14px 16px',
              }}
            >
              <div style={{ ...mono, fontSize: 10.5, fontWeight: 800, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
                Hors classement
              </div>
              <p style={{ ...body, fontSize: 13, color: LRH.ink, margin: '0 0 10px' }}>
                {unscoredButPlayed.length === 1
                  ? "Un match a un score saisi mais n'est pas marqué « Terminé » : il ne compte pas au classement."
                  : `${unscoredButPlayed.length} matchs ont un score saisi mais ne sont pas marqués « Terminé » : ils ne comptent pas au classement.`}
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {unscoredButPlayed.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/dashboard/matches/${m.id}`}
                      style={{
                        ...body,
                        fontSize: 12.5,
                        color: LRH.navy,
                        textDecoration: 'underline',
                        display: 'inline-block',
                        padding: '6px 0',
                        minHeight: 24,
                      }}
                    >
                      {sideName({ club: m.homeClub, label: m.homeLabel })} {m.homeScore}–{m.awayScore}{' '}
                      {sideName({ club: m.awayClub, label: m.awayLabel })}
                      <span style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.08em', marginLeft: 8 }}>
                        {m.competition.name} · {m.competition.season} · {m.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {enriched.length === 0 ? (
            <div style={{
              padding: 48, textAlign: 'center',
              border: '2px dashed ' + LRH.hairStrong,
              background: '#fff',
            }}>
              <div style={{ ...display, fontSize: 18, color: LRH.navy, marginBottom: 8 }}>
                Aucune compétition en cours
              </div>
              <div style={{ ...body, fontSize: 13, color: LRH.mute }}>
                Les classements apparaîtront ici dès qu'un match aura été joué.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(28px, 4vw, 48px)' }}>
              {enriched.map((comp) => (
                <div key={comp.id}>
                  <h3 style={{ ...display, fontWeight: 700, fontSize: 'clamp(16px, 2.5vw, 20px)', color: LRH.navy, marginBottom: 14 }}>
                    {comp.name} — {comp.season}
                  </h3>

                  {/* Tableau classement (REGULAR uniquement, comme aujourd'hui).
                      Masqué pour les CUP — pas de notion de classement par points. */}
                  {comp.format !== 'CUP' && comp.standings.length > 0 && (
                    <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
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
                  )}

                  {/* Panneau Phase finale — visible si CHAMPIONSHIP_PLAYOFFS ou CUP
                      avec au moins un match bracket. */}
                  {comp.bracket.length > 0 && (
                    <FinalsPanel matches={comp.bracket} userClubId={club?.id} />
                  )}

                  {/* Meilleurs buteurs (top 10). Source = MemberCompetitionStats. */}
                  {comp.scorers.length > 0 && (
                    <ScorersPanel scorers={comp.scorers} userClubId={club?.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}

type BracketMatch = Awaited<ReturnType<typeof getBracket>>[number];
type TopScorer = Awaited<ReturnType<typeof getTopScorersForCompetition>>[number];

function FinalsPanel({ matches, userClubId }: { matches: BracketMatch[]; userClubId?: string }) {
  // Groupe par phase pour ordre d'affichage cohérent (quarts → demis → 3e place → finale).
  const PHASE_ORDER: BracketMatch['phase'][] = ['R32', 'R16', 'QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL'];
  const grouped = PHASE_ORDER
    .map((p) => ({ phase: p, items: matches.filter((m) => m.phase === p) }))
    .filter((g) => g.items.length > 0);

  return (
    <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{
        padding: '12px 16px',
        background: LRH.navy,
        color: '#fff',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ width: 6, height: 6, background: LRH.gold }} />
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: LRH.gold, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Phase finale
        </span>
      </div>
      <div style={{ padding: '8px 0' }}>
        {grouped.map((g) => (
          <div key={g.phase}>
            <div style={{
              padding: '10px 16px 6px',
              ...mono, fontSize: 10, fontWeight: 700,
              color: LRH.mute, letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}>
              {PHASE_LABEL[g.phase] ?? g.phase}
            </div>
            {g.items.map((m) => {
              const isInvolved = userClubId && (m.homeClub?.id === userClubId || m.awayClub?.id === userClubId);
              const isFinished = m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null;
              return (
                <div
                  key={m.id}
                  style={{
                    padding: '10px 16px',
                    borderTop: '1px solid ' + LRH.hair,
                    background: isInvolved ? 'rgba(243,188,28,0.05)' : 'transparent',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', minWidth: 0 }}>
                    <span style={{ ...body, fontWeight: 600, color: LRH.ink, textAlign: 'right' }}>
                      {sideName({ club: m.homeClub, label: m.homeLabel })}
                    </span>
                    <ClubCrest id={m.homeClub?.shortCode ?? undefined} size={22} />
                  </div>
                  <div style={{
                    ...display, fontSize: 16, fontWeight: 800, color: LRH.navy,
                    textAlign: 'center', minWidth: 88,
                  }}>
                    {isFinished ? (
                      <span>
                        <span style={{
                          color: (m.homeScore! > m.awayScore!) ? LRH.navy
                            : (m.homeScore! < m.awayScore!) ? LRH.mute : LRH.ink,
                        }}>{m.homeScore}</span>
                        <span style={{ margin: '0 6px', color: LRH.mute }}>—</span>
                        <span style={{
                          color: (m.awayScore! > m.homeScore!) ? LRH.navy
                            : (m.awayScore! < m.homeScore!) ? LRH.mute : LRH.ink,
                        }}>{m.awayScore}</span>
                      </span>
                    ) : (
                      <span style={{ ...mono, fontSize: 11, color: LRH.mute, fontWeight: 700, letterSpacing: '0.1em' }}>
                        {formatReunionDate(new Date(m.kickoffAt as unknown as string))}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <ClubCrest id={m.awayClub?.shortCode ?? undefined} size={22} />
                    <span style={{ ...body, fontWeight: 600, color: LRH.ink }}>
                      {sideName({ club: m.awayClub, label: m.awayLabel })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ScorersPanel({ scorers, userClubId }: { scorers: TopScorer[]; userClubId?: string }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 16px',
        background: LRH.paperWarm,
        borderBottom: '1px solid ' + LRH.hair,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ width: 6, height: 6, background: LRH.gold }} />
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: LRH.navy, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Meilleurs buteurs
        </span>
      </div>
      <ResponsiveTableScroll>
        <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', ...body, fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid ' + LRH.hair }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', width: 40 }}>#</th>
              <th style={{ padding: '10px 16px', textAlign: 'left' }}>Joueur</th>
              <th style={{ padding: '10px 16px', textAlign: 'left' }}>Club</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Matchs</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 800 }}>Buts</th>
            </tr>
          </thead>
          <tbody>
            {scorers.map((s, i) => {
              const isInvolved = userClubId && s.club?.id === userClubId;
              return (
                <tr key={s.id} style={{
                  borderBottom: '1px solid ' + LRH.hair,
                  background: isInvolved ? 'rgba(243,188,28,0.05)' : 'transparent',
                }}>
                  <td style={{ padding: '10px 16px', fontWeight: 800, color: LRH.navy }}>{i + 1}</td>
                  <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600 }}>
                      {s.firstName} {s.lastName}
                    </span>
                    {s.jerseyNumber != null && (
                      <span style={{ ...mono, fontSize: 10, color: LRH.mute, marginLeft: 6 }}>
                        #{s.jerseyNumber}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                    {s.club ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ClubCrest id={s.club.shortCode ?? undefined} size={18} />
                        <span style={{ color: LRH.ink2 }}>{s.club.name}</span>
                      </div>
                    ) : (
                      <span style={{ color: LRH.mute }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: LRH.mute }}>{s.matchesPlayed}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 800, color: LRH.red }}>
                    {s.goalsScored}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ResponsiveTableScroll>
    </Card>
  );
}
