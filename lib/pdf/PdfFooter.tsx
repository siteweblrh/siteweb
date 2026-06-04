import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

// Pied de page officiel commun à TOUS les PDF de la ligue (calendrier
// compétition, calendrier général de saison, etc.). Reproduit fidèlement le
// bloc identité de la fiche d'engagement officielle pour assurer la
// concordance entre documents :
//
//   LIGUE RÉUNIONNAISE DE HOCKEY SUR GAZON DE LA RÉUNION <saison>   lrh.re   Page X / Y
//   Maison Régionale des Sports - 1, Rue Philibert Tsiranana - 97 494 SAINTE CLOTILDE - Mail : lrh974@gmail.com
//
// Source de vérité : public/Fiche-Engagement-lrh-editable-2026.pdf.

const COLORS = {
  navy: '#002244',
  mute: '#6B7280',
  hairStrong: '#CBD5E0',
};

const ORG_NAME = 'LIGUE RÉUNIONNAISE DE HOCKEY SUR GAZON DE LA RÉUNION';
const ADDRESS_LINE =
  'Maison Régionale des Sports - 1, Rue Philibert Tsiranana - 97 494 SAINTE CLOTILDE - Mail : lrh974@gmail.com';

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 12,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.hairStrong,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  org: {
    flexGrow: 1,
    fontSize: 7,
    color: COLORS.navy,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.4,
  },
  site: {
    fontSize: 7,
    color: COLORS.mute,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.4,
    marginRight: 14,
  },
  page: {
    fontSize: 7,
    color: COLORS.mute,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.4,
  },
  address: {
    fontSize: 6.5,
    color: COLORS.mute,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});

/**
 * Pied de page LRH partagé. `inset` = marge horizontale (gauche/droite) pour
 * s'aligner sur le padding du corps de chaque page (32 en portrait A4, 28 en
 * paysage). `siteUrl` rarement surchargé.
 */
export function PdfFooter({
  season,
  inset = 32,
  siteUrl = 'lrh.re',
}: {
  season?: string;
  inset?: number;
  siteUrl?: string;
}) {
  return (
    <View style={[styles.footer, { left: inset, right: inset }]} fixed>
      <View style={styles.topRow}>
        <Text style={styles.org}>
          {ORG_NAME}
          {season ? ` ${season}` : ''}
        </Text>
        <Text style={styles.site}>{siteUrl}</Text>
        <Text
          style={styles.page}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
      <Text style={styles.address}>{ADDRESS_LINE}</Text>
    </View>
  );
}
