'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';

/**
 * Bloc de téléchargement d'un document officiel (PDF).
 *
 * Générique dès le départ parce que la ligue en publiera d'autres (règlements,
 * circulaires) : c'est le troisième endroit du site à proposer un PDF après le
 * calendrier de `/competitions` et les affiches sociales, et le premier à en
 * proposer un qui n'est pas généré à la volée.
 *
 * `audience` est le point important : un document destiné aux **clubs** posé
 * sur une page lue par des familles doit dire à qui il s'adresse, sinon un
 * parent venu inscrire son enfant croit avoir trouvé son formulaire.
 *
 * Accessibilité : le poids et le format sont dans le texte du lien, pas
 * seulement en décoration — un lecteur d'écran annonce donc « ... PDF, 2,2 Mo »
 * avant l'activation, et l'utilisateur sait qu'il quitte la page. `download`
 * plutôt qu'un simple `target="_blank"` : sur mobile, ouvrir un PDF de 2 Mo
 * dans un onglet est plus hostile que le télécharger.
 */
export function DocumentDownload({
  kicker,
  title,
  description,
  audience,
  href,
  fileLabel,
  mobileVariant = false,
}: {
  /** Sur-titre mono numéroté, ex. « 02 · Documents officiels ». */
  kicker: string;
  title: string;
  description: string;
  /** À qui le document s'adresse, ex. « Réservé aux clubs ». Facultatif. */
  audience?: string;
  href: string;
  /** Format et poids, ex. « PDF · 2,2 Mo ». */
  fileLabel: string;
  mobileVariant?: boolean;
}) {
  return (
    <section
      style={{
        background: LRH.paperWarm,
        borderBottom: '1px solid ' + LRH.hair,
        padding: mobileVariant
          ? '24px 16px'
          : 'clamp(28px, 3.5vw, 44px) clamp(24px, 5vw, 64px)',
      }}
    >
      <div
        style={{
          maxWidth: 820,
          background: '#fff',
          border: '1px solid ' + LRH.hairStrong,
          borderLeft: `4px solid ${LRH.red}`,
          padding: mobileVariant ? '18px 16px' : '24px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              ...mono,
              fontSize: 10,
              fontWeight: 700,
              color: LRH.red,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            {kicker}
          </span>
          {audience && (
            <span
              style={{
                ...mono,
                fontSize: 9.5,
                fontWeight: 700,
                color: '#fff',
                background: LRH.navy,
                padding: '3px 8px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {audience}
            </span>
          )}
        </div>

        <h2
          style={{
            ...display,
            fontWeight: 800,
            fontSize: mobileVariant ? 22 : 28,
            color: LRH.navy,
            margin: '0 0 10px',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            ...body,
            fontSize: mobileVariant ? 14 : 15,
            color: LRH.ink2,
            lineHeight: 1.65,
            margin: '0 0 18px',
          }}
        >
          {description}
        </p>

        <a
          href={href}
          download
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            padding: mobileVariant ? '12px 16px' : '12px 18px',
            background: LRH.navy,
            color: '#fff',
            textDecoration: 'none',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            border: '1px solid ' + LRH.navy,
            // Cible tactile ≥ 44px de haut, cf. règles responsive du projet.
            minHeight: 44,
            boxSizing: 'border-box',
          }}
        >
          <span aria-hidden="true">▤</span>
          Télécharger — {fileLabel}
        </a>
      </div>
    </section>
  );
}
