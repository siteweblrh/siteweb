/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import type { CompetitionPdfData, CompetitionPdfMatch } from '@/lib/queries/competitionPdf';
import { PdfFooter } from '@/lib/pdf/PdfFooter';
import {
  COLORS,
  styles,
  MatchLine,
  PHASE_LABEL,
  fmtDate,
  truncate,
} from '@/lib/pdf/CompetitionCalendarPDF';

/**
 * Programme d'UNE journée, toutes compétitions confondues, dans l'ordre des
 * coups d'envoi.
 *
 * Différence avec le document de saison : celui-ci range les matchs par
 * compétition. Pour une journée qui mêle plusieurs compétitions (finales salle
 * du 08/11/2026 : jeunes 8h30, 3e place 9h30, jeunes 10h30, finale 11h30), ce
 * rangement casserait l'ordre de la matinée — or c'est précisément ce qu'on
 * imprime pour le gymnase et les clubs. Chaque match porte donc sa compétition
 * en légende, au-dessus de la ligne réutilisée de `CompetitionCalendarPDF`.
 */
export type DayPdfEntry = {
  match: CompetitionPdfMatch;
  competition: Pick<CompetitionPdfData, 'name' | 'mode' | 'category'>;
};

export function DayCalendarPDF({
  season,
  date,
  entries,
  logoDataUri,
  clubLogos,
  siteUrl = 'lrh.re',
}: {
  season: string;
  /** Un instant quelconque de la journée, pour le libellé. */
  date: Date;
  /** Déjà triés par coup d'envoi. */
  entries: DayPdfEntry[];
  logoDataUri?: string;
  clubLogos?: Map<string, string>;
  siteUrl?: string;
}) {
  const dateLabel = fmtDate(date);
  const modes = new Set(entries.map((e) => e.competition.mode));
  const modeLabel = modes.size === 1 ? ([...modes][0] === 'GAZON' ? 'GAZON' : 'SALLE') : 'JOURNÉE';

  // Terrain commun à tous les matchs : annoncé une fois dans le bandeau, comme
  // le fait `buildRounds`. Null dès qu'un seul match diffère.
  const venues = entries.map((e) => e.match.venueRef?.name ?? e.match.venue ?? null);
  const sharedVenue = venues[0] != null && venues.every((v) => v === venues[0]) ? venues[0] : null;

  return (
    <Document
      title={`Programme du ${dateLabel}`}
      author="Ligue Réunionnaise de Hockey"
      subject={`Programme officiel de la journée du ${dateLabel}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          {logoDataUri ? (
            <View style={styles.headerLogoBox}>
              <Image style={styles.headerLogo} src={logoDataUri} />
            </View>
          ) : null}
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerKicker}>LIGUE RÉUNIONNAISE DE HOCKEY</Text>
            <Text style={styles.headerTitle}>Programme de la journée</Text>
            <Text style={styles.headerSubtitle}>Saison {season.replace(/-/g, '–')}</Text>
          </View>
        </View>

        <View style={styles.metaBar}>
          <Text style={styles.metaChip}>{modeLabel}</Text>
          <Text style={[styles.metaTitle, { textTransform: 'capitalize' }]}>{dateLabel}</Text>
          <Text style={styles.metaSeason}>
            {entries.length.toString().padStart(2, '0')} {entries.length > 1 ? 'matchs' : 'match'}
          </Text>
        </View>

        <View style={styles.body}>
          {sharedVenue && (
            <View style={styles.roundBand}>
              <Text style={styles.roundChip}>LIEU</Text>
              <Text style={styles.roundDate}>{truncate(sharedVenue, 60)}</Text>
            </View>
          )}
          {entries.map(({ match, competition }) => (
            <View key={match.id} wrap={false} style={{ marginTop: 8 }}>
              <Text style={caption}>
                {competition.mode === 'GAZON' ? 'GAZON' : 'SALLE'} · {competition.category} ·{' '}
                {truncate(competition.name, 60)} · {roundLabel(match)}
              </Text>
              <MatchLine m={match} hideVenue={sharedVenue != null} clubLogos={clubLogos} />
            </View>
          ))}
        </View>

        <PdfFooter season={season} inset={32} siteUrl={siteUrl} />
      </Page>
    </Document>
  );
}

function roundLabel(m: CompetitionPdfMatch): string {
  if (m.phase !== 'REGULAR') return PHASE_LABEL[m.phase] ?? m.phase;
  if (m.matchday != null) return `Journée ${m.matchday.toString().padStart(2, '0')}`;
  return 'Match';
}

const caption = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 7,
  letterSpacing: 0.8,
  color: COLORS.red,
  textTransform: 'uppercase' as const,
  paddingLeft: 10,
  paddingRight: 10,
  paddingBottom: 2,
};
