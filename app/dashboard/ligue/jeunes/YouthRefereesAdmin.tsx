'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono, MODE_COLOR } from '@/components/lrh/tokens';
import { FormDialog } from '@/components/lrh/dashboard/FormDialog';
import { useConfirm } from '@/components/lrh/dashboard/useConfirm';
import { errorMessage } from '@/lib/utils/error-message';
import { formatMatchDay } from '@/lib/utils/match-format';
import { reunionDayKey } from '@/lib/utils/datetime-reunion';
import { deleteYouthRefereeDuty, updateYouthRefereeDuty } from '@/lib/actions/youth';
import type { YouthRefereeDutyAdminRow, YouthRefereeMatchOption } from '@/lib/queries/youth';
import { inputStyle, btnPrimary, btnGhost, btnDanger, FieldLabel } from './adminStyles';
import { YouthRefereeCreateForm, matchOptionLabel } from './YouthRefereeForm';

/** Les dates traversent le RSC : `Date` ou chaîne selon le chemin. */
type Row = Omit<YouthRefereeDutyAdminRow, 'date' | 'match'> & {
  date: Date | string;
  match: (Omit<NonNullable<YouthRefereeDutyAdminRow['match']>, 'kickoffAt'> & { kickoffAt: Date | string }) | null;
};
type MatchOption = Omit<YouthRefereeMatchOption, 'kickoffAt'> & { kickoffAt: Date | string };

/**
 * Admin des jeunes arbitres : la liste de ce qui alimente le classement
 * « Jeunes arbitres » de /jeunes, groupée par saison puis par journée, avec
 * le décompte par arbitre — le même que la page publique.
 */
export function YouthRefereesAdmin({
  rows,
  matches,
  seasons,
  defaultSeason,
}: {
  rows: Row[];
  matches: MatchOption[];
  seasons: string[];
  defaultSeason: string;
}) {
  const router = useRouter();
  const [ask, confirmDialog] = useConfirm();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Noms déjà saisis, proposés en un clic dans le formulaire.
  const knownNames = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const r of rows) byKey.set(r.refereeName.toLocaleLowerCase('fr'), r.refereeName);
    return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [rows]);

  // Saison → { décompte par nom, journées → lignes }.
  const seasonsView = useMemo(() => {
    const bySeason = new Map<string, Row[]>();
    for (const r of rows) {
      const list = bySeason.get(r.season) ?? [];
      list.push(r);
      bySeason.set(r.season, list);
    }
    return [...bySeason.entries()].map(([season, list]) => {
      const tally = new Map<string, { name: string; count: number }>();
      for (const r of list) {
        const key = r.refereeName.toLocaleLowerCase('fr');
        const t = tally.get(key) ?? { name: r.refereeName, count: 0 };
        t.count += 1;
        tally.set(key, t);
      }
      const days = new Map<string, Row[]>();
      for (const r of list) {
        const key = reunionDayKey(r.date);
        days.set(key, [...(days.get(key) ?? []), r]);
      }
      return {
        season,
        total: list.length,
        tally: [...tally.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr')),
        // Journées de la plus récente à la plus ancienne (ordre de la query),
        // mais DANS une journée, ordre chronologique : celui de la feuille
        // qu'on est en train de recopier.
        days: [...days.values()].map((d) =>
          [...d].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
        ),
      };
    });
  }, [rows]);

  const remove = async (row: Row) => {
    const ok = await ask({
      title: 'Supprimer cet arbitrage ?',
      message: `${row.refereeName} — ${rowLabel(row)}.\nIl ne comptera plus au classement des jeunes arbitres.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteYouthRefereeDuty(row.id);
        router.refresh();
      } catch (e) {
        setError(errorMessage(e, 'Erreur lors de la suppression'));
      }
    });
  };

  return (
    <div>
      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="ok">{notice}</Banner>}

      <button
        style={btnPrimary}
        onClick={() => { setError(null); setNotice(null); setCreating(true); }}
      >
        + Saisir des arbitrages
      </button>

      {seasonsView.length === 0 && (
        <div style={{
          ...body, fontSize: 13, color: LRH.mute,
          marginTop: 20, padding: 24, background: '#fff',
          border: '1px dashed ' + LRH.hairStrong, textAlign: 'center',
        }}>
          Aucun arbitrage jeune enregistré.
        </div>
      )}

      {seasonsView.map(({ season, total, tally, days }) => (
        <section key={season} style={{ marginTop: 28 }}>
          <div style={{
            ...mono, fontSize: 10.5, fontWeight: 700, color: LRH.mute,
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8,
          }}>Saison {season} · {total} arbitrage{total > 1 ? 's' : ''}</div>

          {/* Décompte : ce que le classement public affichera (toutes disciplines). */}
          <div style={{ ...body, fontSize: 12.5, color: LRH.ink2, marginBottom: 12, lineHeight: 1.7 }}>
            {tally.map((t, i) => (
              <span key={t.name}>
                {i > 0 && ' · '}
                <strong style={{ color: LRH.navy }}>{t.name}</strong> {t.count}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {days.map((list) => (
              <div key={reunionDayKey(list[0].date)}>
                <div style={{
                  ...display, fontWeight: 800, fontSize: 14, color: LRH.navy,
                  letterSpacing: '-0.01em', marginBottom: 6,
                }}>{formatMatchDay(new Date(list[0].date))}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {list.map((row) => (
                    <DutyRow
                      key={row.id}
                      row={row}
                      pending={pending}
                      onEdit={() => { setError(null); setNotice(null); setEditing(row); }}
                      onDelete={() => remove(row)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {creating && (
        <YouthRefereeCreateForm
          matches={matches}
          seasons={seasons}
          defaultSeason={defaultSeason}
          knownNames={knownNames}
          onClose={() => setCreating(false)}
          onSaved={(created) => {
            setCreating(false);
            setNotice(`${created} arbitrage${created > 1 ? 's' : ''} enregistré${created > 1 ? 's' : ''}.`);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <EditDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}

      {confirmDialog}
    </div>
  );
}

/** « 09:00 · U10-U12 · AZO – HHS 2-1 », ou le libellé d'une rencontre hors classement. */
function rowLabel(row: Row): string {
  if (row.match) return matchOptionLabel(row.match);
  return row.context ?? 'Rencontre hors classement';
}

function DutyRow({
  row, pending, onEdit, onDelete,
}: {
  row: Row;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const palette = MODE_COLOR[row.mode];
  return (
    <div style={{
      background: '#fff',
      border: '1px solid ' + LRH.hair,
      borderLeft: `3px solid ${palette.bg}`,
      padding: '10px 14px',
      display: 'flex', flexWrap: 'wrap', gap: 10,
      alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ minWidth: 0, flex: '1 1 260px' }}>
        <div style={{ ...body, fontSize: 14, fontWeight: 700, color: LRH.ink }}>
          {row.refereeName}
        </div>
        <div style={{ ...body, fontSize: 12.5, color: LRH.ink2, marginTop: 2 }}>
          {rowLabel(row)}
          {!row.match && (
            <span style={{
              ...mono, fontSize: 9, fontWeight: 700, marginLeft: 8,
              background: LRH.paperWarm, color: LRH.mute,
              padding: '2px 6px', letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>Hors classement</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={btnGhost} onClick={onEdit}>Modifier</button>
        <button style={btnDanger} disabled={pending} onClick={onDelete}>Supprimer</button>
      </div>
    </div>
  );
}

function EditDialog({
  row, onClose, onSaved,
}: {
  row: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row.refereeName);
  const [context, setContext] = useState(row.context ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await updateYouthRefereeDuty(row.id, { refereeName: name, context });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onSaved();
    } catch (e) {
      setError(errorMessage(e, "Erreur lors de l'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      busy={saving}
      title="Modifier l'arbitrage"
      footer={
        <>
          <button style={btnGhost} disabled={saving} onClick={onClose}>Annuler</button>
          <button style={btnPrimary} disabled={saving} onClick={submit}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      {error && <Banner tone="error">{error}</Banner>}
      <div style={{ ...body, fontSize: 12.5, color: LRH.ink2, marginBottom: 14 }}>
        {formatMatchDay(new Date(row.date))} · {rowLabel(row)}
        <br />
        <span style={{ color: LRH.mute }}>
          Pour changer de rencontre, supprimer cet arbitrage et le ressaisir.
        </span>
      </div>
      <FieldLabel htmlFor="yr-edit-name">Arbitre *</FieldLabel>
      <input
        id="yr-edit-name"
        style={inputStyle}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {!row.match && (
        <div style={{ marginTop: 14 }}>
          <FieldLabel htmlFor="yr-edit-context">Rencontre *</FieldLabel>
          <input
            id="yr-edit-context"
            style={inputStyle}
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>
      )}
    </FormDialog>
  );
}

function Banner({ tone, children }: { tone: 'error' | 'ok'; children: React.ReactNode }) {
  const color = tone === 'error' ? LRH.red : '#1d6b3f';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} style={{
      ...body, fontSize: 13, color,
      background: tone === 'error' ? 'rgba(168,32,47,0.07)' : 'rgba(29,107,63,0.07)',
      border: '1px solid ' + color,
      padding: '10px 12px', marginBottom: 16,
    }}>{children}</div>
  );
}
