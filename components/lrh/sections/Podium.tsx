'use client';

import React from 'react';
import { LRH, mono, display, body, ClubCrest } from '../tokens';

export type PodiumEntry = {
  rank: number;
  points: number;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  club: { id: string; slug: string; shortCode: string | null; name: string };
};

const STEP_HEIGHTS: Record<number, number> = { 1: 200, 2: 150, 3: 110 };
const STEP_ORDER = [2, 1, 3] as const;

export function Podium({ top3, mobileVariant = false }: { top3: PodiumEntry[]; mobileVariant?: boolean }) {
  const byRank = new Map<number, PodiumEntry>();
  for (const e of top3) byRank.set(e.rank, e);

  return (
    <div style={{
      position: 'relative',
      background: LRH.navyDeep, color: '#fff',
      padding: mobileVariant ? '40px 16px 32px' : 'clamp(38px, 4.80vw, 64px) clamp(20px, 4.5vw, 64px) clamp(29px, 3.60vw, 48px)',
      overflow: 'hidden',
    }}>
      {/* Stripe overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(95deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 36px)',
        pointerEvents: 'none',
      }} />
      {/* Gold spotlight */}
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 500, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(243,188,28,0.16) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          ...mono, fontSize: 11, fontWeight: 700,
          color: LRH.gold, letterSpacing: '0.22em',
          textTransform: 'uppercase', textAlign: 'center',
          marginBottom: mobileVariant ? 14 : 22,
        }}>
          ★ Le podium · Top 3
        </div>

        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          gap: mobileVariant ? 8 : 18,
          maxWidth: 980, margin: '0 auto',
        }}>
          {STEP_ORDER.map((rank) => {
            const entry = byRank.get(rank);
            const isCenter = rank === 1;
            const stepHeight = mobileVariant ? STEP_HEIGHTS[rank] * 0.6 : STEP_HEIGHTS[rank];
            const cardColor = isCenter ? LRH.gold : '#fff';
            const textColor = isCenter ? LRH.navy : LRH.navy;
            return (
              <div key={rank} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                maxWidth: mobileVariant ? 110 : 260,
              }}>
                {entry ? (
                  <>
                    {isCenter && (
                      <div style={{
                        ...mono, fontSize: 10, fontWeight: 800,
                        color: LRH.navy, background: LRH.gold,
                        letterSpacing: '0.16em', textTransform: 'uppercase',
                        padding: '4px 10px', borderRadius: 2,
                      }}>★ LEADER</div>
                    )}
                    <ClubCrest id={entry.club.shortCode ?? undefined} size={mobileVariant ? 52 : isCenter ? 88 : 72} slug={entry.club.slug} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        ...display, fontWeight: 700,
                        fontSize: mobileVariant ? 12 : isCenter ? 17 : 15,
                        color: '#fff', letterSpacing: '-0.01em',
                      }}>{entry.club.name}</div>
                      <div style={{
                        ...mono, fontSize: 9, color: 'rgba(255,255,255,0.5)',
                        letterSpacing: '0.1em', marginTop: 4,
                      }}>
                        {entry.played} J · {entry.goalsFor}/{entry.goalsAgainst}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ height: mobileVariant ? 80 : 130 }} />
                )}
                {/* Step */}
                <div style={{
                  width: '100%', height: stepHeight,
                  background: cardColor,
                  borderTopLeftRadius: 6, borderTopRightRadius: 6,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                  boxShadow: isCenter ? '0 -8px 30px rgba(243,188,28,0.35)' : 'inset 0 1px 0 rgba(0,0,0,0.05)',
                }}>
                  <div style={{
                    ...display, fontWeight: 800,
                    fontSize: mobileVariant ? 36 : isCenter ? 72 : 56,
                    color: textColor, letterSpacing: '-0.05em', lineHeight: 0.9,
                  }}>{rank}</div>
                  {entry && (
                    <div style={{ marginTop: 4, textAlign: 'center' }}>
                      <div style={{
                        ...display, fontWeight: 800,
                        fontSize: mobileVariant ? 14 : isCenter ? 22 : 18,
                        color: textColor, letterSpacing: '-0.02em',
                      }}>{entry.points} pts</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: mobileVariant ? 18 : 28, height: 1,
          background: 'rgba(255,255,255,0.1)',
          maxWidth: 980, marginLeft: 'auto', marginRight: 'auto',
        }} />
      </div>
    </div>
  );
}
