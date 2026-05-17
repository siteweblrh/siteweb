'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';

export type StatCell = {
  kicker: string;
  value: string | number;
  unit?: string;
  hint?: string;
  accent?: 'navy' | 'gold' | 'red';
};

export function StatsRibbon({ cells, mobileVariant = false }: { cells: StatCell[]; mobileVariant?: boolean }) {
  return (
    <div style={{
      background: '#fff',
      borderBottom: '1px solid ' + LRH.hair,
      padding: mobileVariant ? '18px 16px' : 'clamp(14px, 1.80vw, 24px) clamp(20px, 4.5vw, 64px)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobileVariant ? '1fr 1fr' : `repeat(${cells.length}, 1fr)`,
        gap: mobileVariant ? 16 : 0,
      }}>
        {cells.map((cell, i) => (
          <div key={cell.kicker} style={{
            position: 'relative',
            padding: mobileVariant ? '0' : '0 24px',
            borderLeft: !mobileVariant && i !== 0 ? '1px solid ' + LRH.hair : undefined,
          }}>
            {/* Tiny accent square */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 10,
            }}>
              <div style={{
                width: 6, height: 6,
                background: cell.accent === 'gold' ? LRH.gold
                  : cell.accent === 'red' ? LRH.red
                  : LRH.navy,
              }} />
              <div style={{
                ...mono, fontSize: 9.5, fontWeight: 700,
                color: LRH.mute, letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}>{cell.kicker}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{
                ...display, fontWeight: 800,
                fontSize: mobileVariant ? 32 : 38,
                color: LRH.navy, letterSpacing: '-0.035em',
                lineHeight: 1,
              }}>{cell.value}</span>
              {cell.unit && (
                <span style={{
                  ...mono, fontSize: 11, fontWeight: 600,
                  color: LRH.mute, letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>{cell.unit}</span>
              )}
            </div>
            {cell.hint && (
              <div style={{
                ...body, fontSize: 12, color: LRH.mute,
                marginTop: 6, fontWeight: 500,
              }}>{cell.hint}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
