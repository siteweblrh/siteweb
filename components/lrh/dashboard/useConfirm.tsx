'use client';

import React, { useCallback, useRef, useState } from 'react';
import { LRH, body, mono } from '@/components/lrh/tokens';
import { FormDialog } from './FormDialog';

/**
 * Remplacement de `window.confirm()` bâti sur `FormDialog`.
 *
 * Trois raisons de s'en défaire :
 *
 * 1. **Une boîte native bloque tout le navigateur** — y compris l'extension de
 *    pilotage. Aucun test de bout en bout n'est possible sur un écran qui en
 *    contient, ce qui est précisément le cas des écrans de planification.
 * 2. **Elle ne sait afficher que du texte brut.** Les messages du calendrier
 *    portent des listes et des conséquences (« 8 créneaux seront libérés ») que
 *    des `\n` rendent mal.
 * 3. Elle ignore la charte, et son bouton de confirmation ne peut pas être
 *    marqué comme destructeur.
 *
 * L'API garde la forme d'un `confirm()` pour que la conversion soit mécanique —
 * `if (!confirm(x)) return;` devient `if (!(await ask({ message: x }))) return;` —
 * la seule différence étant le `await`, qui impose des gestionnaires `async`.
 *
 * Usage :
 *
 * ```tsx
 * const [ask, confirmDialog] = useConfirm();
 * // …
 * const onDelete = async () => {
 *   if (!(await ask({ title: 'Supprimer ?', danger: true }))) return;
 *   await deleteThing();
 * };
 * return <>{confirmDialog}<button onClick={onDelete}>…</button></>;
 * ```
 */
export type ConfirmOptions = {
  title: string;
  /** Corps du message. Les retours à la ligne sont préservés. */
  message?: string;
  /** Libellé du bouton de confirmation. Décrire l'ACTE, pas « OK ». */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Rouge sur le bouton de confirmation : l'action détruit quelque chose. */
  danger?: boolean;
};

type Pending = { options: ConfirmOptions; resolve: (ok: boolean) => void };

export function useConfirm(): [(o: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [pending, setPending] = useState<Pending | null>(null);
  // Garde la promesse en cours pour pouvoir la résoudre depuis n'importe quel
  // chemin de fermeture (bouton, Échap, clic sur le fond) sans jamais la
  // laisser en suspens — une promesse non résolue gèlerait l'appelant.
  const pendingRef = useRef<Pending | null>(null);

  const settle = useCallback((ok: boolean) => {
    pendingRef.current?.resolve(ok);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const ask = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // Une demande qui en écrase une autre annule la précédente plutôt que de
      // la laisser pendante.
      pendingRef.current?.resolve(false);
      const next = { options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const o = pending?.options;

  const dialog = (
    <FormDialog
      open={pending != null}
      onClose={() => settle(false)}
      size="compact"
      title={o?.title ?? ''}
      footer={
        <>
          <button
            onClick={() => settle(false)}
            style={{
              ...body, fontSize: 12.5, fontWeight: 700,
              padding: '10px 18px', borderRadius: 4,
              background: 'transparent', color: LRH.mute,
              border: '1px solid ' + LRH.hairStrong, cursor: 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            {o?.cancelLabel ?? 'Annuler'}
          </button>
          <button
            onClick={() => settle(true)}
            style={{
              ...body, fontSize: 12.5, fontWeight: 700,
              padding: '10px 18px', borderRadius: 4,
              background: o?.danger ? LRH.red : LRH.navy, color: '#fff',
              border: 'none', cursor: 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            {o?.confirmLabel ?? 'Confirmer'}
          </button>
        </>
      }
    >
      {o?.message ? (
        // `pre-line` : les messages existants sont écrits avec des `\n`, on les
        // reprend tels quels plutôt que de les réécrire en JSX.
        <div style={{ ...body, fontSize: 13.5, color: LRH.ink, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
          {o.message}
        </div>
      ) : (
        <div style={{ ...mono, fontSize: 12, color: LRH.mute }}>
          Cette action est à confirmer.
        </div>
      )}
    </FormDialog>
  );

  return [ask, dialog];
}
