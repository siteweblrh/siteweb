'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, mono } from '@/components/lrh/tokens';
import { FormDialog } from '@/components/lrh/dashboard/FormDialog';
import { useConfirm } from '@/components/lrh/dashboard/useConfirm';
import { SeasonCard } from './SeasonCard';
import {
  createSeason,
  openSeason,
  closeSeason,
  deleteSeason,
  type SeasonRow,
} from '@/lib/actions/season';
import { isValidSeason } from '@/lib/utils/season';
import { btnPrimary, btnGhost, ACTION_GAP } from './ui';

/**
 * Orchestrateur de l'écran : état, appels serveur, dialogues. Le rendu d'une
 * saison vit dans SeasonCard, celui du statut dans SeasonStatusBadge — de
 * sorte qu'aucun des trois fichiers n'ait à connaître les préoccupations des
 * deux autres.
 */
export function SeasonsAdmin({ initialSeasons }: { initialSeasons: SeasonRow[] }) {
  const router = useRouter();
  const [ask, confirmDialog] = useConfirm();
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const current = initialSeasons.find((s) => s.status === 'EN_COURS') ?? null;

  /** Enveloppe commune : une seule façon de gérer busy, erreurs et refresh. */
  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setFeedback(null);
    try {
      setFeedback({ kind: 'ok', text: await fn() });
      router.refresh();
    } catch (e) {
      // Le message vient du serveur (règles métier) — on l'affiche tel quel
      // plutôt qu'un « une erreur est survenue » qui n'aide personne.
      setFeedback({ kind: 'error', text: e instanceof Error ? e.message : 'Échec de l’opération.' });
    } finally {
      setBusy(false);
    }
  };

  const onCreate = () =>
    run(async () => {
      await createSeason({ label: label.trim() });
      setCreating(false);
      setLabel('');
      return `Saison ${label.trim()} créée, en préparation.`;
    });

  const onOpen = async (s: SeasonRow) => {
    const ok = await ask({
      title: `Ouvrir la saison ${s.label} ?`,
      message: current
        ? `Tout le site public basculera sur ${s.label}.\n\nLa saison ${current.label}, actuellement en cours, passera en « Terminée » — elle restera consultable via le sélecteur de saison.`
        : `Tout le site public basculera sur ${s.label}.`,
      confirmLabel: 'Ouvrir la saison',
    });
    if (!ok) return;
    return run(async () => {
      const r = await openSeason(s.id);
      return r.closed
        ? `${r.opened} est ouverte. ${r.closed} est passée en terminée.`
        : `${r.opened} est ouverte.`;
    });
  };

  const onClose = async (s: SeasonRow) => {
    const ok = await ask({
      title: `Clôturer la saison ${s.label} ?`,
      message:
        'Aucune saison ne sera plus en cours. Les écrans publics retomberont sur la dernière saison disposant de résultats, jusqu’à ce que vous en ouvriez une autre.',
      confirmLabel: 'Clôturer',
    });
    if (!ok) return;
    return run(async () => {
      await closeSeason(s.id);
      return `${s.label} est clôturée.`;
    });
  };

  const onDelete = async (s: SeasonRow) => {
    const ok = await ask({
      title: `Supprimer la saison ${s.label} ?`,
      message: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    return run(async () => {
      await deleteSeason(s.id);
      return `${s.label} supprimée.`;
    });
  };

  const labelValid = isValidSeason(label);

  return (
    <>
      {confirmDialog}

      <div style={{ display: 'flex', gap: ACTION_GAP, flexWrap: 'wrap', marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setCreating(true)}
          disabled={busy}
          style={{ ...btnPrimary, opacity: busy ? 0.5 : 1 }}
        >
          + Ouvrir une nouvelle saison
        </button>
      </div>

      {/* aria-live : le retour d'action est annoncé aux lecteurs d'écran, qui
          ne « voient » pas apparaître un bandeau coloré. */}
      <div aria-live="polite" role="status">
        {feedback && (
          <p
            style={{
              ...body, fontSize: 13, margin: '0 0 18px',
              padding: '10px 14px', borderRadius: 4,
              color: feedback.kind === 'ok' ? '#14532d' : LRH.red,
              background: feedback.kind === 'ok' ? '#dcfce7' : '#fdeaec',
              border: `1px solid ${feedback.kind === 'ok' ? '#86efac' : LRH.red}`,
            }}
          >
            {feedback.text}
          </p>
        )}
      </div>

      {initialSeasons.length === 0 ? (
        <p style={{ ...body, fontSize: 13, color: LRH.mute }}>
          Aucune saison enregistrée.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            // Une colonne sous ~720 px, puis autant que la largeur le permet.
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 16,
          }}
        >
          {initialSeasons.map((s) => (
            <SeasonCard
              key={s.id}
              season={s}
              busy={busy}
              onOpen={() => onOpen(s)}
              onClose={() => onClose(s)}
              onDelete={() => onDelete(s)}
            />
          ))}
        </div>
      )}

      <FormDialog
        open={creating}
        onClose={() => { setCreating(false); setLabel(''); }}
        title="Nouvelle saison"
        subtitle="Elle sera créée en préparation. L’ouvrir est une action distincte."
        busy={busy}
        footer={
          <>
            <button
              type="button"
              onClick={() => { setCreating(false); setLabel(''); }}
              style={btnGhost}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onCreate}
              disabled={!labelValid || busy}
              style={{
                ...btnPrimary,
                cursor: !labelValid || busy ? 'not-allowed' : 'pointer',
                opacity: !labelValid || busy ? 0.5 : 1,
              }}
            >
              Créer
            </button>
          </>
        }
      >
        <label
          htmlFor="season-label"
          style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}
        >
          Libellé de la saison
        </label>
        <input
          id="season-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="2027-2028"
          inputMode="numeric"
          autoComplete="off"
          aria-describedby="season-label-help"
          aria-invalid={label.length > 0 && !labelValid}
          style={{
            ...body, fontSize: 14, width: '100%', boxSizing: 'border-box',
            minHeight: 48, padding: '0 12px', marginTop: 6,
            border: `1px solid ${label.length > 0 && !labelValid ? LRH.red : LRH.hairStrong}`,
            borderRadius: 4, background: '#fff', color: LRH.ink,
          }}
        />
        <p id="season-label-help" style={{ ...body, fontSize: 12, color: label.length > 0 && !labelValid ? LRH.red : LRH.mute, margin: '8px 0 0' }}>
          Format AAAA-AAAA, deux années consécutives. Les dates de début et de
          fin sont posées automatiquement de septembre à juin, modifiables ensuite.
        </p>
      </FormDialog>
    </>
  );
}
