'use client';

import React from 'react';
import { LRH, mono, body, LrhLockup } from '../tokens';

const FOOTER_COLUMNS = [
  { t: 'Compétitions', l: ['D1 Gazon', 'D1 Salle', 'Coupe de la Réunion', 'Tournois U18', 'Féminines'] },
  { t: 'Pratiquer',    l: ['Trouver un club', 'Prendre une licence', 'Hockey scolaire', 'Para-hockey'] },
  { t: 'La Ligue',     l: ['Bureau', 'Commissions', 'Arbitrage', 'Documents officiels'] },
  { t: 'Partenaires',  l: ['Région Réunion', 'Crédit Peï', 'Run Market', 'Ouest TV'] },
];

const SOCIAL_LINKS = ['IG', 'FB', 'YT', 'TT'];

export function FooterDesktop() {
  return (
    <div style={{ background: LRH.navyDeep, color: 'rgba(255,255,255,0.7)', padding: '56px 64px 32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 40 }}>
        <div>
          <LrhLockup height={52} white variant="uni" />
          <p style={{ ...body, fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)', marginTop: 18, maxWidth: 280 }}>
            La ligue réunionnaise de hockey sur gazon et en salle à La Réunion. Affiliée à la FFH.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            {SOCIAL_LINKS.map((s) => (
              <div key={s} style={{
                width: 32, height: 32, borderRadius: 6,
                background: 'rgba(255,255,255,0.06)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
              }}>{s}</div>
            ))}
          </div>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.t}>
            <div style={{ ...mono, fontSize: 10, color: LRH.gold, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>
              {col.t}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.l.map((i) => <div key={i} style={{ ...body, fontSize: 13, fontWeight: 500 }}>{i}</div>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 48, paddingTop: 22, borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        ...mono, fontSize: 10.5, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)',
      }}>
        <div>© 2026 LIGUE RÉUNIONNAISE DE HOCKEY · SIRET 000 000 000</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <span>Mentions légales</span>
          <span>RGPD</span>
          <span>Plan du site</span>
        </div>
      </div>
    </div>
  );
}

export function MobileTabBar() {
  const tabs = [
    { l: 'Accueil', active: true },
    { l: 'Matchs' },
    { l: 'Clubs' },
    { l: 'Licence' },
    { l: 'Compte' },
  ];
  return (
    <div style={{
      position: 'sticky', bottom: 0, background: '#fff',
      borderTop: '1px solid ' + LRH.hair,
      padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
      display: 'flex', justifyContent: 'space-around',
    }}>
      {tabs.map((t) => (
        <div key={t.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: t.active ? LRH.navy : LRH.hair,
          }} />
          <div style={{
            ...mono, fontSize: 8.5, fontWeight: 700,
            color: t.active ? LRH.navy : LRH.mute,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{t.l}</div>
        </div>
      ))}
    </div>
  );
}
