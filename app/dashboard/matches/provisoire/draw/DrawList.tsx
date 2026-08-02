'use client';

// Liste des affiches tirées, groupées par journée, avec épinglage et
// dépublication. Séparée de la ligne compétition : c'est un autre niveau de
// détail, et elle ne s'affiche qu'à la demande.

import { useConfirm } from '@/components/lrh/dashboard/useConfirm';
import React, { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, mono, body } from '@/components/lrh/tokens';
import { setDraftSlotPinned } from '@/lib/actions/draftDraw';
import { revertConvertedSlot } from '@/lib/actions/draftCalendar';
import { type DrawPanelSlot, type DrawPanelClub } from './types';

export function DrawList({
  slots,
  clubs,
  disabled,
  onError,
}: {
  slots: DrawPanelSlot[];
  clubs: DrawPanelClub[];
  disabled: boolean;
  onError: (text: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const clubLabel = useMemo(() => {
    const m = new Map(clubs.map((c) => [c.id, c.shortCode || c.name]));
    return (id: string | null | undefined) => (id ? m.get(id) ?? '?' : '?');
  }, [clubs]);

  const byMatchday = useMemo(() => {
    const m = new Map<number, DrawPanelSlot[]>();
    for (const s of slots) {
      if (!s.plannedHomeClubId || !s.plannedAwayClubId) continue;
      m.set(s.matchday, [...(m.get(s.matchday) ?? []), s]);
    }
    return [...m.entries()]
      .map(([matchday, list]) => ({
        matchday,
        date: list[0].date,
        list: [...list].sort((a, b) => a.slotIndex - b.slotIndex),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [slots]);

  const [ask, confirmDialog] = useConfirm();

  const unpublish = async (slot: DrawPanelSlot, affiche: string) => {
    const ok = await ask({
      title: `Dépublier ${affiche} ?`,
      message:
        'Le match est supprimé du site et le créneau redevient modifiable. '
        + "Aucun résultat n'est perdu : l'opération est refusée si un score a été saisi.",
      confirmLabel: 'Dépublier', danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await revertConvertedSlot(slot.id);
        router.refresh();
      } catch (e: unknown) {
        onError(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  const togglePin = (slot: DrawPanelSlot) => {
    startTransition(async () => {
      try {
        await setDraftSlotPinned(slot.id, !slot.isPinned);
        router.refresh();
      } catch (e: unknown) {
        onError(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  return (
    <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
      {confirmDialog}
      {byMatchday.map(({ matchday, date, list }) => (
        <div key={matchday}>
          <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
            J{matchday} · {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </div>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
            {list.map((s) => {
              const converted = Boolean(s.convertedMatchId);
              const affiche = `${clubLabel(s.plannedHomeClubId)} – ${clubLabel(s.plannedAwayClubId)}`;
              return (
                <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...body, fontSize: 13, color: LRH.ink, flex: 1, minWidth: 0 }}>
                    {affiche}
                    {converted && (
                      <span style={{ ...mono, fontSize: 9, color: '#1d6b3f', marginLeft: 8, letterSpacing: '0.1em' }}>
                        CONVERTI
                      </span>
                    )}
                  </span>

                  {converted ? (
                    // Rien n'est definitif tant qu'aucun score n'est saisi :
                    // depublier supprime le match et rend le creneau au tirage.
                    // L'action serveur refuse si un resultat existe.
                    <button
                      type="button"
                      onClick={() => unpublish(s, affiche)}
                      disabled={disabled || isPending}
                      aria-label={`Dépublier ${affiche} — le match est supprimé et le créneau redevient modifiable`}
                      title="Supprime le match et rend le créneau au tirage"
                      style={{
                        ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', minHeight: 44, padding: '0 12px',
                        border: `1px solid ${LRH.hairStrong}`, background: 'transparent',
                        color: LRH.red, flexShrink: 0,
                        cursor: disabled || isPending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Dépublier
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => togglePin(s)}
                      disabled={disabled || isPending}
                      aria-pressed={Boolean(s.isPinned)}
                      aria-label={
                        s.isPinned
                          ? `Désépingler ${affiche} — l'affiche pourra changer au prochain tirage`
                          : `Épingler ${affiche} — l'affiche restera à cette place aux prochains tirages`
                      }
                      title={s.isPinned ? 'Épinglée : les prochains tirages la conserveront' : 'Épingler cette affiche'}
                      style={{
                        ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', minHeight: 44, padding: '0 12px',
                        border: `1px solid ${s.isPinned ? LRH.gold : LRH.hairStrong}`,
                        background: s.isPinned ? LRH.gold : 'transparent',
                        color: s.isPinned ? LRH.navy : LRH.mute,
                        cursor: disabled || isPending ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <span aria-hidden="true">📌</span> {s.isPinned ? 'Épinglée' : 'Épingler'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

