'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import {
  createTrainingSchedule,
  updateTrainingSchedule,
  deleteTrainingSchedule,
  type TrainingScheduleRow,
} from '@/lib/actions/training';
import type { VenueAdminRow } from '@/lib/queries/venue';
import { FormDialog } from '@/components/lrh/dashboard/FormDialog';

const DAYS: { value: TrainingScheduleRow['dayOfWeek']; label: string }[] = [
  { value: 'MONDAY',    label: 'Lundi' },
  { value: 'TUESDAY',   label: 'Mardi' },
  { value: 'WEDNESDAY', label: 'Mercredi' },
  { value: 'THURSDAY',  label: 'Jeudi' },
  { value: 'FRIDAY',    label: 'Vendredi' },
  { value: 'SATURDAY',  label: 'Samedi' },
  { value: 'SUNDAY',    label: 'Dimanche' },
];

const dayLabel = (d: TrainingScheduleRow['dayOfWeek']) =>
  DAYS.find((x) => x.value === d)?.label ?? d;

const inputStyle: React.CSSProperties = {
  ...body, fontSize: 13, padding: '9px 11px', width: '100%',
  border: '1px solid ' + LRH.hairStrong, borderRadius: 4,
  background: '#fff', color: LRH.ink,
};

const btnPrimary: React.CSSProperties = {
  ...body, fontSize: 12, fontWeight: 700,
  padding: '10px 18px', borderRadius: 4,
  background: LRH.navy, color: '#fff',
  border: 'none', cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

const btnGhost: React.CSSProperties = {
  ...body, fontSize: 11.5, fontWeight: 700,
  padding: '6px 12px', borderRadius: 4,
  background: 'transparent', color: LRH.ink2,
  border: '1px solid ' + LRH.hairStrong, cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

const btnDanger: React.CSSProperties = {
  ...body, fontSize: 11.5, fontWeight: 700,
  padding: '6px 12px', borderRadius: 4,
  background: 'transparent', color: LRH.red,
  border: '1px solid ' + LRH.red, cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

type FormState = {
  id?: string;
  category: string;
  dayOfWeek: TrainingScheduleRow['dayOfWeek'];
  startTime: string;
  endTime: string;
  venueId: string;
  location: string;
  notes: string;
};

const EMPTY: FormState = {
  category: '',
  dayOfWeek: 'MONDAY',
  startTime: '18:00',
  endTime: '20:00',
  venueId: '',
  location: '',
  notes: '',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      display: 'block', marginBottom: 6,
    }}>
      {children}
    </label>
  );
}

export function TrainingAdmin({
  clubId,
  schedules,
  categories,
  venues,
  myVenueIds = [],
}: {
  clubId: string;
  schedules: TrainingScheduleRow[];
  categories: string[];
  venues: VenueAdminRow[];
  // Venues "préférés" du club (home + training). Promus en haut du dropdown
  // pour réduire la friction quand le manager crée un créneau récurrent.
  myVenueIds?: string[];
}) {
  // Sépare les venues en "Mes terrains" / "Autres terrains" pour le dropdown.
  // Conserve l'ordre alpha à l'intérieur de chaque groupe.
  const myVenueSet = new Set(myVenueIds);
  const myVenues = venues.filter((v) => myVenueSet.has(v.id));
  const otherVenues = venues.filter((v) => !myVenueSet.has(v.id));
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(editing?.id);

  const submit = async () => {
    if (!editing) return;
    if (!editing.category.trim()) { setError('Catégorie requise.'); return; }
    if (editing.startTime >= editing.endTime) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    setSaving(true); setError(null);
    try {
      const payload = {
        category: editing.category.trim(),
        dayOfWeek: editing.dayOfWeek,
        startTime: editing.startTime,
        endTime: editing.endTime,
        venueId: editing.venueId || null,
        location: editing.location.trim() || null,
        notes: editing.notes.trim() || null,
      };
      if (isEdit && editing.id) {
        await updateTrainingSchedule(editing.id, payload);
      } else {
        await createTrainingSchedule(clubId, payload);
      }
      setEditing(null);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (s: TrainingScheduleRow) => {
    if (!confirm(`Supprimer le créneau ${dayLabel(s.dayOfWeek)} ${s.startTime}-${s.endTime} (${s.category}) ?`)) return;
    try {
      await deleteTrainingSchedule(s.id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur de suppression');
    }
  };

  // Groupage par catégorie pour lisibilité
  const grouped = useMemo(() => {
    const map = new Map<string, TrainingScheduleRow[]>();
    for (const s of schedules) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [schedules]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {editing && (
        <FormDialog
          open
          onClose={() => setEditing(null)}
          busy={saving}
          size="wide"
          title={isEdit ? 'Modifier le créneau' : 'Nouveau créneau'}
          subtitle={isEdit ? editing.category || undefined : undefined}
          footer={
            <>
              <button onClick={() => setEditing(null)} disabled={saving} style={btnGhost}>
                Annuler
              </button>
              <button onClick={submit} disabled={saving} style={btnPrimary}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          }
        >

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <FieldLabel>Catégorie *</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              >
                <option value="">— Choisir —</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {categories.length === 0 && (
                <div style={{ ...mono, fontSize: 9.5, color: LRH.mute, marginTop: 4, letterSpacing: '0.06em' }}>
                  Aucune catégorie définie. Contacte la ligue pour en créer.
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Jour *</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={editing.dayOfWeek}
                onChange={(e) => setEditing({ ...editing, dayOfWeek: e.target.value as TrainingScheduleRow['dayOfWeek'] })}
              >
                {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Début *</FieldLabel>
              <input
                type="time"
                style={inputStyle}
                value={editing.startTime}
                onChange={(e) => setEditing({ ...editing, startTime: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Fin *</FieldLabel>
              <input
                type="time"
                style={inputStyle}
                value={editing.endTime}
                onChange={(e) => setEditing({ ...editing, endTime: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <FieldLabel>Terrain</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={editing.venueId}
                onChange={(e) => setEditing({ ...editing, venueId: e.target.value })}
              >
                <option value="">— Aucun (ou lieu libre) —</option>
                {myVenues.length > 0 && (
                  <optgroup label="Mes terrains">
                    {myVenues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} · {v.city}</option>
                    ))}
                  </optgroup>
                )}
                {otherVenues.length > 0 && (
                  <optgroup label={myVenues.length > 0 ? 'Autres terrains' : 'Terrains'}>
                    {otherVenues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name} · {v.city}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              {myVenues.length === 0 && (
                <div style={{ ...mono, fontSize: 9.5, color: LRH.mute, marginTop: 4, letterSpacing: '0.06em' }}>
                  Astuce : renseigne tes terrains dans « Mes terrains » pour les voir en tête de liste.
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Lieu libre (si pas de terrain)</FieldLabel>
              <input
                style={inputStyle}
                value={editing.location}
                onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                placeholder="Ex : terrain annexe, gymnase X…"
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Remarques</FieldLabel>
            <input
              style={inputStyle}
              value={editing.notes}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              placeholder="Ex : suspendu pendant les vacances scolaires"
            />
          </div>

          {error && (
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              marginBottom: 12, padding: '8px 12px',
              background: 'rgba(168,32,47,0.08)',
              border: '1px solid rgba(168,32,47,0.2)',
            }}>
              ⚠ {error}
            </div>
          )}

        </FormDialog>
      )}

      {/* La liste et ce bouton restent visibles pendant l'édition : la modale
          se superpose au lieu de remplacer la page. */}
      <button onClick={() => setEditing({ ...EMPTY })} style={{
        ...body, fontSize: 12.5, fontWeight: 700,
        padding: '12px 20px', borderRadius: 4,
        background: LRH.red, color: '#fff',
        border: 'none', cursor: 'pointer',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        alignSelf: 'flex-start',
      }}>
        + Nouveau créneau
      </button>

      {schedules.length === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center',
          background: '#fff', border: '1px dashed ' + LRH.hairStrong,
          ...body, fontSize: 13, color: LRH.mute,
        }}>
          Aucun créneau pour le moment. Ajoutez le premier ci-dessus.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(([cat, list]) => (
            <div key={cat}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10,
              }}>
                <div style={{ width: 14, height: 2, background: LRH.gold }} />
                <div style={{
                  ...display, fontWeight: 700, fontSize: 16,
                  color: LRH.navy, letterSpacing: '-0.01em',
                }}>
                  {cat}
                </div>
                <div style={{ flex: 1, height: 1, background: LRH.hair }} />
                <div style={{
                  ...mono, fontSize: 10, color: LRH.mute,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                }}>
                  {list.length.toString().padStart(2, '0')} créneau{list.length > 1 ? 'x' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {list.map((s) => (
                  <div
                    key={s.id}
                    className="lrh-train-row"
                    style={{
                      background: '#fff',
                      border: '1px solid ' + LRH.hair,
                      borderLeft: `3px solid ${LRH.navy}`,
                      padding: '12px 16px',
                    }}
                  >
                    <span style={{
                      ...mono, fontSize: 10, color: LRH.mute,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                    }}>
                      {dayLabel(s.dayOfWeek)}
                    </span>
                    <span style={{
                      ...display, fontWeight: 700, fontSize: 14, color: LRH.navy,
                      letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
                    }}>
                      {s.startTime} – {s.endTime}
                    </span>
                    <span className="lrh-train-row-info" style={{
                      ...body, fontSize: 12.5, color: LRH.ink2,
                    }}>
                      {s.venue ? `${s.venue.name} · ${s.venue.city}` : s.location || '—'}
                      {s.notes && (
                        <span style={{ ...mono, fontSize: 10, color: LRH.mute, marginLeft: 10, letterSpacing: '0.06em' }}>
                          ({s.notes})
                        </span>
                      )}
                    </span>
                    <div className="lrh-train-row-actions">
                      <button style={btnGhost} onClick={() => setEditing({
                        id: s.id,
                        category: s.category,
                        dayOfWeek: s.dayOfWeek,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        venueId: s.venueId ?? '',
                        location: s.location ?? '',
                        notes: s.notes ?? '',
                      })}>
                        Modifier
                      </button>
                      <button style={btnDanger} onClick={() => onDelete(s)}>
                        Suppr.
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
