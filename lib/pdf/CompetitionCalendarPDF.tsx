/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { CompetitionPdfData, CompetitionPdfMatch } from '@/lib/queries/competitionPdf';

const COLORS = {
  navy:        '#002244',
  navyDeep:    '#001022',
  gold:        '#F3BC1C',
  red:         '#A8202F',
  paper:       '#F8F9FA',
  paperWarm:   '#F2EFE6',
  ink:         '#0F1B2E',
  ink2:        '#2A3548',
  mute:        '#6B7280',
  hair:        '#E5E7EB',
  hairStrong:  '#CBD5E0',
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: COLORS.ink,
  },
  // Header navy band
  header: {
    backgroundColor: COLORS.navy,
    color: '#fff',
    paddingTop: 18,
    paddingBottom: 18,
    paddingLeft: 32,
    paddingRight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: COLORS.gold,
  },
  headerLogo: {
    width: 56,
    height: 56,
    marginRight: 16,
  },
  headerTextBlock: {
    flexGrow: 1,
  },
  headerKicker: {
    fontSize: 7,
    color: COLORS.gold,
    letterSpacing: 2,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#fff',
    opacity: 0.78,
    marginTop: 4,
  },

  // Competition meta bar (gold)
  metaBar: {
    backgroundColor: COLORS.gold,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 32,
    paddingRight: 32,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaChip: {
    fontSize: 8,
    color: COLORS.gold,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    marginRight: 12,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 6,
    backgroundColor: COLORS.navy,
  },
  metaTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.navy,
    flexGrow: 1,
  },
  metaSeason: {
    fontSize: 9,
    color: COLORS.navy,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },

  // Stats ribbon
  statsRibbon: {
    backgroundColor: COLORS.paperWarm,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 32,
    paddingRight: 32,
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairStrong,
  },
  statsCell: {
    flexGrow: 1,
    paddingRight: 12,
  },
  statsKicker: {
    fontSize: 7,
    color: COLORS.red,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  statsValue: {
    fontSize: 13,
    color: COLORS.navy,
    fontFamily: 'Helvetica-Bold',
  },
  statsHint: {
    fontSize: 8,
    color: COLORS.mute,
    marginTop: 2,
  },

  // Engaged teams strip
  engagedBlock: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 32,
    paddingRight: 32,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hair,
  },
  engagedLabel: {
    fontSize: 7,
    color: COLORS.mute,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  engagedList: {
    fontSize: 10,
    color: COLORS.ink,
    fontFamily: 'Helvetica',
  },

  // Body padding
  body: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 32,
    paddingRight: 32,
  },

  // Round (journée) band
  roundBand: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomStyle: 'dashed',
    borderBottomColor: COLORS.hairStrong,
  },
  roundChip: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
    backgroundColor: COLORS.navy,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 8,
    letterSpacing: 1.2,
  },
  roundDate: {
    flexGrow: 1,
    fontSize: 10,
    color: COLORS.navy,
    fontFamily: 'Helvetica-Bold',
    marginLeft: 12,
  },
  roundCount: {
    fontSize: 7,
    color: COLORS.mute,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },

  // Match row
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    paddingRight: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hair,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.gold,
    backgroundColor: '#fff',
    marginBottom: 3,
  },
  matchTime: {
    width: 48,
    fontSize: 11,
    color: COLORS.navy,
    fontFamily: 'Helvetica-Bold',
  },
  matchHome: {
    flexGrow: 1,
    fontSize: 10,
    color: COLORS.ink,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    paddingRight: 8,
  },
  matchScore: {
    width: 60,
    fontSize: 12,
    color: COLORS.navy,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  matchScoreEmpty: {
    width: 60,
    fontSize: 8,
    color: COLORS.mute,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  matchAway: {
    flexGrow: 1,
    fontSize: 10,
    color: COLORS.ink,
    fontFamily: 'Helvetica-Bold',
    paddingLeft: 8,
  },
  matchStatus: {
    width: 56,
    fontSize: 7,
    color: COLORS.mute,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
  },
  matchVenue: {
    fontSize: 8,
    color: COLORS.mute,
    paddingLeft: 8,
    paddingTop: 2,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 32,
    right: 32,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.hairStrong,
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 7,
    color: COLORS.mute,
  },
  footerLeft: {
    flexGrow: 1,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
  },
  footerRight: {
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
  },
});

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'À venir',
  LIVE:      'En direct',
  HALFTIME:  'Mi-temps',
  FINISHED:  'Terminé',
  POSTPONED: 'Reporté',
  CANCELLED: 'Annulé',
};

const PHASE_LABEL: Record<string, string> = {
  REGULAR:     'Phase régulière',
  R32:         '32e de finale',
  R16:         '16e de finale',
  QUARTER:     'Quart de finale',
  SEMI:        'Demi-finale',
  THIRD_PLACE: 'Match pour la 3ᵉ place',
  FINAL:       'Finale',
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Groupe les matchs par "round" : pour CHAMPIONSHIP/PLAYOFFS, on groupe par
 * (matchday). Pour CUP ou les phases non-REGULAR, on groupe par phase.
 * Plusieurs matchs partagent la même journée (cas courant : 2-3 matchs/jour
 * dans une poule de 3-4 équipes).
 */
type Round = {
  key: string;
  label: string;
  /** date la plus tôt parmi les matchs (pour tri) */
  earliestDate: Date;
  /** date la plus tard (utilisée pour l'affichage si "même jour" sinon range) */
  latestDate: Date;
  /** label de date à afficher à droite du bandeau */
  dateLabel: string;
  matches: CompetitionPdfMatch[];
};

function buildRounds(data: CompetitionPdfData): Round[] {
  const map = new Map<string, CompetitionPdfMatch[]>();
  for (const m of data.matches) {
    let key: string;
    if (m.phase !== 'REGULAR') {
      key = `PHASE:${m.phase}`;
    } else if (m.matchday != null) {
      key = `J:${m.matchday}`;
    } else {
      // Pas de journée renseignée → groupé par date (YYYY-MM-DD)
      const d = new Date(m.kickoffAt);
      key = `D:${d.toISOString().slice(0, 10)}`;
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }

  const rounds: Round[] = [];
  for (const [key, matches] of map.entries()) {
    matches.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
    const earliest = new Date(matches[0].kickoffAt);
    const latest = new Date(matches[matches.length - 1].kickoffAt);
    const sameDay =
      earliest.getFullYear() === latest.getFullYear() &&
      earliest.getMonth() === latest.getMonth() &&
      earliest.getDate() === latest.getDate();

    let label: string;
    if (key.startsWith('PHASE:')) {
      const phase = key.slice('PHASE:'.length);
      label = PHASE_LABEL[phase] ?? phase;
    } else if (key.startsWith('J:')) {
      label = `Journée ${key.slice('J:'.length).padStart(2, '0')}`;
    } else {
      label = 'Date à confirmer';
    }

    const dateLabel = sameDay
      ? fmtDate(earliest)
      : `${fmtDateShort(earliest)} → ${fmtDateShort(latest)}`;

    rounds.push({ key, label, earliestDate: earliest, latestDate: latest, dateLabel, matches });
  }

  // Sort: REGULAR rounds first (par matchday/date), puis PHASES dans l'ordre
  const phaseOrder = ['R32', 'R16', 'QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL'];
  rounds.sort((a, b) => {
    const aIsPhase = a.key.startsWith('PHASE:');
    const bIsPhase = b.key.startsWith('PHASE:');
    if (aIsPhase !== bIsPhase) return aIsPhase ? 1 : -1; // PHASE après
    if (aIsPhase && bIsPhase) {
      return phaseOrder.indexOf(a.key.slice(6)) - phaseOrder.indexOf(b.key.slice(6));
    }
    return a.earliestDate.getTime() - b.earliestDate.getTime();
  });

  return rounds;
}

const FORMAT_LABEL: Record<string, string> = {
  CHAMPIONSHIP:         'Championnat',
  CHAMPIONSHIP_PLAYOFFS:'Championnat + Playoffs',
  CUP:                  'Coupe',
};

export function CompetitionCalendarPDF({
  data,
  logoBase64,
  generatedAt,
  siteUrl = 'lrhockey.re',
}: {
  data: CompetitionPdfData;
  /** Logo LRH encodé en base64 PNG (passé depuis l'API route). */
  logoBase64?: string;
  generatedAt: Date;
  siteUrl?: string;
}) {
  const rounds = buildRounds(data);
  const totalMatches = data.matches.length;
  const finishedCount = data.matches.filter((m) => m.status === 'FINISHED').length;
  const upcomingCount = totalMatches - finishedCount;
  const modeLabel = data.mode === 'GAZON' ? 'GAZON' : 'SALLE';

  return (
    <Document
      title={`Calendrier ${data.name} — Saison ${data.season}`}
      author="Ligue Réunionnaise de Hockey"
      subject={`Calendrier officiel ${data.name} ${data.season}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          {logoBase64 ? (
            <Image style={styles.headerLogo} src={`data:image/png;base64,${logoBase64}`} />
          ) : null}
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerKicker}>LIGUE RÉUNIONNAISE DE HOCKEY</Text>
            <Text style={styles.headerTitle}>Calendrier officiel</Text>
            <Text style={styles.headerSubtitle}>
              {modeLabel} · {data.category} · {FORMAT_LABEL[data.format] ?? data.format} · Saison {data.season}
            </Text>
          </View>
        </View>

        {/* Competition meta bar */}
        <View style={styles.metaBar}>
          <Text style={styles.metaChip}>{modeLabel}</Text>
          <Text style={styles.metaTitle}>{data.name}</Text>
          <Text style={styles.metaSeason}>Saison {data.season}</Text>
        </View>

        {/* Stats ribbon */}
        <View style={styles.statsRibbon}>
          <View style={styles.statsCell}>
            <Text style={styles.statsKicker}>ÉQUIPES</Text>
            <Text style={styles.statsValue}>{data.entries.length.toString().padStart(2, '0')}</Text>
            <Text style={styles.statsHint}>engagées</Text>
          </View>
          <View style={styles.statsCell}>
            <Text style={styles.statsKicker}>MATCHS</Text>
            <Text style={styles.statsValue}>{totalMatches.toString().padStart(2, '0')}</Text>
            <Text style={styles.statsHint}>au total</Text>
          </View>
          <View style={styles.statsCell}>
            <Text style={styles.statsKicker}>JOUÉS</Text>
            <Text style={styles.statsValue}>{finishedCount.toString().padStart(2, '0')}</Text>
            <Text style={styles.statsHint}>terminés</Text>
          </View>
          <View style={styles.statsCell}>
            <Text style={styles.statsKicker}>À VENIR</Text>
            <Text style={styles.statsValue}>{upcomingCount.toString().padStart(2, '0')}</Text>
            <Text style={styles.statsHint}>programmés</Text>
          </View>
        </View>

        {/* Engaged teams */}
        {data.entries.length > 0 && (
          <View style={styles.engagedBlock}>
            <Text style={styles.engagedLabel}>
              ÉQUIPES ENGAGÉES ({data.entries.length.toString().padStart(2, '0')})
            </Text>
            <Text style={styles.engagedList}>
              {data.entries.map((e) => e.club.name).join('  ·  ')}
            </Text>
          </View>
        )}

        {/* Rounds + matchs */}
        <View style={styles.body}>
          {rounds.length === 0 ? (
            <Text style={{ fontSize: 10, color: COLORS.mute, fontStyle: 'italic' }}>
              Aucun match programmé pour cette compétition.
            </Text>
          ) : (
            rounds.map((round) => (
              <View key={round.key} wrap={false}>
                <View style={styles.roundBand}>
                  <Text style={styles.roundChip}>{round.label.toUpperCase()}</Text>
                  <Text style={styles.roundDate}>{round.dateLabel}</Text>
                  <Text style={styles.roundCount}>
                    {round.matches.length.toString().padStart(2, '0')} {round.matches.length > 1 ? 'matchs' : 'match'}
                  </Text>
                </View>
                {round.matches.map((m) => (
                  <MatchLine key={m.id} m={m} />
                ))}
              </View>
            ))
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            LRH · Édité le {generatedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} · {siteUrl}
          </Text>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

function MatchLine({ m }: { m: CompetitionPdfMatch }) {
  const date = new Date(m.kickoffAt);
  const hasScore = m.homeScore != null && m.awayScore != null;
  const status = STATUS_LABEL[m.status] ?? m.status;
  const venue = m.venueRef ? `${m.venueRef.name} — ${m.venueRef.city}` : m.venue;

  return (
    <View style={styles.match} wrap={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
        <Text style={styles.matchTime}>{fmtTime(date)}</Text>
        <Text style={styles.matchHome}>{m.homeClub.name}</Text>
        {hasScore ? (
          <Text style={styles.matchScore}>
            {m.homeScore}  —  {m.awayScore}
          </Text>
        ) : (
          <Text style={styles.matchScoreEmpty}>vs</Text>
        )}
        <Text style={styles.matchAway}>{m.awayClub.name}</Text>
        <Text style={styles.matchStatus}>{status.toUpperCase()}</Text>
      </View>
      {venue && (
        <Text style={styles.matchVenue}>◉ {venue}{m.organizerClub ? `  ·  Organisé par ${m.organizerClub.name}` : ''}</Text>
      )}
    </View>
  );
}
