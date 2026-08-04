/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import type { CompetitionPdfData } from '@/lib/queries/competitionPdf';
import { PdfFooter } from '@/lib/pdf/PdfFooter';
import {
  COLORS,
  styles,
  buildRounds,
  MatchLine,
  clubLabel,
  truncate,
} from '@/lib/pdf/CompetitionCalendarPDF';

/**
 * Calendrier officiel de TOUTE une saison, toutes compétitions confondues.
 *
 * Ne duplique rien du document par compétition : `buildRounds`, `MatchLine`,
 * les couleurs et la feuille de styles sont importés depuis
 * `CompetitionCalendarPDF`. Ce fichier n'ajoute que la mise en page de niveau
 * saison — en-tête global, ruban de stats cumulées, sommaire, et un bandeau de
 * section par compétition.
 *
 * Choix de pagination : une seule `<Page>` qui s'écoule, pas une page par
 * compétition. Une saison de ligue régionale, c'est quelques dizaines de matchs
 * (27 en 2025-2026) ; forcer un saut de page par compétition produirait des
 * pages à trois lignes. Chaque section reste insécable au niveau du bandeau
 * (`wrap={false}` sur le couple bandeau + première journée) pour qu'un titre ne
 * se retrouve jamais seul en bas de page.
 */
export function SeasonCalendarPDF({
  season,
  competitions,
  logoDataUri,
  clubLogos,
  siteUrl = 'lrh.re',
}: {
  season: string;
  competitions: CompetitionPdfData[];
  /** Logo LRH en data URI, préparé par l'API route. */
  logoDataUri?: string;
  /** Logos clubs en data URI indexés par clubId, dédupliqués par la route. */
  clubLogos?: Map<string, string>;
  siteUrl?: string;
}) {
  const allMatches = competitions.flatMap((c) => c.matches);
  const totalMatches = allMatches.length;
  const finishedCount = allMatches.filter((m) => m.status === 'FINISHED').length;
  const upcomingCount = totalMatches - finishedCount;

  // Équipes distinctes engagées sur l'ensemble de la saison — un club engagé
  // dans trois compétitions ne compte qu'une fois.
  const clubIds = new Set<string>();
  for (const c of competitions) for (const e of c.entries) clubIds.add(e.club.id);

  const seasonLabel = season.replace(/-/g, '–');

  return (
    <Document
      title={`Calendrier officiel — Saison ${season}`}
      author="Ligue Réunionnaise de Hockey"
      subject={`Calendrier officiel de la saison ${season}, toutes compétitions`}
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
            <Text style={styles.headerTitle}>Calendrier officiel</Text>
            <Text style={styles.headerSubtitle}>
              Saison {seasonLabel} · toutes compétitions
            </Text>
          </View>
        </View>

        <View style={styles.metaBar}>
          <Text style={styles.metaChip}>SAISON</Text>
          <Text style={styles.metaTitle}>
            {competitions.length.toString().padStart(2, '0')}{' '}
            {competitions.length > 1 ? 'compétitions' : 'compétition'}
          </Text>
          <Text style={styles.metaSeason}>{seasonLabel}</Text>
        </View>

        <View style={styles.statsRibbon}>
          <View style={styles.statsCell}>
            <Text style={styles.statsKicker}>CLUBS</Text>
            <Text style={styles.statsValue}>{clubIds.size.toString().padStart(2, '0')}</Text>
            <Text style={styles.statsHint}>engagés</Text>
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

        {/* Sommaire — sur un document multi-compétitions, savoir ce qu'il
            contient avant de faire défiler dix pages a une vraie valeur. */}
        {competitions.length > 1 && (
          <View style={styles.engagedBlock}>
            <Text style={styles.engagedLabel}>
              AU SOMMAIRE ({competitions.length.toString().padStart(2, '0')})
            </Text>
            <Text style={styles.engagedList}>
              {competitions
                .map((c) => `${c.mode === 'GAZON' ? 'Gazon' : 'Salle'} · ${c.name}`)
                .join('   ·   ')}
            </Text>
          </View>
        )}

        <View style={styles.body}>
          {competitions.length === 0 ? (
            <Text style={{ fontSize: 10, color: COLORS.mute, fontStyle: 'italic' }}>
              Aucun match publié pour la saison {seasonLabel}.
            </Text>
          ) : (
            competitions.map((comp) => {
              const rounds = buildRounds(comp);
              const played = comp.matches.filter((m) => m.status === 'FINISHED').length;
              return (
                <View key={comp.id}>
                  {/* Bandeau de compétition, solidaire de sa première journée */}
                  <View wrap={false}>
                    <View style={competitionBand}>
                      <Text style={competitionBandChip}>
                        {comp.mode === 'GAZON' ? 'GAZON' : 'SALLE'}
                      </Text>
                      <Text style={competitionBandTitle}>{truncate(comp.name, 52)}</Text>
                      <Text style={competitionBandMeta}>
                        {comp.category} · {comp.matches.length.toString().padStart(2, '0')} match
                        {comp.matches.length > 1 ? 's' : ''} · {played.toString().padStart(2, '0')} joué
                        {played > 1 ? 's' : ''}
                      </Text>
                    </View>
                    {comp.entries.length > 0 && (
                      <Text style={competitionTeams}>
                        {comp.entries.map((e) => clubLabel(e.club)).join('  ·  ')}
                      </Text>
                    )}
                    {rounds[0] && <RoundBlock round={rounds[0]} clubLogos={clubLogos} />}
                  </View>
                  {rounds.slice(1).map((round) => (
                    <View key={round.key} wrap={false}>
                      <RoundBlock round={round} clubLogos={clubLogos} />
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>

        <PdfFooter season={season} inset={32} siteUrl={siteUrl} />
      </Page>
    </Document>
  );
}

/** Bandeau de journée + ses matchs — identique au document par compétition. */
function RoundBlock({
  round,
  clubLogos,
}: {
  round: ReturnType<typeof buildRounds>[number];
  clubLogos?: Map<string, string>;
}) {
  return (
    <View>
      <View style={styles.roundBand}>
        <Text style={styles.roundChip}>{round.label.toUpperCase()}</Text>
        <Text style={styles.roundDate}>
          {round.dateLabel}
          {round.sharedVenue ? ` · ${truncate(round.sharedVenue, 40)}` : ''}
        </Text>
        <Text style={styles.roundCount}>
          {round.matches.length.toString().padStart(2, '0')}{' '}
          {round.matches.length > 1 ? 'matchs' : 'match'}
        </Text>
      </View>
      {round.matches.map((m) => (
        <MatchLine
          key={m.id}
          m={m}
          hideVenue={round.sharedVenue != null}
          clubLogos={clubLogos}
        />
      ))}
    </View>
  );
}

// Styles propres au niveau « saison ». Volontairement plus marqués que le
// bandeau de journée (navy plein + filet doré) : dans un document qui empile
// plusieurs compétitions, la hiérarchie compétition > journée > match doit se
// lire d'un coup d'œil, sans quoi tout se confond.
const competitionBand = {
  marginTop: 16,
  marginBottom: 2,
  paddingTop: 7,
  paddingBottom: 7,
  paddingLeft: 10,
  paddingRight: 10,
  backgroundColor: COLORS.navy,
  borderLeftWidth: 4,
  borderLeftColor: COLORS.gold,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
};

const competitionBandChip = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 7,
  letterSpacing: 1,
  color: COLORS.navy,
  backgroundColor: COLORS.gold,
  paddingTop: 2,
  paddingBottom: 2,
  paddingLeft: 5,
  paddingRight: 5,
  marginRight: 9,
};

const competitionBandTitle = {
  fontFamily: 'Helvetica-Bold',
  fontSize: 11,
  color: '#fff',
  flexGrow: 1,
};

const competitionBandMeta = {
  fontSize: 7.5,
  color: 'rgba(255,255,255,0.72)',
};

const competitionTeams = {
  fontSize: 7.5,
  color: COLORS.mute,
  paddingLeft: 10,
  paddingRight: 10,
  paddingTop: 4,
  paddingBottom: 6,
};
