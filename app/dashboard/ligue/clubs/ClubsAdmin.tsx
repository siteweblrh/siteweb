'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono, ClubCrest } from '@/components/lrh/tokens';
import {
  createClub,
  updateClub,
  deleteClub,
  type ClubInput,
  type ClubAdminRow,
} from '@/lib/actions/club';

type Kind = 'STANDALONE' | 'ENTENTE';

type FormState = {
  id?: string;
  name: string;
  slug: string;
  shortCode: string;
  city: string;
  kind: Kind;
  parentClubIds: string[];
  latitude: string;
  longitude: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  shortCode: '',
  city: '',
  kind: 'STANDALONE',
  parentClubIds: [],
  latitude: '',
  longitude: '',
};

// Bornes géographiques approximatives de La Réunion (un peu de marge autour
// pour tolérer un stade en bordure de côte).
const REUNION_BOUNDS = { latMin: -21.42, latMax: -20.85, lonMin: 55.19, lonMax: 55.86 };

function parseCoordPair(raw: string): { lat: number; lon: number } | null {
  // Accepte : "-21.0096, 55.2706" / "-21.0096,55.2706" / "-21.0096 55.2706"
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)[\s,;]+(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lon = parseFloat(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
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

function ClubForm({
  initial,
  allClubs,
  onCancel,
  onDone,
}: {
  initial: FormState;
  allClubs: ClubAdminRow[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial.id);

  // Clubs éligibles comme parents : STANDALONE uniquement, et hors self si édition
  const eligibleParents = useMemo(
    () =>
      allClubs.filter(
        (c) => c.kind === 'STANDALONE' && c.id !== initial.id,
      ),
    [allClubs, initial.id],
  );

  const toggleParent = (clubId: string) => {
    const exists = form.parentClubIds.includes(clubId);
    setForm({
      ...form,
      parentClubIds: exists
        ? form.parentClubIds.filter((id) => id !== clubId)
        : [...form.parentClubIds, clubId],
    });
  };

  // Validation lat/lon : ou bien les deux remplis et valides, ou bien les deux vides.
  const latStr = form.latitude.trim();
  const lonStr = form.longitude.trim();
  const latNum = latStr === '' ? null : Number(latStr);
  const lonNum = lonStr === '' ? null : Number(lonStr);
  const latLonStatus: 'empty' | 'valid' | 'partial' | 'invalid' | 'off-island' =
    latStr === '' && lonStr === ''
      ? 'empty'
      : latStr === '' || lonStr === ''
        ? 'partial'
        : !Number.isFinite(latNum) || !Number.isFinite(lonNum) || latNum! < -90 || latNum! > 90 || lonNum! < -180 || lonNum! > 180
          ? 'invalid'
          : latNum! < REUNION_BOUNDS.latMin || latNum! > REUNION_BOUNDS.latMax || lonNum! < REUNION_BOUNDS.lonMin || lonNum! > REUNION_BOUNDS.lonMax
            ? 'off-island'
            : 'valid';

  const submit = async () => {
    if (!form.name.trim() || !form.city.trim()) {
      setError('Nom et ville obligatoires.');
      return;
    }
    if (form.kind === 'ENTENTE' && form.parentClubIds.length < 2) {
      setError('Une entente doit regrouper au moins 2 clubs membres.');
      return;
    }
    if (latLonStatus === 'partial') {
      setError('Renseignez latitude ET longitude, ou laissez les deux vides.');
      return;
    }
    if (latLonStatus === 'invalid') {
      setError('Coordonnées invalides (latitude -90→90, longitude -180→180).');
      return;
    }
    if (latLonStatus === 'off-island') {
      setError('Coordonnées hors de La Réunion. Laissez vide pour utiliser la position de la commune.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: ClubInput = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        shortCode: form.shortCode.trim() || null,
        city: form.city.trim(),
        kind: form.kind,
        parentClubIds: form.kind === 'ENTENTE' ? form.parentClubIds : [],
        latitude: latNum,
        longitude: lonNum,
      };
      if (isEdit && initial.id) await updateClub(initial.id, payload);
      else await createClub(payload);
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  // Si l'admin colle "lat, lon" dans le champ latitude, on auto-split.
  const onLatitudeInput = (raw: string) => {
    const pair = parseCoordPair(raw);
    if (pair) {
      setForm({ ...form, latitude: String(pair.lat), longitude: String(pair.lon) });
    } else {
      setForm({ ...form, latitude: raw });
    }
  };

  const accentColor = form.kind === 'ENTENTE' ? LRH.gold : LRH.navy;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${accentColor}`,
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
        {isEdit ? '▸ Modifier le club' : '▸ Nouveau club'}
      </div>

      {/* Type */}
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Type *</FieldLabel>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['STANDALONE', 'ENTENTE'] as const).map((k) => {
            const isActive = form.kind === k;
            const bg = k === 'ENTENTE' ? LRH.gold : LRH.navy;
            const fg = k === 'ENTENTE' ? LRH.navy : '#fff';
            return (
              <button
                key={k}
                type="button"
                onClick={() => setForm({ ...form, kind: k, parentClubIds: k === 'STANDALONE' ? [] : form.parentClubIds })}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 4,
                  background: isActive ? bg : '#fff',
                  color: isActive ? fg : LRH.ink2,
                  border: `1px solid ${isActive ? bg : LRH.hairStrong}`,
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
                    background: isActive ? fg : bg,
                  }}
                />
                {k === 'STANDALONE' ? 'Club individuel' : 'Entente'}
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
          {form.kind === 'ENTENTE'
            ? 'Une entente regroupe au moins 2 clubs membres. Elle joue comme une équipe unique en compétition.'
            : 'Un club autonome, qui peut ensuite rejoindre une entente.'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Nom *</FieldLabel>
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={form.kind === 'ENTENTE' ? 'Entente Port – Saint-Paul' : 'Hockey Club de l\'Ouest'}
          />
        </div>
        <div>
          <FieldLabel>Ville *</FieldLabel>
          <input
            style={inputStyle}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Le Port"
          />
        </div>
        <div>
          <FieldLabel>Code court</FieldLabel>
          <input
            style={inputStyle}
            value={form.shortCode}
            onChange={(e) => setForm({ ...form, shortCode: e.target.value.toUpperCase() })}
            placeholder="HCO"
            maxLength={6}
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Slug (URL) — auto si vide</FieldLabel>
        <input
          style={inputStyle}
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="auto"
        />
      </div>

      {/* Position sur la carte */}
      <div
        style={{
          marginBottom: 14,
          padding: 14,
          background: LRH.paperWarm,
          border: '1px solid ' + LRH.hair,
          borderLeft: `3px solid ${
            latLonStatus === 'valid'
              ? '#1d6b3f'
              : latLonStatus === 'empty'
                ? LRH.hairStrong
                : LRH.red
          }`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
          <FieldLabel>Position sur la carte (optionnel)</FieldLabel>
          <span
            style={{
              ...mono,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:
                latLonStatus === 'valid'
                  ? '#1d6b3f'
                  : latLonStatus === 'empty'
                    ? LRH.mute
                    : LRH.red,
            }}
          >
            {latLonStatus === 'valid' && '✓ Position personnalisée'}
            {latLonStatus === 'empty' && '○ Fallback : centre commune'}
            {latLonStatus === 'partial' && '⚠ Lat ET lon requis'}
            {latLonStatus === 'invalid' && '⚠ Coordonnées invalides'}
            {latLonStatus === 'off-island' && '⚠ Hors de La Réunion'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel>Latitude</FieldLabel>
            <input
              style={inputStyle}
              value={form.latitude}
              onChange={(e) => onLatitudeInput(e.target.value)}
              placeholder="-21.0096"
              inputMode="decimal"
            />
          </div>
          <div>
            <FieldLabel>Longitude</FieldLabel>
            <input
              style={inputStyle}
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              placeholder="55.2706"
              inputMode="decimal"
            />
          </div>
        </div>
        <div
          style={{
            ...mono,
            fontSize: 10,
            color: LRH.mute,
            letterSpacing: '0.08em',
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          Sur Google Maps, clic droit sur le stade ou siège du club → la première
          ligne du menu copie directement « lat, lon » dans le presse-papier.
          Collez la chaîne entière dans le champ latitude : les deux valeurs sont
          extraites automatiquement.
        </div>
      </div>

      {/* Clubs membres (uniquement si ENTENTE) */}
      {form.kind === 'ENTENTE' && (
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Clubs membres * ({form.parentClubIds.length} sélectionné{form.parentClubIds.length > 1 ? 's' : ''})</FieldLabel>
          {eligibleParents.length === 0 ? (
            <div
              style={{
                padding: 12,
                background: 'rgba(243,188,28,0.08)',
                border: '1px dashed ' + LRH.gold,
                ...body,
                fontSize: 12.5,
                color: LRH.ink2,
              }}
            >
              Aucun club individuel disponible — créez d'abord au moins 2 clubs individuels avant de constituer une entente.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 8,
                padding: 10,
                background: LRH.paperWarm,
                border: '1px solid ' + LRH.hair,
              }}
            >
              {eligibleParents.map((c) => {
                const checked = form.parentClubIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleParent(c.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      background: checked ? LRH.navy : '#fff',
                      color: checked ? '#fff' : LRH.ink,
                      border: `1px solid ${checked ? LRH.navy : LRH.hairStrong}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        background: checked ? LRH.gold : 'transparent',
                        border: `1px solid ${checked ? LRH.gold : LRH.hairStrong}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: LRH.navy,
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {checked ? '✓' : ''}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          ...display,
                          fontWeight: 700,
                          fontSize: 13,
                          letterSpacing: '-0.005em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.name}
                      </div>
                      <div
                        style={{
                          ...mono,
                          fontSize: 9.5,
                          color: checked ? 'rgba(255,255,255,0.6)' : LRH.mute,
                          letterSpacing: '0.08em',
                          marginTop: 2,
                        }}
                      >
                        {c.shortCode ?? '—'} · {c.city}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

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

export function ClubsAdmin({ initialClubs }: { initialClubs: ClubAdminRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);

  const refresh = () => {
    setEditing(null);
    router.refresh();
  };

  const onDelete = async (row: ClubAdminRow) => {
    if (!confirm(`Supprimer le club "${row.name}" ?`)) return;
    try {
      await deleteClub(row.id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur de suppression');
    }
  };

  const standalone = initialClubs.filter((c) => c.kind === 'STANDALONE');
  const ententes = initialClubs.filter((c) => c.kind === 'ENTENTE');

  return (
    <div>
      {editing && (
        <ClubForm
          initial={editing}
          allClubs={initialClubs}
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
          + Nouveau club
        </button>
      )}

      {initialClubs.length === 0 && !editing ? (
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
            Aucun club enregistré. Créez d'abord les clubs individuels, puis éventuellement des ententes.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <ClubGroup
            title="Clubs individuels"
            list={standalone}
            accent={LRH.navy}
            onEdit={(c) =>
              setEditing({
                id: c.id,
                name: c.name,
                slug: c.slug,
                shortCode: c.shortCode ?? '',
                city: c.city,
                kind: c.kind as Kind,
                parentClubIds: c.parentClubs.map((p) => p.id),
                latitude: c.latitude == null ? '' : String(c.latitude),
                longitude: c.longitude == null ? '' : String(c.longitude),
              })
            }
            onDelete={onDelete}
          />
          {ententes.length > 0 && (
            <ClubGroup
              title="Ententes"
              list={ententes}
              accent={LRH.gold}
              onEdit={(c) =>
                setEditing({
                  id: c.id,
                  name: c.name,
                  slug: c.slug,
                  shortCode: c.shortCode ?? '',
                  city: c.city,
                  kind: c.kind as Kind,
                  parentClubIds: c.parentClubs.map((p) => p.id),
                  latitude: c.latitude == null ? '' : String(c.latitude),
                  longitude: c.longitude == null ? '' : String(c.longitude),
                })
              }
              onDelete={onDelete}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ClubGroup({
  title,
  list,
  accent,
  onEdit,
  onDelete,
}: {
  title: string;
  list: ClubAdminRow[];
  accent: string;
  onEdit: (c: ClubAdminRow) => void;
  onDelete: (c: ClubAdminRow) => void;
}) {
  if (list.length === 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
        <div style={{ width: 14, height: 2, background: accent }} />
        <div
          style={{
            ...display,
            fontWeight: 700,
            fontSize: 18,
            color: LRH.navy,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
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
          {list.length.toString().padStart(2, '0')}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((c) => (
          <div
            key={c.id}
            style={{
              background: '#fff',
              border: '1px solid ' + LRH.hair,
              borderLeft: `3px solid ${accent}`,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <ClubCrest id={c.shortCode ?? undefined} size={36} />
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
                {c.name}
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
                {c.shortCode ?? '—'} · {c.city} · slug:{c.slug}
              </div>
              {c.kind === 'ENTENTE' && c.parentClubs.length > 0 && (
                <div
                  style={{
                    ...mono,
                    fontSize: 10,
                    color: LRH.ink2,
                    letterSpacing: '0.06em',
                    marginTop: 4,
                  }}
                >
                  ⊂ {c.parentClubs.map((p) => p.shortCode ?? p.name).join(' + ')}
                </div>
              )}
              <div
                style={{
                  ...mono,
                  fontSize: 9.5,
                  color: LRH.mute,
                  letterSpacing: '0.08em',
                  marginTop: 4,
                }}
              >
                {c._count.users} compte(s) · {c._count.members} licencié(s) ·{' '}
                {c._count.homeMatches + c._count.awayMatches} match(s) ·{' '}
                {c._count.competitionEntries} inscription(s)
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => onEdit(c)}
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
                onClick={() => onDelete(c)}
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
  );
}
