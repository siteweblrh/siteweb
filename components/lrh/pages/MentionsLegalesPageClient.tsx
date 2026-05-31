'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LRH, body, mono, display } from '../tokens';
import {
  HeaderDesktop,
  HeaderMobile,
  FooterDesktop,
  MobileTabBar,
  PageHero,
  type Mode,
} from '../sections';

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

type Section = {
  index: string;
  title: string;
  content: React.ReactNode;
};

const ulStyle: React.CSSProperties = {
  marginTop: 10,
  paddingLeft: 22,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const SECTIONS: Section[] = [
  {
    index: '01',
    title: 'Éditeur du site',
    content: (
      <>
        <p>
          Le présent site est édité par la <strong>Ligue Réunionnaise de Hockey (LRH)</strong>,
          association sportive régie par la loi du 1<sup>er</sup> juillet 1901.
        </p>
        <DefList
          items={[
            ['Raison sociale', 'Ligue Réunionnaise de Hockey'],
            ['Forme juridique', 'Association loi 1901'],
            ['Adresse du siège', 'Route de la Digue, Maison des Sports — 97400 Saint-Denis'],
            ['SIREN', '421 664 079'],
            ['RNA', 'W9R1000088'],
          ]}
        />
      </>
    ),
  },
  {
    index: '02',
    title: 'Directeur de la publication',
    content: (
      <>
        <p>
          Le directeur de la publication est <strong>M. Jean Gabin LAKIA</strong>, en qualité de
          président de la Ligue Réunionnaise de Hockey.
        </p>
        <p style={{ marginTop: 12 }}>
          Pour toute demande relative au contenu du site, vous pouvez contacter la ligue par voie
          postale à l'adresse du siège indiquée ci-dessus.
        </p>
      </>
    ),
  },
  {
    index: '03',
    title: 'Hébergeur',
    content: (
      <>
        <p>
          Le site est hébergé par <strong>Vercel Inc.</strong>, fournisseur de services
          d'hébergement et de déploiement applicatif.
        </p>
        <DefList
          items={[
            ['Société', 'Vercel Inc.'],
            ['Adresse', '440 N Barranca Ave #4133, Covina, CA 91723, États-Unis'],
            ['Site web', 'vercel.com'],
          ]}
        />
      </>
    ),
  },
  {
    index: '04',
    title: 'Conception et réalisation',
    content: (
      <>
        <p>
          La conception, le développement et la maintenance du site sont assurés par{' '}
          <strong>MR Digital Solutions</strong>, entreprise individuelle exerçant sous le nom de{' '}
          son dirigeant, <strong>M. Mickael RANAIVOSON</strong>.
        </p>
        <DefList
          items={[
            ['Raison sociale', 'MR Digital Solutions'],
            ['Forme juridique', 'Entreprise individuelle'],
            ['SIREN', '902 063 197'],
            ['Dirigeant', 'M. Mickael RANAIVOSON'],
            ['Site web', 'mickaelranaivoson.fr'],
          ]}
        />
      </>
    ),
  },
  {
    index: '05',
    title: 'Propriété intellectuelle',
    content: (
      <>
        <p>
          L'ensemble du contenu présent sur ce site (textes, photographies, logos, identité
          graphique, illustrations, vidéos, base de données) est protégé par les dispositions du
          Code de la propriété intellectuelle. Sauf mention contraire explicite, ces éléments sont
          la propriété exclusive de la Ligue Réunionnaise de Hockey ou de ses partenaires (clubs
          affiliés, sponsors, photographes).
        </p>
        <p style={{ marginTop: 12 }}>
          Toute reproduction, représentation, modification, publication, adaptation ou
          exploitation, totale ou partielle, des éléments du site, quel que soit le moyen ou le
          procédé utilisé, est interdite sans l'autorisation écrite préalable de la ligue, à
          l'exception des usages strictement réservés à un cadre privé ou à des fins
          d'information journalistique citant la source.
        </p>
        <p style={{ marginTop: 12 }}>
          Les marques et logos des clubs affiliés et de leurs sponsors reproduits sur ce site
          demeurent la propriété de leurs détenteurs respectifs.
        </p>
      </>
    ),
  },
  {
    index: '06',
    title: 'Données personnelles & RGPD',
    content: (
      <>
        <p>
          Le site collecte des données personnelles dans les cas suivants :
        </p>
        <ul style={ulStyle}>
          <li>Création et gestion des comptes utilisateurs (gestionnaires de clubs, administrateurs ligue) ;</li>
          <li>Données d'identité des licenciés affichées sur les fiches publiques des clubs (nom, prénom, numéro de licence, photo si fournie) ;</li>
          <li>Données relatives aux arbitres et membres du bureau (nom, photo, fonction).</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          Conformément au Règlement Général sur la Protection des Données (RGPD, règlement UE
          2016/679) et à la loi « Informatique et Libertés » du 6 janvier 1978 modifiée, vous
          disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité
          et d'opposition au traitement de vos données personnelles.
        </p>
        <p style={{ marginTop: 12 }}>
          Pour exercer ces droits, vous pouvez adresser votre demande par courrier postal au siège
          de la ligue (Maison des Sports — 97400 Saint-Denis) en justifiant de votre identité.
        </p>
      </>
    ),
  },
  {
    index: '07',
    title: 'Cookies',
    content: (
      <>
        <p>
          Le site utilise uniquement des cookies techniques strictement nécessaires à son
          fonctionnement (session d'authentification pour l'espace clubs). Aucun cookie publicitaire
          ou de mesure d'audience tierce n'est déposé sur votre terminal.
        </p>
        <p style={{ marginTop: 12 }}>
          Conformément à l'article 82 de la loi « Informatique et Libertés », ces cookies ne
          nécessitent pas de consentement préalable.
        </p>
      </>
    ),
  },
  {
    index: '08',
    title: 'Crédits photo & illustrations',
    content: (
      <>
        <p>
          Les photographies des joueurs, équipes et événements sont fournies par les clubs
          affiliés et restent la propriété de leurs auteurs. Les logos de la ligue et de ses
          partenaires sont reproduits avec leur accord.
        </p>
        <p style={{ marginTop: 12 }}>
          Toute personne souhaitant signaler un usage non autorisé d'une image peut contacter la
          ligue qui procédera au retrait ou à la régularisation dans les meilleurs délais.
        </p>
      </>
    ),
  },
  {
    index: '09',
    title: 'Droit applicable',
    content: (
      <>
        <p>
          Le présent site et ses mentions légales sont soumis au droit français. Tout litige
          relatif à leur interprétation ou à leur exécution relève de la compétence exclusive des
          tribunaux français, sous réserve d'une attribution de compétence spécifique découlant
          d'un texte de loi ou réglementaire particulier.
        </p>
      </>
    ),
  },
];

function DefList({ items }: { items: [string, string][] }) {
  return (
    <dl
      style={{
        marginTop: 14,
        display: 'grid',
        gridTemplateColumns: 'minmax(140px, 200px) 1fr',
        gap: '8px 18px',
        ...body,
        fontSize: 13.5,
      }}
    >
      {items.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt
            style={{
              ...mono,
              fontSize: 10.5,
              fontWeight: 700,
              color: LRH.mute,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </dt>
          <dd
            style={{
              margin: 0,
              color: LRH.ink,
              fontWeight: 500,
            }}
          >
            {value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

function SectionBlock({ section, isMobile }: { section: Section; isMobile: boolean }) {
  return (
    <section
      id={`section-${section.index}`}
      style={{
        padding: isMobile ? '28px 0' : '36px 0',
        borderTop: '1px dashed ' + LRH.hairStrong,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            color: LRH.red,
            letterSpacing: '0.2em',
          }}
        >
          {section.index}
        </span>
        <h2
          style={{
            ...display,
            fontWeight: 700,
            fontSize: isMobile ? 22 : 28,
            color: LRH.navy,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {section.title}
        </h2>
      </div>
      <div
        style={{
          ...body,
          fontSize: isMobile ? 13.5 : 14,
          color: LRH.ink2,
          lineHeight: 1.7,
          maxWidth: 760,
        }}
      >
        {section.content}
      </div>
    </section>
  );
}

export function MentionsLegalesPageClient() {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>('gazon');
  const lastUpdated = new Date('2026-05-18').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? <HeaderMobile mode={mode} setMode={setMode} /> : <HeaderDesktop mode={mode} setMode={setMode} />}

      <PageHero
        mobileVariant={isMobile}
        index="00"
        kicker="Légal · Information"
        title={'Mentions\nlégales.'}
        subtitle="Informations relatives à l'éditeur, à l'hébergeur et à la conception du site officiel de la Ligue Réunionnaise de Hockey."
        tag={`Dernière mise à jour : ${lastUpdated}`}
      />

      <div
        style={{
          padding: isMobile ? '24px 16px 48px' : 'clamp(40px, 5vw, 64px) clamp(20px, 4.5vw, 64px) clamp(48px, 6vw, 80px)',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        {/* Sommaire (anchor rail) */}
        <nav
          aria-label="Sommaire"
          style={{
            padding: '14px 18px',
            background: '#fff',
            border: '1px solid ' + LRH.hair,
            borderLeft: `3px solid ${LRH.gold}`,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: 10,
              fontWeight: 700,
              color: LRH.mute,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            ▸ Sommaire
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SECTIONS.map((s) => (
              <a
                key={s.index}
                href={`#section-${s.index}`}
                style={{
                  ...mono,
                  fontSize: 11,
                  color: LRH.navy,
                  textDecoration: 'none',
                  letterSpacing: '0.06em',
                  padding: '5px 10px',
                  border: '1px solid ' + LRH.hairStrong,
                  background: LRH.paperWarm,
                }}
              >
                <span style={{ color: LRH.red, marginRight: 6, fontWeight: 700 }}>{s.index}</span>
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        {SECTIONS.map((section) => (
          <SectionBlock key={section.index} section={section} isMobile={isMobile} />
        ))}

        <div
          style={{
            marginTop: 32,
            padding: '14px 16px',
            background: LRH.paperWarm,
            border: '1px dashed ' + LRH.hairStrong,
            ...mono,
            fontSize: 11,
            color: LRH.mute,
            letterSpacing: '0.06em',
          }}
        >
          ◉ Pour signaler une erreur dans ces mentions, contactez la ligue —{' '}
          <Link href="/" style={{ color: LRH.navy, textDecoration: 'underline' }}>
            retour à l'accueil
          </Link>
          .
        </div>
      </div>

      {isMobile ? <MobileTabBar /> : <FooterDesktop />}
    </div>
  );
}
