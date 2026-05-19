'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import {
  createVenue,
  updateVenue,
  deleteVenue,
  type VenueInput,
} from '@/lib/actions/venue';
import type { VenueAdminRow } from '@/lib/queries/venue';

type FormState = Partial<VenueInput> & { id?: string };

const EMPTY_FORM: FormState = {
  name: '',
  city: '',
  address: '',
  supportsGazon: false,
  supportsSalle: false,
  notes: '',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        ...mono,
        fontSize: 10,
        fontWeight: 700,
        color: LRH.mute,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 14,
  padding: '10px 12px',
  width: '100%',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4,
  background: '#fff',
  color: LRH.ink,
};

function VenueForm({
  initial,
  onCancel,
  onDone,
}: {
  initial: FormState;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial.id);

  const submit = async () => {
    if (!form.name?.trim() || !form.city?.trim()) {
      setError('Nom et ville obligatoires.');
      return;
    }
    if (!form.supportsGazon && !form.supportsSalle) {
      setError('Cochez au moins une surface.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: VenueInput = {
        name: form.name!.trim(),
        city: form.city!.trim(),
        address: form.address?.toString().trim() || null,
        supportsGazon: !!form.supportsGazon,
        supportsSalle: !!form.supportsSalle,
        notes: form.notes?.toString().trim() || null,
      };
      if (isEdit && initial.id) await updateVenue(initial.id, payload);
      else await createVenue(payload);
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${LRH.gold}`,
        padding: 24,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 11,
          fontWeight: 700,
          color: LRH.red,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        {isEdit ? '▸ Modifier le terrain' : '▸ Nouveau terrain'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Nom *</FieldLabel>
          <input
            style={inputStyle}
            value={form.name ?? ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Stade du Port — terrain synthétique"
          />
        </div>
        <div>
          <FieldLabel>Ville *</FieldLabel>
          <input
            style={inputStyle}
            value={form.city ?? ''}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Le Port"
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Adresse</FieldLabel>
        <input
          style={inputStyle}
          value={form.address ?? ''}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="2 rue Émile Hugot, 97420 Le Port"
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Surfaces praticables *</FieldLabel>
        <div style={{ display: 'flex', gap: 10 }}>
          <SurfaceToggle
            label="Gazon"
            active={!!form.supportsGazon}
            onClick={() => setForm({ ...form, supportsGazon: !form.supportsGazon })}
            color="#2c7a3f"
          />
          <SurfaceToggle
            label="Salle"
            active={!!form.supportsSalle}
            onClick={() => setForm({ ...form, supportsSalle: !form.supportsSalle })}
            color={LRH.navy}
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Notes</FieldLabel>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Accès par le portail nord, parking limité…"
        />
      </div>

      {error && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            marginBottom: 12,
            padding: '8px 12px',
            background: 'rgba(168,32,47,0.08)',
            border: '1px solid rgba(168,32,47,0.2)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={submit}
          disabled={saving}
          style={{
            ...body,
            fontSize: 12.5,
            fontWeight: 700,
            padding: '10px 18px',
            borderRadius: 4,
            background: LRH.navy,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            ...body,
            fontSize: 12.5,
            fontWeight: 700,
            padding: '10px 18px',
            borderRadius: 4,
            background: 'transparent',
            color: LRH.mute,
            border: '1px solid ' + LRH.hairStrong,
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function SurfaceToggle({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px 14px',
        borderRadius: 4,
        background: active ? color : '#fff',
        color: active ? '#fff' : LRH.ink2,
        border: `1px solid ${active ? color : LRH.hairStrong}`,
        cursor: 'pointer',
        ...display,
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: active ? '#fff' : color,
        }}
      />
      {label}
    </button>
  );
}

export function VenuesAdmin({ initialVenues }: { initialVenues: VenueAdminRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);

  const refresh = () => {
    setEditing(null);
    router.refresh();
  };

  const onDelete = async (row: VenueAdminRow) => {
    if (!confirm(`Supprimer le terrain "${row.name}" (${row.city}) ?`)) return;
    try {
      await deleteVenue(row.id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur de suppression');
    }
  };

  // Group by city
  const byCity = new Map<string, VenueAdminRow[]>();
  for (const v of initialVenues) {
    if (!byCity.has(v.city)) byCity.set(v.city, []);
    byCity.get(v.city)!.push(v);
  }

  return (
    <div>
      {editing && (
        <VenueForm initial={editing} onCancel={() => setEditing(null)} onDone={refresh} />
      )}

      {!editing && (
        <button
          onClick={() => setEditing({ ...EMPTY_FORM })}
          style={{
            ...body,
            fontSize: 12.5,
            fontWeight: 700,
            padding: '12px 20px',
            borderRadius: 4,
            background: LRH.red,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          + Nouveau terrain
        </button>
      )}

      {initialVenues.length === 0 && !editing ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            background: '#fff',
            border: '1px dashed ' + LRH.hairStrong,
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: 11,
              color: LRH.mute,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            [ vide ]
          </div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>
            Aucun terrain dans le registre. Commencez par en ajouter un.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Array.from(byCity.entries()).map(([city, list]) => (
            <div key={city}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                <div style={{ width: 14, height: 2, background: LRH.gold }} />
                <div
                  style={{
                    ...display,
                    fontWeight: 700,
                    fontSize: 16,
                    color: LRH.navy,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {city}
                </div>
                <div style={{ flex: 1, height: 1, background: LRH.hair }} />
                <div
                  style={{
                    ...mono,
                    fontSize: 10,
                    color: LRH.mute,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  {list.length.toString().padStart(2, '0')} terrain{list.length > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      background: '#fff',
                      border: '1px solid ' + LRH.hair,
                      borderLeft: `3px solid ${v.supportsGazon ? '#2c7a3f' : LRH.navy}`,
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        {v.supportsGazon && <SurfaceTag label="Gazon" color="#2c7a3f" />}
                        {v.supportsSalle && <SurfaceTag label="Salle" color={LRH.navy} />}
                      </div>
                      <div
                        style={{
                          ...display,
                          fontWeight: 700,
                          fontSize: 16,
                          color: LRH.navy,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {v.name}
                      </div>
                      {v.address && (
                        <div
                          style={{
                            ...body,
                            fontSize: 12,
                            color: LRH.mute,
                            marginTop: 2,
                          }}
                        >
                          ◉ {v.address}
                        </div>
                      )}
                      <div
                        style={{
                          ...mono,
                          fontSize: 10,
                          color: LRH.mute,
                          letterSpacing: '0.08em',
                          marginTop: 4,
                        }}
                      >
                        {v._count.matches} match{v._count.matches > 1 ? 's' : ''} programmé
                        {v._count.matches > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() =>
                          setEditing({
                            id: v.id,
                            name: v.name,
                            city: v.city,
                            address: v.address ?? '',
                            supportsGazon: v.supportsGazon,
                            supportsSalle: v.supportsSalle,
                            notes: v.notes ?? '',
                          })
                        }
                        style={{
                          ...body,
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: 4,
                          background: 'transparent',
                          color: LRH.navy,
                          border: '1px solid ' + LRH.navy,
                          cursor: 'pointer',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => onDelete(v)}
                        style={{
                          ...body,
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: 4,
                          background: 'transparent',
                          color: LRH.red,
                          border: '1px solid ' + LRH.red,
                          cursor: 'pointer',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
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

function SurfaceTag({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        ...mono,
        fontSize: 9,
        fontWeight: 800,
        padding: '2px 6px',
        borderRadius: 2,
        background: color,
        color: '#fff',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', opacity: 0.85 }} />
      {label}
    </span>
  );
}
