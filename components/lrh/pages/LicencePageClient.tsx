'use client';

import React, { useEffect, useState } from 'react';
import { LRH, mono, display, body } from '../tokens';
import {
  HeaderDesktop,
  HeaderMobile,
  FooterDesktop,
  MobileTabBar,
  PageHero,
  LicenceDirectory,
  SeasonToggle,
  MobileSeasonToggle,
  type Mode,
} from '../sections';
// Fichier réel et non le barrel : dans un arbre `'use client'` du site public,
// `from '../sections'` fait entrer les 37 modules réexportés dans le chunk de
// la page (cf. CLAUDE.md, mesuré le 2026-07-19). Les imports groupés au-dessus
// sont un reste antérieur à cette règle, pas un modèle à suivre.
import { DocumentDownload } from '../sections/DocumentDownload';
import type { DirectoryClub } from '@/lib/queries/club';

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return m;
}

export function LicencePageClient({
  clubs,
  heroSubtitle,
  introText,
  engagementPdf,
}: {
  clubs: DirectoryClub[];
  heroSubtitle: string;
  introText: string;
  /** `null` si le fichier est absent du build — on n'affiche alors rien. */
  engagementPdf: { href: string; fileLabel: string } | null;
}) {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? (
        <HeaderMobile mode={mode} setMode={setMode} />
      ) : (
        <HeaderDesktop mode={mode} setMode={setMode} />
      )}

      <PageHero
        mobileVariant={isMobile}
        index="07"
        kicker="S'engager dans un club"
        title={'Prendre\nsa licence.'}
        subtitle={heroSubtitle}
        tag={`${clubs.length} club${clubs.length > 1 ? 's' : ''} affilié${clubs.length > 1 ? 's' : ''} à la Ligue`}
        rightSlot={
          isMobile ? (
            <MobileSeasonToggle mode={mode} setMode={setMode} />
          ) : (
            <SeasonToggle mode={mode} setMode={setMode} size="lg" />
          )
        }
      />

      {/* Intro */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid ' + LRH.hair,
          padding: isMobile
            ? '24px 16px'
            : 'clamp(28px, 3.5vw, 44px) clamp(24px, 5vw, 64px)',
        }}
      >
        <div style={{ maxWidth: 820 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 18, height: 1, background: LRH.gold }} />
            <span
              style={{
                ...mono,
                fontSize: 10,
                fontWeight: 700,
                color: LRH.gold,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              ◉ Comment ça fonctionne
            </span>
          </div>
          <p
            style={{
              ...body,
              fontSize: isMobile ? 14 : 15.5,
              color: LRH.ink2,
              lineHeight: 1.65,
              margin: 0,
              whiteSpace: 'pre-line',
            }}
          >
            {introText}
          </p>
        </div>
      </div>

      {/* Placé APRÈS l'annuaire : le visiteur type de cette page est un joueur
          ou un parent, l'annuaire des clubs est ce qu'il vient chercher. La
          fiche d'engagement est un document de gestion destiné aux clubs, d'où
          le badge d'audience — sans lui, un parent la prendrait pour son
          formulaire d'inscription. */}
      <LicenceDirectory clubs={clubs} mobileVariant={isMobile} />

      {engagementPdf && (
        <DocumentDownload
          mobileVariant={isMobile}
          kicker="◉ Documents officiels"
          audience="Réservé aux clubs"
          title="Fiche d'engagement 2026-2027"
          description="Version imprimable de la fiche d'engagement des clubs en compétition : contacts, infrastructures, équipes engagées, arbitres et règlement. Les clubs affiliés peuvent aussi la remplir en ligne depuis leur espace, sans impression ni envoi postal."
          href={engagementPdf.href}
          fileLabel={engagementPdf.fileLabel}
        />
      )}

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
