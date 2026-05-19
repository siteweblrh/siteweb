'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import {
  createReferee,
  updateReferee,
  deleteReferee,
  type RefereeInput,
} from '@/lib/actions/referee';
import type { RefereeAdminRow } from '@/lib/queries/referee';
import { ImageUploader } from '@/components/lrh/upload/ImageUploader';

type RefereeLevel = 'CANDIDAT' | 'JEUNE' | 'REGIONAL' | 'NATIONAL';

const LEVEL_LABELS: Record<RefereeLevel, string> = {
  CANDIDAT: 'Candidat',
  JEUNE: 'Jeune arbitre',
  REGIONAL: 'Régional',
  NATIONAL: 'National / Fédéral',
};
const LEVEL_ORDER: RefereeLevel[] = ['CANDIDAT', 'JEUNE', 'REGIONAL', 'NATIONAL'];

type ClubOption = { id: string; name: string; shortCode: string | null; city: string };

type FormState = Omit<Partial<RefereeInput>, 'level' | 'photo' | 'clubId'> & {
  id?: string;
  level: RefereeLevel | null;
  photo: string;
  clubId: string;
};

const EMPTY_FORM: FormState = {
  fullName: '',
  license: '',
  email: '',
  phone: '',
  notes: '',
  level: null,
  photo: '',
  clubId: '',
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

function RefereeForm({
  initial,
  clubs,
  onCancel,
  onDone,
}: {
  initial: FormState;
  clubs: ClubOption[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial.id);

  const submit = async () => {
    if (!form.fullName?.trim()) {
      setError('Nom complet requis.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: RefereeInput = {
        fullName: form.fullName!.trim(),
        license: form.license?.toString().trim() || null,
        email: form.email?.toString().trim() || null,
        phone: form.phone?.toString().trim() || null,
        notes: form.notes?.toString().trim() || null,
        level: form.level,
        photo: form.photo.trim() || null,
        clubId: form.clubId || null,
      };
      if (isEdit && initial.id) await updateReferee(initial.id, payload);
      else await createReferee(payload);
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
        borderLeft: `3px solid ${LRH.red}`,
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
        {isEdit ? '▸ Modifier l\'arbitre' : '▸ Nouvel arbitre'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Nom complet *</FieldLabel>
          <input
            style={inputStyle}
            value={form.fullName ?? ''}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Jean Dupont"
          />
        </div>
        <div>
          <FieldLabel>N° de licence</FieldLabel>
          <input
            style={inputStyle}
            value={form.license ?? ''}
            onChange={(e) => setForm({ ...form, license: e.target.value })}
            placeholder="A-12345"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Email</FieldLabel>
          <input
            type="email"
            style={inputStyle}
            value={form.email ?? ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="arbitre@exemple.re"
          />
        </div>
        <div>
          <FieldLabel>Téléphone</FieldLabel>
          <input
            style={inputStyle}
            value={form.phone ?? ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+262 6 92 ..."
          />
        </div>
      </div>

      {/* Profil public — niveau, photo, club d'affiliation */}
      <div
        style={{
          marginBottom: 14,
          padding: 14,
          background: LRH.paperWarm,
          border: '1px solid ' + LRH.hair,
          borderLeft: `3px solid ${LRH.gold}`,
        }}
      >
        <div
          style={{
            ...mono,
            fontSize: 10,
            fontWeight: 700,
            color: LRH.gold,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          ◉ Profil public — visible sur /arbitrage
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Niveau</FieldLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LEVEL_ORDER.map((lv) => {
              const active = form.level === lv;
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setForm({ ...form, level: active ? null : lv })}
                  style={{
                    ...mono,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '7px 12px',
                    background: active ? LRH.navy : '#fff',
                    color: active ? '#fff' : LRH.ink2,
                    border: `1px solid ${active ? LRH.navy : LRH.hairStrong}`,
                    cursor: 'pointer',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {LEVEL_LABELS[lv]}
                </button>
              );
            })}
          </div>
          <div
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.08em',
              marginTop: 6,
            }}
          >
            Clic à nouveau pour désélectionner. Si aucun niveau, l&apos;arbitre apparaîtra dans &laquo; Non classés &raquo;.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
          <div>
            <FieldLabel>Photo</FieldLabel>
            <ImageUploader
              value={form.photo}
              onChange={(url) => setForm({ ...form, photo: url ?? '' })}
              hint="Glissez une image, cliquez pour parcourir, ou collez une URL."
            />
          </div>
          <div>
            <FieldLabel>Club d&apos;affiliation</FieldLabel>
            <select
              style={inputStyle}
              value={form.clubId}
              onChange={(e) => setForm({ ...form, clubId: e.target.value })}
            >
              <option value="">— Indépendant —</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortCode ? `${c.shortCode} · ` : ''}
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Notes (internes — non publiques)</FieldLabel>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Indisponibilités, contact secondaire…"
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

export function ArbitresAdmin({
  initialReferees,
  clubs,
}: {
  initialReferees: RefereeAdminRow[];
  clubs: ClubOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);

  const refresh = () => {
    setEditing(null);
    router.refresh();
  };

  const onDelete = async (row: RefereeAdminRow) => {
    if (
      !confirm(
        `Supprimer l'arbitre "${row.fullName}" ? Cela retirera son affectation des ${row._count.matches} match${row._count.matches > 1 ? 's' : ''} associé${row._count.matches > 1 ? 's' : ''}.`,
      )
    ) {
      return;
    }
    try {
      await deleteReferee(row.id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur de suppression');
    }
  };

  return (
    <div>
      {editing && (
        <RefereeForm
          initial={editing}
          clubs={clubs}
          onCancel={() => setEditing(null)}
          onDone={refresh}
        />
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
          + Nouvel arbitre
        </button>
      )}

      {initialReferees.length === 0 && !editing ? (
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
            Aucun arbitre dans le registre. Commencez par en ajouter un.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {initialReferees.map((r) => (
            <div
              key={r.id}
              style={{
                background: '#fff',
                border: '1px solid ' + LRH.hair,
                borderLeft: `3px solid ${LRH.navy}`,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    ...display,
                    fontWeight: 700,
                    fontSize: 16,
                    color: LRH.navy,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {r.fullName}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginTop: 4,
                    ...mono,
                    fontSize: 11,
                    color: LRH.mute,
                    letterSpacing: '0.06em',
                  }}
                >
                  {r.license && <span>LIC {r.license}</span>}
                  {r.email && <span>✉ {r.email}</span>}
                  {r.phone && <span>☎ {r.phone}</span>}
                </div>
                <div
                  style={{
                    ...mono,
                    fontSize: 10,
                    color: LRH.mute,
                    letterSpacing: '0.08em',
                    marginTop: 4,
                  }}
                >
                  {r._count.matches} match{r._count.matches > 1 ? 's' : ''} arbitré
                  {r._count.matches > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() =>
                    setEditing({
                      id: r.id,
                      fullName: r.fullName,
                      license: r.license ?? '',
                      email: r.email ?? '',
                      phone: r.phone ?? '',
                      notes: r.notes ?? '',
                      level: r.level ?? null,
                      photo: r.photo ?? '',
                      clubId: r.clubId ?? '',
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
                  onClick={() => onDelete(r)}
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
      )}
    </div>
  );
}
