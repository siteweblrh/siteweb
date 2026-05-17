'use client';

import React from 'react';
import { LRH, mono, body } from '../tokens';

export type FilterOption = { id: string; label: string; count?: number };

export function CompetitionFilter({
  options,
  active,
  onSelect,
  rightSlot,
  sticky = true,
  mobileVariant = false,
}: {
  options: FilterOption[];
  active: string;
  onSelect: (id: string) => void;
  rightSlot?: React.ReactNode;
  sticky?: boolean;
  mobileVariant?: boolean;
}) {
  return (
    <div style={{
      position: sticky ? 'sticky' : 'static',
      top: 0,
      zIndex: 5,
      background: LRH.paper,
      borderBottom: '1px solid ' + LRH.hair,
      padding: mobileVariant ? '14px 0' : 'clamp(11px, 1.35vw, 18px) clamp(20px, 4.5vw, 64px)',
      display: 'flex', alignItems: 'center', gap: 16,
      backdropFilter: 'saturate(140%) blur(8px)',
      WebkitBackdropFilter: 'saturate(140%) blur(8px)',
    }}>
      {!mobileVariant && (
        <span style={{
          ...mono, fontSize: 10, fontWeight: 700,
          color: LRH.mute, letterSpacing: '0.18em',
          textTransform: 'uppercase', flexShrink: 0,
        }}>
          ▸ Filtrer
        </span>
      )}
      <div style={{
        display: 'flex', gap: 8,
        overflowX: 'auto', flex: 1,
        padding: mobileVariant ? '0 16px' : 0,
        scrollbarWidth: 'none',
      }}>
        {options.map((opt) => {
          const isActive = opt.id === active;
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              style={{
                ...body, fontSize: 12.5, fontWeight: 700,
                padding: '8px 14px',
                borderRadius: 4,
                background: isActive ? LRH.navy : '#fff',
                color: isActive ? '#fff' : LRH.ink2,
                border: '1px solid ' + (isActive ? LRH.navy : LRH.hairStrong),
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              {opt.label}
              {opt.count != null && (
                <span style={{
                  ...mono, fontSize: 10, fontWeight: 700,
                  padding: '2px 6px', borderRadius: 2,
                  background: isActive ? 'rgba(255,255,255,0.18)' : LRH.paperWarm,
                  color: isActive ? 'rgba(255,255,255,0.85)' : LRH.mute,
                  letterSpacing: '0.04em',
                }}>{opt.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {rightSlot && (
        <div style={{ flexShrink: 0, paddingRight: mobileVariant ? 16 : 0 }}>
          {rightSlot}
        </div>
      )}
    </div>
  );
}
