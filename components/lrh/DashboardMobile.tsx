'use client';

import React from 'react';
import {
  LRH, mono, display, body, LrhLockup,
  ClubCrest, ImageSlot
} from './tokens';

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 8,
  padding: '10px 16px',
  ...body,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  textTransform: 'uppercase',
};

const btnPrimary: React.CSSProperties = {
  background: LRH.navy,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 16px',
  ...body,
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  textTransform: 'uppercase',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
      {children}
    </div>
  );
}

function SettingRow({ label, value, badge }: { label: string, value: string, badge?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid ' + LRH.hair }}>
      <div style={{ ...body, fontSize: 13, color: LRH.mute }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {badge && <div style={{ padding: '2px 6px', borderRadius: 4, background: LRH.gold, ...mono, fontSize: 9, color: LRH.navy, fontWeight: 800, textTransform: 'uppercase' }}>{badge}</div>}
        <div style={{ ...display, fontWeight: 600, fontSize: 13, color: LRH.navy }}>{value}</div>
      </div>
    </div>
  );
}

function DashMobileTopbar() {
  return (
    <div style={{ background: LRH.navy, color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', ...display, fontWeight: 800, fontSize: 14 }}>≡</div>
        <div>
          <div style={{ ...display, fontWeight: 700, fontSize: 13, lineHeight: 1 }}>Portail Clubs</div>
          <div style={{ ...mono, fontSize: 8.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', marginTop: 3 }}>USPG&nbsp;LE&nbsp;PORT · 974</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(255,255,255,0.08)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, background: LRH.gold, borderRadius: '50%' }} />
        </div>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: LRH.gold, color: LRH.navy, ...display, fontWeight: 800, fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>NH</div>
      </div>
    </div>
  );
}

function DashMobileHeader() {
  return (
    <div style={{ padding: '22px 16px 18px', background: '#fff', borderBottom: '1px solid ' + LRH.hair }}>
      <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
        ● Communication
      </div>
      <h1 style={{ ...display, fontWeight: 700, fontSize: 28, color: LRH.navy, margin: 0, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
        Publier une actualité
      </h1>
      <p style={{ ...body, fontSize: 12.5, color: LRH.mute, margin: '8px 0 0', lineHeight: 1.5 }}>
        Apparaît sur lrh.re, l'app mobile et la page club après validation LRH (24h).
      </p>
    </div>
  );
}

function DashMobileStats() {
  const stats = [
    { l: 'Licenciés', v: '87', d: '+4' },
    { l: 'V / N / D', v: '8-2-3', d: '61%' },
    { l: 'Buts',     v: '34', d: '+12' },
    { l: 'Match',    v: '13/18', d: '72%' },
  ];
  return (
    <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          padding: 14, borderRadius: 12, background: '#fff', border: '1px solid ' + LRH.hair,
        }}>
          <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>{s.l}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
            <div style={{ ...display, fontWeight: 800, fontSize: 24, color: LRH.navy, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.v}</div>
            <div style={{ ...mono, fontSize: 9.5, color: '#1F8A5B', fontWeight: 700, letterSpacing: '0.04em' }}>{s.d}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DashMobileForm() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid ' + LRH.hair, overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + LRH.hair, display: 'flex', gap: 6, overflowX: 'auto' }}>
          {['Brève', 'Article', 'Reportage', 'Communiqué'].map((t, i) => (
            <div key={t} style={{
              padding: '6px 11px', borderRadius: 5, flexShrink: 0,
              background: i === 1 ? LRH.navy : 'transparent',
              color: i === 1 ? '#fff' : LRH.ink2,
              ...body, fontSize: 11, fontWeight: 700,
            }}>{t}</div>
          ))}
        </div>
        <div style={{ padding: 18 }}>
          <FormLabel>Titre</FormLabel>
          <div style={{
            ...display, fontWeight: 700, fontSize: 20, color: LRH.navy,
            letterSpacing: '-0.02em', lineHeight: 1.2,
            padding: '8px 0', borderBottom: '2px solid ' + LRH.navy, marginTop: 6,
          }}>
            HC Port s'impose 4-3 face à Saint-Denis
          </div>

          <div style={{ marginTop: 18 }}>
            <FormLabel>Chapô</FormLabel>
            <div style={{
              ...body, fontSize: 12.5, color: LRH.ink, lineHeight: 1.5,
              padding: '10px 12px', borderRadius: 8,
              border: '1px solid ' + LRH.hairStrong, marginTop: 6,
            }}>
              Match Choc de la J14 — HC Port renverse Saint-Denis grâce à un doublé de Maël Hoarau.
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <FormLabel>Image de couverture</FormLabel>
            <div style={{
              marginTop: 6, height: 130, borderRadius: 10,
              border: '1.5px dashed ' + LRH.hairStrong,
              background: LRH.paperWarm,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...display, fontWeight: 800, fontSize: 18, color: LRH.navy }}>↑</div>
              <div style={{ ...body, fontSize: 12, fontWeight: 600, color: LRH.navy }}>Ajouter une image</div>
              <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.06em' }}>JPG / PNG · 1920×1080</div>
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SettingRow label="Catégorie" value="Match · D1 Gazon" />
            <SettingRow label="Sponsor" value="Run Market" badge="natif" />
            <SettingRow label="Visibilité" value="Public" />
          </div>
        </div>
        <div style={{ padding: '12px 14px', background: LRH.paper, borderTop: '1px solid ' + LRH.hair, display: 'flex', gap: 8 }}>
          <button style={{ ...btnGhost, flex: 1, padding: '11px 0' }}>Brouillon</button>
          <button style={{ ...btnPrimary, flex: 2, padding: '11px 0', justifyContent: 'center' }}>Soumettre <span style={{ ...mono, fontSize: 11 }}>↵</span></button>
        </div>
      </div>
    </div>
  );
}

function DashMobileNextMatch() {
  return (
    <div style={{ padding: '0 16px 18px' }}>
      <div style={{
        background: LRH.navy, color: '#fff', borderRadius: 14, padding: 18,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ ...mono, fontSize: 10, color: LRH.gold, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
          Prochain match · J14
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClubCrest id="USPG" size={36} />
            <div style={{ ...display, fontWeight: 700, fontSize: 12 }}>USPG Le Port</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...display, fontWeight: 800, fontSize: 18, color: LRH.gold, letterSpacing: '-0.02em', lineHeight: 1 }}>SAM 21 · 15:00</div>
            <div style={{ ...mono, fontSize: 10, marginTop: 4, opacity: 0.6, letterSpacing: '0.08em' }}>Stade Manès · LE PORT</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse' }}>
            <ClubCrest id="SDHC" size={36} />
            <div style={{ ...display, fontWeight: 700, fontSize: 12 }}>Saint-Denis</div>
          </div>
        </div>
        <button style={{
          marginTop: 14, width: '100%', ...body, fontWeight: 700, fontSize: 11.5, color: LRH.navy,
          background: LRH.gold, border: 'none', borderRadius: 8, padding: '10px 0',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Préparer la feuille de match</button>
      </div>
    </div>
  );
}

function DashMobileRecent() {
  const recent = [
    { state: 'En ligne',   color: '#1F8A5B', t: 'USPG renforce son staff avec Lila T.', when: '2j', views: '1 240' },
    { state: 'Validation', color: LRH.gold,  t: 'Tournoi U12 : un week-end record',         when: '4j', views: '—' },
    { state: 'Brouillon',  color: LRH.mute,  t: 'Stage de pré-saison à Saint-Leu',          when: '6j', views: '—' },
  ];
  return (
    <div style={{ padding: '0 16px 18px' }}>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid ' + LRH.hair, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...display, fontWeight: 700, fontSize: 14, color: LRH.navy }}>Publications récentes</div>
          <span style={{ ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.06em' }}>3 / 12</span>
        </div>
        <div>
          {recent.map((r, i) => (
            <div key={i} style={{
              padding: '12px 0', borderTop: i === 0 ? '1px solid ' + LRH.hair : '1px solid ' + LRH.hair,
              borderTopWidth: i === 0 ? 0 : 1, marginTop: i === 0 ? 12 : 0,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color, marginTop: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ ...mono, fontSize: 8.5, color: r.color, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>{r.state}</div>
                <div style={{ ...body, fontSize: 12.5, fontWeight: 600, color: LRH.navy, marginTop: 3, lineHeight: 1.3 }}>{r.t}</div>
                <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.06em', marginTop: 4, display: 'flex', gap: 10 }}>
                  <span>{r.when}</span>
                  <span>👁 {r.views}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashMobileTabBar() {
  const tabs = [
    { l: 'Bord',    active: false },
    { l: 'Actus',   active: true },
    { l: 'Matchs',  active: false },
    { l: 'Joueurs', active: false },
    { l: 'Plus',    active: false },
  ];
  return (
    <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid ' + LRH.hair, padding: '10px 0 calc(10px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'space-around' }}>
      {tabs.map((t) => (
        <div key={t.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: t.active ? LRH.navy : LRH.hair }} />
          <div style={{ ...mono, fontSize: 8.5, fontWeight: 700, color: t.active ? LRH.navy : LRH.mute, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t.l}</div>
        </div>
      ))}
    </div>
  );
}

export function DashboardMobile() {
  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      <DashMobileTopbar />
      <DashMobileHeader />
      <DashMobileStats />
      <DashMobileNextMatch />
      <div style={{ padding: '0 16px 0' }}>
        <div style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy, letterSpacing: '-0.02em', marginBottom: 10, marginTop: 14 }}>
          Nouvelle publication
        </div>
      </div>
      <DashMobileForm />
      <DashMobileRecent />
      <DashMobileTabBar />
    </div>
  );
}
