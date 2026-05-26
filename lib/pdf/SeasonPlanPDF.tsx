/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeasonSlot = {
  date: string; // ISO
  matchday: number;
  slotIndex: number;
  label: string | null;
  calendarName: string;
  competition: {
    name: string;
    mode: string;
    category: string;
    format: string;
  } | null;
  venue: string | null; // resolved name or free-text
};

export type SeasonPlanPdfData = {
  season: string;
  slots: SeasonSlot[];
};

// ---------------------------------------------------------------------------
// Palette — one color per unique competition, cycled from a fixed set
// ---------------------------------------------------------------------------

const COMP_PALETTE = [
  { bg: '#002244', fg: '#FFFFFF' }, // navy
  { bg: '#1B7340', fg: '#FFFFFF' }, // green (gazon)
  { bg: '#A8202F', fg: '#FFFFFF' }, // red
  { bg: '#2563EB', fg: '#FFFFFF' }, // blue (salle)
  { bg: '#F3BC1C', fg: '#002244' }, // gold
  { bg: '#7C3AED', fg: '#FFFFFF' }, // purple
  { bg: '#0891B2', fg: '#FFFFFF' }, // teal
  { bg: '#DC2626', fg: '#FFFFFF' }, // bright red
  { bg: '#059669', fg: '#FFFFFF' }, // emerald
  { bg: '#D97706', fg: '#FFFFFF' }, // amber
];

function buildColorMap(slots: SeasonSlot[]): Map<string, { bg: string; fg: string }> {
  const map = new Map<string, { bg: string; fg: string }>();
  let idx = 0;
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
    fontSize: 7,
    color: C.gold,
    letterSpacing: 2,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 9,
    color: '#fff',
    opacity: 0.78,
    marginTop: 3,
  },

  // Legend strip
  legendBar: {
    backgroundColor: C.paper,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 28,
    paddingRight: 28,
    borderBottomWidth: 0.5,
    borderBottomColor: C.hairStrong,
  },
  legendTitle: {
    fontSize: 7,
    color: C.mute,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 6,
    paddingRight: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    marginRight: 5,
  },
  legendLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.3,
  },

  // Month band
  monthBand: {
    backgroundColor: C.navy,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 28,
    paddingRight: 28,
    marginTop: 10,
  },
  monthLabel: {
    fontSize: 11,
    color: '#fff',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
  },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 28,
    paddingRight: 28,
    borderBottomWidth: 1,
    borderBottomColor: C.hairStrong,
    backgroundColor: C.paper,
  },
  th: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.mute,
    letterSpacing: 1.2,
  },

  // Table row
  row: {
    flexDirection: 'row',
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 28,
    paddingRight: 28,
    borderBottomWidth: 0.5,
    borderBottomColor: C.hair,
    alignItems: 'center',
  },
  rowAlt: {
    backgroundColor: 'rgba(0,34,68,0.02)',
  },

  // Cells
  cellDate: { width: 70, fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.navy },
  cellJournee: { width: 38, fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.ink2, textAlign: 'center' },
  cellCompetition: { width: 180, fontSize: 8.5, color: C.ink },
  cellCategory: { width: 55, fontSize: 7.5, color: C.mute, textAlign: 'center' },
  cellMode: { width: 40, fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'center', letterSpacing: 0.5 },
  cellVenue: { width: 110, fontSize: 8, color: C.ink2 },
  cellNotes: { flexGrow: 1, fontSize: 7.5, color: C.mute, fontStyle: 'italic' },

  // Color strip on left of row
  colorStrip: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },

  // Chip for competition name
  compChip: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 5,
    paddingRight: 5,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 28,
    paddingRight: 28,
    borderTopWidth: 1,
    borderTopColor: C.hairStrong,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: C.mute,
    letterSpacing: 0.5,
  },
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
  const colorMap = buildColorMap(data.slots);

  // Group slots by month
  const byMonth = new Map<string, SeasonSlot[]>();
  for (const slot of data.slots) {
    const key = monthYear(slot.date);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(slot);
  }

  // Legend entries
  const legendEntries = Array.from(colorMap.entries());

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          {logoDataUri && <Image src={logoDataUri} style={s.headerLogo} />}
          <View style={s.headerTextBlock}>
            <Text style={s.headerKicker}>CALENDRIER GÉNÉRAL DE LA SAISON</Text>
            <Text style={s.headerTitle}>
              Planification {data.season}
            </Text>
            <Text style={s.headerSub}>
              {data.slots.length} créneaux · {byMonth.size} mois · Document de travail — lieux à décider en concertation
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
        <View style={s.tableHeader}>
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
          // Group slots within the month by date to keep same-day rows together
          const byDate = new Map<string, SeasonSlot[]>();
          for (const sl of slots) {
            const dk = sl.date.slice(0, 10);
            if (!byDate.has(dk)) byDate.set(dk, []);
            byDate.get(dk)!.push(sl);
          }

          let globalIdx = 0;
          return (
            <View key={month}>
              <View style={s.monthBand} wrap={false}>
                <Text style={s.monthLabel}>{month}</Text>
              </View>
              {Array.from(byDate.values()).map((daySlots) => (
                <View key={daySlots[0].date + daySlots[0].slotIndex} wrap={false}>
                  {daySlots.map((slot) => {
                    const compName = slot.competition?.name ?? slot.label ?? '—';
                    const color = colorMap.get(compName) ?? COMP_PALETTE[0];
                    const mode = slot.competition?.mode;
                    const modeLabel = mode === 'GAZON' ? 'GAZ' : mode === 'SALLE' ? 'SAL' : '—';
                    const modeColor = mode === 'GAZON' ? '#1B7340' : mode === 'SALLE' ? '#2563EB' : C.mute;
                    const rowIdx = globalIdx++;

                    return (
                      <View key={`${slot.date}-${slot.slotIndex}-${rowIdx}`} style={[s.row, rowIdx % 2 === 1 ? s.rowAlt : {}]}>
                        <View style={[s.colorStrip, { backgroundColor: color.bg }]} />
                        <Text style={s.cellDate}>{formatDateFr(slot.date)}</Text>
                        <Text style={s.cellJournee}>J{slot.matchday}</Text>
                        <View style={s.cellCompetition}>
                          <Text style={[s.compChip, { backgroundColor: color.bg, color: color.fg }]}>
                            {compName}
                          </Text>
                        </View>
                        <Text style={s.cellCategory}>
                          {slot.competition?.category ?? '—'}
                        </Text>
                        <Text style={[s.cellMode, { color: modeColor }]}>
                          {modeLabel}
                        </Text>
                        <Text style={s.cellVenue}>
                          {slot.venue ?? '— À définir —'}
                        </Text>
                        <Text style={s.cellNotes}>
                          {slot.label ?? ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Ligue Réunionnaise de Hockey · Calendrier général {data.season}
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
