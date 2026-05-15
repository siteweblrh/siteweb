'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';

export function PageHero({
  index,
  kicker,
  title,
  subtitle,
  tag,
  rightSlot,
  mobileVariant = false,
}: {
  index?: string;
  kicker: string;
  title: string;
  subtitle?: string;
  tag?: string;
  rightSlot?: React.ReactNode;
  mobileVariant?: boolean;
}) {
  return (
    <div style={{
      position: 'relative',
      background: LRH.navy,
      color: '#fff',
      padding: mobileVariant ? '36px 16px 28px' : '72px 64px 56px',
      overflow: 'hidden',
      borderBottom: '4px solid ' + LRH.gold,
    }}>
      {/* Diagonal stripe texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(112deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 34px)',
        pointerEvents: 'none',
      }} />
      {/* Gold spotlight */}
      <div style={{
        position: 'absolute', top: '-30%', right: '-15%',
        width: 580, height: 580, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(243,188,28,0.18) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex',
        alignItems: mobileVariant ? 'flex-start' : 'flex-end',
        justifyContent: 'space-between',
        gap: mobileVariant ? 16 : 48,
        flexDirection: mobileVariant ? 'column' : 'row',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Kicker line with red dot + index */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            marginBottom: mobileVariant ? 18 : 22,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: LRH.red,
              boxShadow: '0 0 0 4px rgba(168,32,47,0.18)',
            }} />
            {index && (
              <span style={{
                ...mono, fontSize: mobileVariant ? 10 : 11,
                color: LRH.gold, fontWeight: 700,
                letterSpacing: '0.22em',
              }}>{index}</span>
            )}
            <span style={{
              ...mono, fontSize: mobileVariant ? 10 : 11,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>{kicker}</span>
          </div>

          {/* Title — large, can use \n for newline */}
          <h1 style={{
            ...display, fontWeight: 800,
            fontSize: mobileVariant ? 42 : 72,
            lineHeight: 0.95, margin: 0,
            letterSpacing: '-0.035em',
            color: '#fff',
            whiteSpace: 'pre-line',
            textShadow: '0 2px 30px rgba(0,0,0,0.25)',
          }}>{title}</h1>

          {subtitle && (
            <p style={{
              ...body, fontSize: mobileVariant ? 14 : 16,
              color: 'rgba(255,255,255,0.72)',
              marginTop: mobileVariant ? 16 : 22,
              lineHeight: 1.55,
              maxWidth: 540,
              margin: (mobileVariant ? 16 : 22) + 'px 0 0',
            }}>{subtitle}</p>
          )}

          {tag && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              marginTop: mobileVariant ? 18 : 24,
              padding: '6px 12px 6px 8px',
              borderRadius: 4,
              background: 'rgba(243,188,28,0.12)',
              border: '1px solid rgba(243,188,28,0.3)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: LRH.gold }} />
              <span style={{
                ...mono, fontSize: 10.5, fontWeight: 700,
                color: LRH.gold, letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}>{tag}</span>
            </div>
          )}
        </div>

        {rightSlot && (
          <div style={{ flexShrink: 0, alignSelf: mobileVariant ? 'stretch' : 'flex-end' }}>
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}
