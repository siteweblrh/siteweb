/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeasonSlot = {
  date: string;
  matchday: number;
  slotIndex: number;
  label: string | null;
  calendarName: string;
  competition: {
    id?: string;
    name: string;
    mode: string;
    category: string;
    format: string;
  } | null;
  venue: string | null;
};

export type CompetitionColorEntry = {
  competitionId: string;
  name: string;
  color: string;
};

export type SeasonPlanPdfData = {
  season: string;
  slots: SeasonSlot[];
  title?: string;
  competitionColors?: CompetitionColorEntry[];
};

// ---------------------------------------------------------------------------
// Palette — fallback when no persistent color is provided
// ---------------------------------------------------------------------------

const COMP_PALETTE = [
  { bg: '#002244', fg: '#FFFFFF' },
  { bg: '#1B7340', fg: '#FFFFFF' },
  { bg: '#A8202F', fg: '#FFFFFF' },
  { bg: '#2563EB', fg: '#FFFFFF' },
  { bg: '#F3BC1C', fg: '#002244' },
  { bg: '#7C3AED', fg: '#FFFFFF' },
  { bg: '#0891B2', fg: '#FFFFFF' },
  { bg: '#DC2626', fg: '#FFFFFF' },
  { bg: '#059669', fg: '#FFFFFF' },
  { bg: '#D97706', fg: '#FFFFFF' },
];

function contrastFg(bg: string): string {
  const hex = bg.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? '#002244' : '#FFFFFF';
}

function buildColorMap(
  slots: SeasonSlot[],
  persistentColors?: CompetitionColorEntry[],
): Map<string, { bg: string; fg: string }> {
  const map = new Map<string, { bg: string; fg: string }>();

  if (persistentColors) {
    for (const entry of persistentColors) {
      map.set(entry.name, { bg: entry.color, fg: contrastFg(entry.color) });
    }
  }

  let idx = map.size;
  for (const s of slots) {
    const key = s.competition?.name ?? s.label ?? s.calendarName;
    if (!map.has(key)) {
      map.set(key, COMP_PALETTE[idx % COMP_PALETTE.length]);
      idx++;
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const C = {
  navy: '#002244',
  gold: '#F3BC1C',
  red: '#A8202F',
  paper: '#F8F9FA',
  ink: '#0F1B2E',
  ink2: '#2A3548',
  mute: '#6B7280',
  hair: '#E5E7EB',
  hairStrong: '#CBD5E0',
};

const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: 36,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.ink,
  },
  header: {
    backgroundColor: C.navy,
    color: '#fff',
    paddingTop: 18,
    paddingBottom: 18,
    paddingLeft: 28,
    paddingRight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: C.gold,
  },
  headerLogo: { width: 96, height: 42, marginRight: 18 },
  headerTextBlock: { flexGrow: 1 },
  headerKicker: {
    fontSize: 7, color: C.gold, letterSpacing: 2,
    fontFamily: 'Helvetica-Bold', marginBottom: 4,
  },
  headerTitle: {
    fontSize: 16, color: '#fff', fontFamily: 'Helvetica-Bold', letterSpacing: -0.3,
  },
  headerSub: { fontSize: 9, color: '#fff', opacity: 0.78, marginTop: 3 },

  legendBar: {
    backgroundColor: C.paper,
    paddingTop: 10, paddingBottom: 10, paddingLeft: 28, paddingRight: 28,
    borderBottomWidth: 0.5, borderBottomColor: C.hairStrong,
  },
  legendTitle: {
    fontSize: 7, color: C.mute, fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.4, marginBottom: 6,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 3, paddingBottom: 3, paddingLeft: 6, paddingRight: 8,
    marginRight: 4, marginBottom: 4,
  },
  legendDot: { width: 8, height: 8, marginRight: 5 },
  legendLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', letterSpacing: 0.3 },

  monthBand: {
    backgroundColor: C.navy,
    paddingTop: 8, paddingBottom: 8, paddingLeft: 28, paddingRight: 28,
    marginTop: 10,
  },
  monthLabel: {
    fontSize: 11, color: '#fff', fontFamily: 'Helvetica-Bold', letterSpacing: 1.5,
  },

  tableHeader: {
    flexDirection: 'row',
    paddingTop: 6, paddingBottom: 6, paddingLeft: 28, paddingRight: 28,
    borderBottomWidth: 1, borderBottomColor: C.hairStrong,
    backgroundColor: C.paper,
  },
  th: {
    fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.mute, letterSpacing: 1.2,
  },

  row: {
    flexDirection: 'row',
    paddingTop: 7, paddingBottom: 7, paddingLeft: 28, paddingRight: 28,
    borderBottomWidth: 0.5, borderBottomColor: C.hair,
    alignItems: 'center',
  },
  rowAlt: { backgroundColor: 'rgba(0,34,68,0.02)' },

  matchdaySeparator: {
    borderTopWidth: 1.5,
    borderTopColor: C.hairStrong,
  },

  cellDate: { width: 70, fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.navy },
  cellJournee: { width: 38, fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.ink2, textAlign: 'center' },
  cellCompetition: { width: 180, fontSize: 8.5, color: C.ink },
  cellCategory: { width: 55, fontSize: 7.5, color: C.mute, textAlign: 'center' },
  cellMode: { width: 40, fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'center', letterSpacing: 0.5 },
  cellVenue: { width: 110, fontSize: 8, color: C.ink2 },
  cellNotes: { flexGrow: 1, fontSize: 7.5, color: C.mute, fontStyle: 'italic' },

  colorStrip: {
    width: 4, height: '100%', position: 'absolute', left: 0, top: 0,
  },

  compChip: {
    paddingTop: 2, paddingBottom: 2, paddingLeft: 5, paddingRight: 5,
    fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.3,
  },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 8, paddingBottom: 8, paddingLeft: 28, paddingRight: 28,
    borderTopWidth: 1, borderTopColor: C.hairStrong,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: C.mute, letterSpacing: 0.5 },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const DAYS_FR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  const day = DAYS_FR[d.getUTCDay()];
  const num = d.getUTCDate().toString().padStart(2, '0');
  const month = MONTHS_FR[d.getUTCMonth()].slice(0, 3).toLowerCase();
  return `${day} ${num} ${month}`;
}

function monthYear(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS_FR[d.getUTCMonth()].toUpperCase()} ${d.getUTCFullYear()}`;
}

function formatGeneratedAt(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Indian/Reunion',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  data: SeasonPlanPdfData;
  logoDataUri?: string;
  generatedAt: Date;
};

export function SeasonPlanPDF({ data, logoDataUri, generatedAt }: Props) {
  const colorMap = buildColorMap(data.slots, data.competitionColors);

  const byMonth = new Map<string, SeasonSlot[]>();
  for (const slot of data.slots) {
    const key = monthYear(slot.date);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(slot);
  }

  const legendEntries = Array.from(colorMap.entries());
  const pdfTitle = data.title ?? `Planification ${data.season}`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Header */}
        <View style={s.header} fixed>
          {logoDataUri && <Image src={logoDataUri} style={s.headerLogo} />}
          <View style={s.headerTextBlock}>
            <Text style={s.headerKicker}>CALENDRIER GÉNÉRAL DE LA SAISON</Text>
            <Text style={s.headerTitle}>{pdfTitle}</Text>
            <Text style={s.headerSub}>
              {data.slots.length} créneaux · {byMonth.size} mois · Document de travail
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View style={s.legendBar}>
          <Text style={s.legendTitle}>LÉGENDE DES COMPÉTITIONS</Text>
          <View style={s.legendRow}>
            {legendEntries.map(([name, color]) => (
              <View key={name} style={s.legendChip}>
                <View style={[s.legendDot, { backgroundColor: color.bg }]} />
                <Text style={[s.legendLabel, { color: C.ink2 }]}>{name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Table header */}
        <View style={s.tableHeader} fixed>
          <Text style={[s.th, { width: 70 }]}>DATE</Text>
          <Text style={[s.th, { width: 38, textAlign: 'center' }]}>J.</Text>
          <Text style={[s.th, { width: 180 }]}>COMPÉTITION</Text>
          <Text style={[s.th, { width: 55, textAlign: 'center' }]}>CATÉGORIE</Text>
          <Text style={[s.th, { width: 40, textAlign: 'center' }]}>MODE</Text>
          <Text style={[s.th, { width: 110 }]}>LIEU</Text>
          <Text style={[s.th, { flexGrow: 1 }]}>NOTES</Text>
        </View>

        {/* Months + rows */}
        {Array.from(byMonth.entries()).map(([month, slots]) => {
          const byMatchday = new Map<number, SeasonSlot[]>();
          for (const sl of slots) {
            if (!byMatchday.has(sl.matchday)) byMatchday.set(sl.matchday, []);
            byMatchday.get(sl.matchday)!.push(sl);
          }

          let globalIdx = 0;
          const matchdayEntries = Array.from(byMatchday.entries());

          return (
            <View key={month}>
              {/* Month band + first matchday group kept together to avoid orphaned header */}
              {matchdayEntries.map((entry, mdIdx) => {
                const [, mdSlots] = entry;
                const isFirst = mdIdx === 0;

                const rows = mdSlots.map((slot) => {
                  const compName = slot.competition?.name ?? slot.label ?? '—';
                  const color = colorMap.get(compName) ?? COMP_PALETTE[0];
                  const mode = slot.competition?.mode;
                  const modeLabel = mode === 'GAZON' ? 'GAZ' : mode === 'SALLE' ? 'SAL' : '—';
                  const modeColor = mode === 'GAZON' ? '#1B7340' : mode === 'SALLE' ? '#2563EB' : C.mute;
                  const rowIdx = globalIdx++;

                  return (
                    <View
                      key={`${slot.date}-${slot.slotIndex}-${rowIdx}`}
                      style={[s.row, rowIdx % 2 === 1 ? s.rowAlt : {}]}
                    >
                      <View style={[s.colorStrip, { backgroundColor: color.bg }]} />
                      <Text style={s.cellDate}>{formatDateFr(slot.date)}</Text>
                      <Text style={s.cellJournee}>J{slot.matchday}</Text>
                      <View style={s.cellCompetition}>
                        <Text style={[s.compChip, { backgroundColor: color.bg, color: color.fg }]}>
                          {compName}
                        </Text>
                      </View>
                      <Text style={s.cellCategory}>{slot.competition?.category ?? '—'}</Text>
                      <Text style={[s.cellMode, { color: modeColor }]}>{modeLabel}</Text>
                      <Text style={s.cellVenue}>{slot.venue ?? '— À définir —'}</Text>
                      <Text style={s.cellNotes}>{slot.label ?? ''}</Text>
                    </View>
                  );
                });

                if (isFirst) {
                  return (
                    <View key={`md-${mdSlots[0].matchday}`} wrap={false}>
                      <View style={s.monthBand}>
                        <Text style={s.monthLabel}>{month}</Text>
                      </View>
                      {rows}
                    </View>
                  );
                }

                return (
                  <View key={`md-${mdSlots[0].matchday}`} wrap={false} style={s.matchdaySeparator}>
                    {rows}
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Ligue Réunionnaise de Hockey · Calendrier {data.season}
          </Text>
          <Text style={s.footerText}>
            Généré le {formatGeneratedAt(generatedAt)}
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
