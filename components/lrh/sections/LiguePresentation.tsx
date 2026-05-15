'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';

export type LigueStat = { label: string; value: string | number; unit?: string };

export function LiguePresentation({
  intro,
  stats,
  mobileVariant = false,
}: {
  intro?: string;
  stats: LigueStat[];
  mobileVariant?: boolean;
}) {
  return (
    <div id="presentation" style={{
      background: LRH.paper,
      padding: mobileVariant ? '40px 16px 32px' : '72px 64px 56px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobileVariant ? '1fr' : '1.2fr 1fr',
        gap: mobileVariant ? 28 : 56,
        alignItems: 'flex-start',
      }}>
        {/* Left — narrative */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ width: 28, height: 2, background: LRH.red }} />
            <span style={{
              ...mono, fontSize: 10.5, fontWeight: 700,
              color: LRH.red, letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}>La Ligue · Mission</span>
          </div>
          <h2 style={{
            ...display, fontWeight: 700,
            fontSize: mobileVariant ? 30 : 44,
            color: LRH.navy, margin: 0,
            letterSpacing: '-0.035em', lineHeight: 1.05,
          }}>
            Fédérer, développer, faire rayonner<br/>le hockey sur l'île.
          </h2>
          <p style={{
            ...body, fontSize: mobileVariant ? 14 : 15.5,
            color: LRH.ink2, marginTop: 22, lineHeight: 1.65,
            maxWidth: 580,
          }}>
            {intro || `La Ligue Réunionnaise de Hockey (LRH) regroupe les clubs réunionnais pratiquant le hockey sur gazon et en salle. Affiliée à la Fédération Française de Hockey, elle organise les compétitions officielles, l'arbitrage, la formation des cadres et la détection des talents — du Port à Saint-Pierre, de Saint-Denis au Tampon.`}
          </p>
          <div style={{
            marginTop: 26, display: 'flex', flexWrap: 'wrap', gap: 8,
          }}>
            {['Gazon', 'Salle', 'Compétitions officielles', 'Arbitrage', 'Formation', 'Développement'].map((t) => (
              <span key={t} style={{
                ...mono, fontSize: 10, fontWeight: 700,
                padding: '6px 10px', borderRadius: 2,
                background: '#fff', color: LRH.ink2,
                border: '1px solid ' + LRH.hairStrong,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Right — key stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1,
          background: LRH.hair,
          border: '1px solid ' + LRH.hair,
        }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{
              padding: mobileVariant ? '20px 18px' : '26px 24px',
              background: '#fff',
              position: 'relative',
            }}>
              {/* Tiny corner accent */}
              <div style={{
                position: 'absolute', top: 0, left: 0,
                width: 18, height: 2, background: i === 0 ? LRH.gold : LRH.navy,
              }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{
                  ...display, fontWeight: 800,
                  fontSize: mobileVariant ? 32 : 42,
                  color: LRH.navy, letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}>{s.value}</span>
                {s.unit && (
                  <span style={{
                    ...mono, fontSize: 11, fontWeight: 700,
                    color: LRH.mute, letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}>{s.unit}</span>
                )}
              </div>
              <div style={{
                ...mono, fontSize: 10, color: LRH.mute,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                marginTop: 10, fontWeight: 600,
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
