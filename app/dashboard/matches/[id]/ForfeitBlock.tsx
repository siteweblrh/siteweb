'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, mono } from '@/components/lrh/tokens';
import { useConfirm } from '@/components/lrh/dashboard/useConfirm';
import { updateMatch } from '@/lib/actions/competition';
import { compactClubLabel } from '@/lib/utils/club-label';
import { errorMessage } from '@/lib/utils/error-message';
import { FORFEIT_GOALS, type ForfeitSide } from '@/lib/utils/forfeit';

type ClubRef = { name: string; shortCode: string | null } | null;

/**
 * Déclaration d'un forfait (admin uniquement).
 *
 * Choisir un camp impose côté serveur le score 10-0 et le statut FINISHED,
 * puis recalcule le classement : l'admin n'a rien d'autre à saisir. Retirer
 * le forfait ne touche pas au score — il reste à corriger à la main si le
 * match a finalement été joué.
 */
export function ForfeitBlock({
  match,
}: {
  match: {
    id: string;
    forfeit: ForfeitSide | null;
    homeClub: ClubRef;
    homeLabel?: string | null;
    awayClub: ClubRef;
    awayLabel?: string | null;
  };
}) {
  const router = useRouter();
  const [ask, confirmDialog] = useConfirm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const homeName = compactClubLabel(match.homeClub, match.homeLabel);
  const awayName = compactClubLabel(match.awayClub, match.awayLabel);
  const nameOf = (side: ForfeitSide) => (side === 'HOME' ? homeName : awayName);

  const apply = async (side: ForfeitSide | null) => {
    const ok = await ask(
      side
        ? {
            title: `Forfait ${nameOf(side)}`,
            message:
              `Le score devient ${side === 'HOME' ? `0-${FORFEIT_GOALS}` : `${FORFEIT_GOALS}-0`} ` +
              `et le match passe en « Terminé ». Le classement est recalculé.`,
            confirmLabel: 'Déclarer le forfait',
            danger: true,
          }
        : {
            title: 'Retirer le forfait',
            message: 'La mention « Forfait » disparaît. Le score actuel est conservé : corrigez-le si le match a été joué.',
            confirmLabel: 'Retirer la mention',
          },
    );
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await updateMatch(match.id, { forfeit: side });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e, "Erreur lors de l'enregistrement du forfait"));
    } finally {
      setSaving(false);
    }
  };

  const btn = (active: boolean): React.CSSProperties => ({
    ...mono,
    fontSize: 11,
    fontWeight: 700,
    minHeight: 44,
    padding: '10px 14px',
    background: active ? LRH.red : '#fff',
    color: active ? '#fff' : LRH.ink,
    border: '1px solid ' + (active ? LRH.red : LRH.hairStrong),
    cursor: saving ? 'wait' : 'pointer',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  });

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${match.forfeit ? LRH.red : LRH.hairStrong}`,
        padding: '14px 16px',
        marginBottom: 16,
      }}
    >
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
        Forfait
      </div>
      <div role="group" aria-label="Équipe déclarée forfait" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {(['HOME', 'AWAY'] as const).map((side) => (
          <button
            key={side}
            type="button"
            disabled={saving || match.forfeit === side}
            aria-pressed={match.forfeit === side}
            onClick={() => apply(side)}
            style={btn(match.forfeit === side)}
          >
            Forfait {nameOf(side)}
          </button>
        ))}
        {match.forfeit && (
          <button type="button" disabled={saving} onClick={() => apply(null)} style={btn(false)}>
            Retirer
          </button>
        )}
      </div>
      {error && (
        <div role="alert" style={{ ...body, fontSize: 12.5, color: LRH.red, marginTop: 8 }}>{error}</div>
      )}
      <div style={{ ...body, fontSize: 11.5, color: LRH.mute, marginTop: 8, lineHeight: 1.5 }}>
        Règlement FFH : match perdu {FORFEIT_GOALS}-0, sans retrait de point. Le match est affiché
        « Forfait » sur le site et n&apos;entre pas dans le classement des gardiens.
      </div>
      {confirmDialog}
    </div>
  );
}
