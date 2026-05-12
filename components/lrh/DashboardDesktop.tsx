'use client';

import React from 'react';
import {
  LRH, mono, display, body, LrhLockup,
  ClubCrest, ImageSlot, CTAButton, Card, CardHeader
} from './tokens';

function DashSidebar({ active = 'actus' }: { active?: string }) {
  const items = [
    { id: 'overview', label: 'Tableau de bord', kbd: 'D' },
    { id: 'actus',    label: 'Actualités',      kbd: 'A', count: 3 },
    { id: 'matches',  label: 'Matchs & feuilles', kbd: 'M' },
    { id: 'licen',    label: 'Licenciés',       kbd: 'L', count: 87 },
    { id: 'team',     label: 'Effectif',        kbd: 'E' },
    { id: 'docs',     label: 'Documents',       kbd: 'O' },
    { id: 'sponsors', label: 'Partenaires',     kbd: 'P' },
    { id: 'billing',  label: 'Trésorerie',      kbd: 'T' },
  ];
  return (
    <div style={{
      width: 252, background: LRH.navy, color: '#fff',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ padding: '22px 22px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={'/lrh-website/assets/icone-lrh.svg'} alt="" style={{ height: 32, width: 'auto' }} />
          <div style={{ ...display, lineHeight: 1.05 }}>
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.01em' }}>Portail Clubs</div>
            <div style={{ ...mono, fontSize: 9.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginTop: 3 }}>LRH · v 2.4</div>
          </div>
        </div>
        <div style={{
          marginTop: 18, padding: 12, borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <ClubCrest id="USPG" size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...display, fontWeight: 700, fontSize: 13 }}>USPG Le Port</div>
            <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginTop: 2 }}>ID · 974-USPG-1984</div>
          </div>
          <span style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>⌄</span>
        </div>
      </div>

      <div style={{ padding: '18px 14px', flex: 1, overflowY: 'auto' }}>
        <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '0 8px 8px' }}>
          Gestion du club
        </div>
        {items.map((it) => {
          const isActive = it.id === active;
          return (
            <div key={it.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 10px', borderRadius: 8,
              background: isActive ? LRH.red : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.78)',
              ...body, fontSize: 12.5, fontWeight: isActive ? 700 : 500,
              cursor: 'pointer', marginBottom: 2,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                flexShrink: 0,
              }} />
              <span dangerouslySetInnerHTML={{ __html: it.label }} style={{ flex: 1 }} />
              {it.count != null && (
                <span style={{
                  ...mono, fontSize: 9, letterSpacing: '0.04em',
                  background: isActive ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.08)',
                  padding: '2px 7px', borderRadius: 999, fontWeight: 700,
                }}>{it.count}</span>
              )}
              <span style={{ ...mono, fontSize: 9, color: isActive ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>⌥{it.kbd}</span>
            </div>
          );
        })}

        <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '24px 8px 8px' }}>
          Compétitions
        </div>
        {['Calendrier officiel', 'Classements', 'Coupe de la Réunion'].map((l) => (
          <div key={l} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '9px 10px', borderRadius: 8,
            color: 'rgba(255,255,255,0.78)',
            ...body, fontSize: 12.5, fontWeight: 500,
            cursor: 'pointer', marginBottom: 2,
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
            {l}
          </div>
        ))}
      </div>

      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          padding: 12, borderRadius: 10,
          background: 'linear-gradient(135deg, ' + LRH.gold + ' 0%, #E0A810 100%)',
          color: LRH.navy,
        }}>
          <div style={{ ...mono, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>★ Pro</div>
          <div style={{ ...display, fontWeight: 700, fontSize: 12.5, marginTop: 4, lineHeight: 1.25 }}>
            Passez au niveau supérieur
          </div>
        </div>
      </div>
    </div>
  );
}

function DashHeader({ title }: { title: string }) {
  return (
    <div style={{
      padding: '16px 32px', borderBottom: '1px solid ' + LRH.hair,
      background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <h1 style={{ ...display, fontWeight: 700, fontSize: 20, color: LRH.navy, margin: 0 }}>{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{
          padding: '8px 14px', borderRadius: 8, background: LRH.paperWarm,
          ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.04em',
          cursor: 'pointer',
        }}>
          Rechercher (⌘K)
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: LRH.hair }} />
      </div>
    </div>
  );
}

export function HomeDashboardDesktop() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <DashSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <DashHeader title="Actualités du Club" />
        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            <div>
              <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                Communication
              </div>
              <h2 style={{ ...display, fontWeight: 700, fontSize: 32, color: LRH.navy, margin: 0 }}>Gérer vos actualités.</h2>
            </div>
            <CTAButton variant="red">Nouvel article</CTAButton>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            {[
              { t: 'Stage de Pâques 2026', d: 'Publié il y a 2 jours', s: 'En ligne', tag: 'Évènement' },
              { t: 'Compte-rendu match USPG-SDHC', d: 'Publié hier', s: 'Brouillon', tag: 'Match' },
              { t: 'Nouveaux maillots D1', d: 'En attente', s: 'Privé', tag: 'Club' },
            ].map((it, i) => (
              <Card key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{
                    padding: '4px 8px', borderRadius: 4, background: LRH.paperWarm,
                    ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.06em',
                  }}>{it.tag}</div>
                  <div style={{ ...mono, fontSize: 10, color: it.s === 'En ligne' ? '#10b981' : LRH.mute }}>{it.s}</div>
                </div>
                <h3 style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy, margin: '0 0 8px' }}>{it.t}</h3>
                <p style={{ ...body, fontSize: 13, color: LRH.mute }}>{it.d}</p>
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid ' + LRH.hair, display: 'flex', gap: 12 }}>
                  <span style={{ ...body, fontSize: 12.5, fontWeight: 600, color: LRH.navy }}>Modifier</span>
                  <span style={{ ...body, fontSize: 12.5, fontWeight: 600, color: LRH.mute }}>Statistiques</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
