'use client';

import React, { useEffect, useId, useRef } from 'react';
import { LRH, display, mono } from '@/components/lrh/tokens';

/**
 * Modale de formulaire partagée par les écrans d'administration.
 *
 * Pourquoi elle existe : jusqu'ici chaque écran affichait un formulaire unique
 * en haut de page, qui servait à la fois à créer et à modifier. Cliquer
 * « Modifier » sur la 30e ligne d'une liste envoyait l'utilisateur à 2000 px
 * plus haut — au point que `MatchesAdmin` avait fini par ajouter un
 * `window.scrollTo({ top: 0 })` pour masquer le symptôme.
 *
 * Pourquoi l'élément natif `<dialog>` plutôt qu'un `<div>` en `position: fixed`
 * comme les quatre modales écrites à la main dans ce projet : `showModal()`
 * fournit le piège de focus, la touche Échap, l'inertie de l'arrière-plan et la
 * restauration du focus à la fermeture. Aucune des modales maison n'a ces
 * quatre comportements ; les réécrire à la main serait long et fragile.
 *
 * Le pied collant règle la moitié invisible du problème : sur un formulaire
 * long (club, match, licencié), le bouton « Enregistrer » était en bas du
 * document et demandait un second défilement.
 */
export type FormDialogProps = {
  open: boolean;
  /** Fermeture demandée : Échap, clic sur le fond, ou bouton de fermeture. */
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  /**
   * `compact` pour quelques champs, `wide` pour les formulaires riches.
   * Sous 720 px les deux passent en plein écran — une modale centrée sur
   * mobile perdrait plus de place en marges qu'elle n'en donne au contenu.
   */
  size?: 'compact' | 'wide';
  /** Barre d'actions du pied. Toujours visible, jamais à aller chercher. */
  footer?: React.ReactNode;
  /**
   * Enregistrement en cours : neutralise les trois voies de fermeture, pour ne
   * pas laisser croire qu'on a annulé une action déjà partie au serveur.
   */
  busy?: boolean;
  children: React.ReactNode;
};

export function FormDialog({
  open,
  onClose,
  title,
  subtitle,
  size = 'compact',
  footer,
  busy = false,
  children,
}: FormDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // L'ouverture est pilotée par la prop, jamais par un appel direct dans un
  // gestionnaire : sans ça l'état du DOM et celui de React divergent dès qu'une
  // fermeture vient du navigateur (Échap).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      // Mémorisé AVANT `showModal()` : l'appel déplace immédiatement le focus
      // dans le dialogue, donc le lire ensuite ne rendrait que le bouton de
      // fermeture — qui disparaît avec la modale, rendant la restauration
      // impossible.
      openerRef.current = document.activeElement as HTMLElement | null;
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // `showModal()` rend l'arrière-plan inerte mais ne bloque pas son défilement :
  // sans ceci, la molette fait défiler la liste derrière la modale.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Focus : deux corrections au comportement par défaut, mesurées au navigateur.
  //
  // 1. `showModal()` donne le focus au premier élément focusable du dialogue —
  //    ici le bouton de fermeture. Taper Entrée en arrivant fermait la modale
  //    au lieu de commencer la saisie. On vise le premier champ.
  // 2. Le navigateur ne restaure le focus au déclencheur que sur `close()`.
  //    Les appelants montent la modale conditionnellement (`{editing && …}`),
  //    donc React la démonte avant que `close()` ne soit appelé : le focus
  //    retombait sur <body>, c'est-à-dire en haut de page — précisément le
  //    défaut que cette modale corrige. On mémorise le déclencheur et on lui
  //    rend le focus nous-mêmes.
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;

    el.querySelector<HTMLElement>(
      '.lrh-dialog-body input:not([type="hidden"]):not([disabled]),' +
        '.lrh-dialog-body select:not([disabled]),' +
        '.lrh-dialog-body textarea:not([disabled])',
    )?.focus();

    return () => {
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`lrh-dialog lrh-dialog--${size}`}
      aria-labelledby={titleId}
      // Échap émet `cancel`. On l'intercepte pour que la fermeture passe
      // toujours par l'état React, sinon la prop `open` resterait à `true`
      // et rouvrirait la modale au rendu suivant.
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      // Sur un `<dialog>` modal, un clic sur le fond a pour cible l'élément
      // lui-même — le contenu est dans les enfants.
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <div className="lrh-dialog-head">
        <div style={{ minWidth: 0 }}>
          <h2
            id={titleId}
            style={{
              ...display,
              margin: 0,
              fontSize: 19,
              fontWeight: 800,
              color: LRH.navy,
              letterSpacing: '-0.02em',
              overflowWrap: 'break-word',
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <div
              style={{
                ...mono,
                marginTop: 5,
                fontSize: 11,
                color: LRH.mute,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Fermer sans enregistrer"
          className="lrh-dialog-close"
        >
          ✕
        </button>
      </div>

      <div className="lrh-dialog-body">{children}</div>

      {footer ? <div className="lrh-dialog-foot">{footer}</div> : null}
    </dialog>
  );
}
