'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono, MODE_COLOR } from '@/components/lrh/tokens';
import { FormDialog } from '@/components/lrh/dashboard/FormDialog';
import { useConfirm } from '@/components/lrh/dashboard/useConfirm';
import { errorMessage } from '@/lib/utils/error-message';
import { formatMatchDay } from '@/lib/utils/match-format';
import {
  createYouthGathering,
  updateYouthGathering,
  deleteYouthGathering,
  setYouthGatheringPublished,
} from '@/lib/actions/youth';
import type { YouthGatheringAdminRow } from '@/lib/queries/youth';

type VenueOption = { id: string; name: string; city: string };

/** `date` traverse le RSC : elle arrive en `Date` ou en chaîne selon le chemin. */
type Row = Omit<YouthGatheringAdminRow, 'date'> & { date: Date | string };

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 13,
  padding: '9px 11px',
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4,
  background: '#fff',
  color: LRH.ink,
};

const btnPrimary: React.CSSProperties = {
  ...body, fontSize: 12, fontWeight: 700,
  padding: '10px 16px', borderRadius: 4,
  background: LRH.navy, color: '#fff',
  border: 'none', cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

const btnGhost: React.CSSProperties = {
  ...body, fontSize: 11.5, fontWeight: 700,
  padding: '7px 12px', borderRadius: 4,
  background: 'transparent', color: LRH.ink2,
  border: '1px solid ' + LRH.hairStrong, cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  minHeight: 36,
};

const btnDanger: React.CSSProperties = {
  ...btnGhost,
  color: LRH.red,
  border: '1px solid ' + LRH.red,
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      ...mono, fontSize: 10, fontWeight: 700,
      color: LRH.mute, letterSpacing: '0.14em',
      textTransform: 'uppercase', display: 'block', marginBottom: 6,
    }}>{children}</label>
  );
}

type FormState = {
  id?: string;
  season: string;
  date: string;
  startTime: string;
  endTime: string;
  venueId: string;
  location: string;
  mode: 'GAZON' | 'SALLE';
  format: string;
  categories: string;
  notes: string;
  published: boolean;
};

function emptyForm(season: string): FormState {
  return {
    season,
    date: '',
    startTime: '09:00',
    endTime: '16:00',
    venueId: '',
    location: '',
    mode: 'GAZON',
    format: '6x6 · 2 périodes de 10 min',
    categories: '',
    notes: '',
    published: false,
  };
}

/** `Date` -> "AAAA-MM-JJ" en heure Réunion, pour un `<input type="date">`. */
function toDateInput(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Indian/Reunion',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  return parts; // en-CA rend déjà "2026-09-26"
}

function rowToForm(row: Row): FormState {
  return {
    id: row.id,
    season: row.season,
    date: toDateInput(row.date),
    startTime: row.startTime ?? '',
    endTime: row.endTime ?? '',
    venueId: row.venueId ?? '',
    location: row.location ?? '',
    mode: row.mode,
    format: row.format ?? '',
    categories: row.categories ?? '',
    notes: row.notes ?? '',
    published: row.published,
  };
}

export function YouthGatheringsAdmin({
  rows,
  venues,
  seasons,
  defaultSeason,
}: {
  rows: Row[];
  venues: VenueOption[];
  seasons: string[];
  defaultSeason: string;
}) {
  const router = useRouter();
  const [ask, confirmDialog] = useConfirm();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const bySeason = new Map<string, Row[]>();
    for (const r of rows) {
      const list = bySeason.get(r.season) ?? [];
      list.push(r);
      bySeason.set(r.season, list);
    }
    return [...bySeason.entries()];
  }, [rows]);

  const submit = async () => {
    if (!form) return;
    if (!form.date) {
      setError('La date est obligatoire.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        season: form.season,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        venueId: form.venueId,
        location: form.location,
        mode: form.mode,
        format: form.format,
        categories: form.categories,
        notes: form.notes,
        published: form.published,
      };
      if (form.id) await updateYouthGathering(form.id, payload);
      else await createYouthGathering(payload);
      setForm(null);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e, "Erreur lors de l'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    const ok = await ask({
      title: 'Supprimer ce rassemblement ?',
      message: `${formatMatchDay(row.date instanceof Date ? row.date : new Date(row.date))} — ${row.location ?? row.venue?.name ?? 'lieu non défini'}.\nCette suppression est définitive.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteYouthGathering(row.id);
        router.refresh();
      } catch (e) {
        setError(errorMessage(e, 'Erreur lors de la suppression'));
      }
    });
  };

  const togglePublished = (row: Row) => {
    startTransition(async () => {
      try {
        await setYouthGatheringPublished(row.id, !row.published);
        router.refresh();
      } catch (e) {
        setError(errorMessage(e, 'Erreur lors de la publication'));
      }
    });
  };

  return (
    <div>
      {error && (
        <div style={{
          ...body, fontSize: 13, color: LRH.red,
          background: 'rgba(168,32,47,0.07)',
          border: '1px solid ' + LRH.red,
          padding: '10px 12px', marginBottom: 16,
        }}>{error}</div>
      )}

      <button style={btnPrimary} onClick={() => { setError(null); setForm(emptyForm(defaultSeason)); }}>
        + Nouveau rassemblement
      </button>

      {grouped.length === 0 && (
        <div style={{
          ...body, fontSize: 13, color: LRH.mute,
          marginTop: 20, padding: 24, background: '#fff',
          border: '1px dashed ' + LRH.hairStrong, textAlign: 'center',
        }}>
          Aucun rassemblement enregistré.
        </div>
      )}

      {grouped.map(([season, list]) => (
        <section key={season} style={{ marginTop: 28 }}>
          <div style={{
            ...mono, fontSize: 10.5, fontWeight: 700, color: LRH.mute,
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10,
          }}>Saison {season} · {list.length} date{list.length > 1 ? 's' : ''}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((row) => {
              const date = row.date instanceof Date ? row.date : new Date(row.date);
              const place = row.venue
                ? `${row.venue.name} · ${row.venue.city}`
                : (row.location ?? null);
              const palette = MODE_COLOR[row.mode];
              return (
                <div key={row.id} style={{
                  background: '#fff',
                  border: '1px solid ' + LRH.hair,
                  borderLeft: `3px solid ${row.published ? palette.bg : LRH.hairStrong}`,
                  padding: '12px 14px',
                  display: 'flex', flexWrap: 'wrap', gap: 12,
                  alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        ...display, fontWeight: 800, fontSize: 15, color: LRH.navy,
                        letterSpacing: '-0.01em',
                      }}>{formatMatchDay(date)}</span>
                      <span style={{
                        ...mono, fontSize: 9, fontWeight: 700,
                        background: palette.soft, color: palette.bg,
                        padding: '3px 7px', letterSpacing: '0.12em', textTransform: 'uppercase',
                      }}>{palette.label}</span>
                      {!row.published && (
                        <span style={{
                          ...mono, fontSize: 9, fontWeight: 700,
                          background: LRH.paperWarm, color: LRH.mute,
                          padding: '3px 7px', letterSpacing: '0.12em', textTransform: 'uppercase',
                        }}>Brouillon</span>
                      )}
                    </div>
                    <div style={{
                      ...body, fontSize: 13,
                      color: place ? LRH.ink2 : LRH.red,
                      fontStyle: place ? 'normal' : 'italic',
                      marginTop: 4,
                    }}>
                      {place ?? 'Lieu à déterminer'}
                      {row.startTime && ` · ${row.startTime}${row.endTime ? ` – ${row.endTime}` : ''}`}
                      {row.format && ` · ${row.format}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      style={btnGhost}
                      disabled={pending}
                      onClick={() => togglePublished(row)}
                    >
                      {row.published ? 'Dépublier' : 'Publier'}
                    </button>
                    <button
                      style={btnGhost}
                      onClick={() => { setError(null); setForm(rowToForm(row)); }}
                    >
                      Modifier
                    </button>
                    <button style={btnDanger} disabled={pending} onClick={() => remove(row)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {form && (
        <FormDialog
          open
          onClose={() => setForm(null)}
          busy={saving}
          size="wide"
          title={form.id ? 'Modifier le rassemblement' : 'Nouveau rassemblement'}
          footer={
            <>
              <button style={btnGhost} disabled={saving} onClick={() => setForm(null)}>Annuler</button>
              <button style={btnPrimary} disabled={saving} onClick={submit}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          }
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: 14,
          }}>
            <div>
              <FieldLabel>Saison *</FieldLabel>
              <input
                list="youth-seasons"
                style={inputStyle}
                value={form.season}
                onChange={(e) => setForm({ ...form, season: e.target.value })}
              />
              <datalist id="youth-seasons">
                {seasons.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <FieldLabel>Date *</FieldLabel>
              <input
                type="date"
                style={inputStyle}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Discipline</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value as 'GAZON' | 'SALLE' })}
              >
                <option value="GAZON">Gazon</option>
                <option value="SALLE">Salle</option>
              </select>
            </div>
            <div>
              <FieldLabel>Début</FieldLabel>
              <input
                type="time"
                style={inputStyle}
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Fin</FieldLabel>
              <input
                type="time"
                style={inputStyle}
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Terrain référencé</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.venueId}
                onChange={(e) => setForm({ ...form, venueId: e.target.value })}
              >
                <option value="">— Aucun —</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} · {v.city}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <FieldLabel>Lieu (texte libre)</FieldLabel>
            <input
              style={inputStyle}
              placeholder="Le Tampon, Trois-Bassins… — laisser vide si le lieu n'est pas décidé"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <div style={{ ...body, fontSize: 11.5, color: LRH.mute, marginTop: 6 }}>
              Utilisé quand aucun terrain de la liste ne correspond. Vide, la page
              publique affiche « Lieu à confirmer » — c&apos;est volontaire, une ligne
              muette passerait pour un bug.
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: 14, marginTop: 14,
          }}>
            <div>
              <FieldLabel>Format</FieldLabel>
              <input
                style={inputStyle}
                placeholder="6x6 · 2 périodes de 10 min"
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Catégories</FieldLabel>
              <input
                style={inputStyle}
                placeholder="U11 · U13 · U15 · U18 — vide si non arrêté"
                value={form.categories}
                onChange={(e) => setForm({ ...form, categories: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <FieldLabel>Note</FieldLabel>
            <input
              style={inputStyle}
              placeholder="Ex. : après le tournoi adultes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 16, cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              style={{ accentColor: LRH.navy }}
            />
            <span style={{ ...body, fontSize: 13, color: LRH.ink }}>
              Visible sur la page publique
            </span>
          </label>
        </FormDialog>
      )}

      {confirmDialog}
    </div>
  );
}
