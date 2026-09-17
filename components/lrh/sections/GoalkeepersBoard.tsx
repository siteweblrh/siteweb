'use client';

import React from 'react';
import { LRH, body, display, mono, ClubCrest } from '../tokens';
import type { GoalkeeperStat } from '@/lib/queries/goalkeepers';

/**
 * Classement des gardiens : moyenne de buts encaissés, matchs sans encaisser.
 *
 * Le tri se fait sur la MOYENNE, pas sur le total encaissé : un gardien qui a
 * joué deux matchs de plus prendrait mécaniquement plus de buts, et un total
 * brut récompenserait celui qui a le moins joué. La colonne « matchs » reste
 * affichée pour que le lecteur juge lui-même de la représentativité.
 *
 * Un match dont le gardien n'a pas été saisi n'entre pas dans le calcul — le
 * pied de tableau le dit, plutôt que de laisser croire à un total complet.
 */
export function GoalkeepersBoard({
  keepers,
  context,
  mobileVariant = false,
}: {
  keepers: GoalkeeperStat[];
  /** Texte de contexte (ex. « Championnat de la Réunion Salle · 2026-2027 »). */
  context?: string;
  mobileVariant?: boolean;
}) {
  if (keepers.length === 0) {
    return (
      <div style={{
        padding: mobileVariant ? '36px 16px' : 'clamp(32px, 4vw, 48px)',
        textAlign: 'center',
        background: LRH.paperWarm,
      }}>
        <div style={{
          ...mono, fontSize: 11, color: LRH.mute,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>[ à venir ]</div>
        <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10, maxWidth: 560, marginInline: 'auto', lineHeight: 1.6 }}>
          Le classement apparaîtra dès que les gardiens seront renseignés sur les
          feuilles de match.
        </div>
      </div>
    );
  }

  return (
    <div>
      {context && (
        <div style={{
          ...mono, fontSize: 10, color: LRH.mute,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          padding: mobileVariant ? '0 16px 10px' : '0 0 10px',
        }}>{context}</div>
      )}

      <div style={{ background: '#fff', border: '1px solid ' + LRH.hair }}>
        {/* En-têtes : masqués en mobile, la ligne se lit alors d'elle-même. */}
        {!mobileVariant && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 70px 70px 90px',
            gap: 12, alignItems: 'center',
            padding: '10px 16px',
            borderBottom: '1px solid ' + LRH.hairStrong,
            ...mono, fontSize: 9.5, fontWeight: 700,
            color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            <span>#</span>
            <span>Gardien</span>
            <span style={{ textAlign: 'center' }}>Matchs</span>
            <span style={{ textAlign: 'center' }}>Encaissés</span>
            <span style={{ textAlign: 'center' }}>Moyenne</span>
          </div>
        )}

        {keepers.map((k, i) => {
          const rank = i + 1;
          const leader = rank === 1;
          return (
            <div
              key={k.keeper.id}
              style={{
                display: 'grid',
                gridTemplateColumns: mobileVariant ? '36px 1fr auto' : '48px 1fr 70px 70px 90px',
                gap: mobileVariant ? 10 : 12,
                alignItems: 'center',
                padding: mobileVariant ? '12px 16px' : '12px 16px',
                borderBottom: i === keepers.length - 1 ? 'none' : '1px solid ' + LRH.hair,
                borderLeft: `3px solid ${leader ? LRH.gold : 'transparent'}`,
              }}
            >
              <span style={{
                ...display, fontWeight: 800,
                fontSize: mobileVariant ? 15 : 17,
                color: leader ? LRH.navy : LRH.mute,
                letterSpacing: '-0.02em',
              }}>{String(rank).padStart(2, '0')}</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <ClubCrest id={k.keeper.club?.shortCode ?? undefined} size={mobileVariant ? 24 : 28} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    ...body, fontSize: mobileVariant ? 13.5 : 14.5,
                    fontWeight: 700, color: LRH.navy, lineHeight: 1.25,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {k.keeper.jerseyNumber != null && (
                      <span style={{ ...mono, color: LRH.mute, marginRight: 6 }}>#{k.keeper.jerseyNumber}</span>
                    )}
                    {k.keeper.firstName} {k.keeper.lastName}
                  </div>
                  <div style={{ ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                    {k.keeper.club?.shortCode ?? k.keeper.club?.name}
                    {k.cleanSheets > 0 && (
                      <span style={{ color: '#1d6b3f', marginLeft: 8 }}>
                        {k.cleanSheets} sans encaisser
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {mobileVariant ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...display, fontWeight: 800, fontSize: 18, color: LRH.navy, letterSpacing: '-0.02em' }}>
                    {k.average.toFixed(1)}
                  </div>
                  <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.1em' }}>
                    {k.conceded} en {k.played}J
                  </div>
                </div>
              ) : (
                <>
                  <span style={{ ...mono, fontSize: 13, color: LRH.ink2, textAlign: 'center' }}>{k.played}</span>
                  <span style={{ ...mono, fontSize: 13, color: LRH.ink2, textAlign: 'center' }}>{k.conceded}</span>
                  <span style={{
                    ...display, fontWeight: 800, fontSize: 18,
                    color: LRH.navy, textAlign: 'center', letterSpacing: '-0.02em',
                  }}>{k.average.toFixed(1)}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        ...body, fontSize: 11.5, color: LRH.mute,
        marginTop: 10, lineHeight: 1.5,
        padding: mobileVariant ? '0 16px' : 0,
      }}>
        Moyenne de buts encaissés par match. Seuls les matchs dont le gardien a
        été renseigné sur la feuille sont comptés.
      </div>
    </div>
  );
}
