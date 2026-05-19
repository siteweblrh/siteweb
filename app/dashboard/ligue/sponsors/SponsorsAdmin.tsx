'use client';

import React, { useState, useMemo } from 'react';
import { LRH, mono, display, body } from '@/components/lrh/tokens';
import { useRouter } from 'next/navigation';
import type { SponsorAdminRow, ClubPickerRow } from '@/lib/queries/sponsor';
import {
  createSponsor, updateSponsor, deleteSponsor,
  type SponsorInput,
} from '@/lib/actions/sponsor';
import { ImageUploader } from '@/components/lrh/upload/ImageUploader';

type Scope = 'LIGUE' | 'CLUB' | 'EVENT';
type FormState = {
  id?: string;
  name: string;
  logo: string;
  website: string;
  scope: Scope;
  clubId: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  logo: '',
  website: '',
  scope: 'LIGUE',
  clubId: '',
};

const SCOPE_LABELS: Record<Scope, string> = {
  LIGUE: 'Ligue',
  CLUB: 'Club',
  EVENT: 'Événement',
};

function scopeColors(scope: Scope): { bg: string; fg: string } {
  switch (scope) {
    case 'LIGUE': return { bg: LRH.gold, fg: LRH.navy };
    case 'CLUB':  return { bg: LRH.navy, fg: '#fff' };
    case 'EVENT': return { bg: LRH.red,  fg: '#fff' };
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      ...mono, fontSize: 10, fontWeight: 700,
      color: LRH.mute, letterSpacing: '0.14em',
      textTransform: 'uppercase', display: 'block', marginBottom: 6,
    }}>{children}</label>
  );
}

const inputStyle: React.CSSProperties = {
  ...body, fontSize: 14,
  padding: '10px 12px', width: '100%',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4, background: '#fff',
  color: LRH.ink,
};

function ScopeBadge({ scope }: { scope: Scope }) {
  const c = scopeColors(scope);
  return (
    <span style={{
      ...mono, fontSize: 10, fontWeight: 800,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      background: c.bg, color: c.fg,
      padding: '4px 10px',
    }}>{SCOPE_LABELS[scope]}</span>
  );
}

function ScopeRadio({
  value, current, onChange, label,
}: { value: Scope; current: Scope; onChange: (s: Scope) => void; label: string }) {
  const selected = value === current;
  const c = scopeColors(value);
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      style={{
        ...mono, fontSize: 11, fontWeight: 800,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        padding: '10px 16px', borderRadius: 4, cursor: 'pointer',
        background: selected ? c.bg : 'transparent',
        color: selected ? c.fg : LRH.mute,
        border: '1px solid ' + (selected ? c.bg : LRH.hairStrong),
        transition: 'all 0.15s ease',
      }}
    >{label}</button>
  );
}

function SponsorForm({
  initial, clubs, onCancel, onDone,
}: {
  initial: FormState;
  clubs: ClubPickerRow[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(initial.id);

  const submit = async () => {
    if (!form.name.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    if (form.scope === 'CLUB' && !form.clubId) {
      setError('Sélectionnez le club rattaché pour un sponsor de scope CLUB.');
      return;
    }
    const website = form.website.trim();
    if (website && !/^https?:\/\//i.test(website)) {
      setError("L'URL du site doit commencer par https:// (ou http://).");
      return;
    }
    setSaving(true); setError(null);
    try {
      const payload: SponsorInput = {
        name: form.name.trim(),
        logo: form.logo || null,
        website: website || null,
        scope: form.scope,
        clubId: form.scope === 'CLUB' ? form.clubId : null,
      };
      if (isEdit && initial.id) {
        await updateSponsor(initial.id, payload);
      } else {
        await createSponsor(payload);
      }
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      background: '#fff', border: '1px solid ' + LRH.hair,
      borderLeft: '3px solid ' + LRH.gold,
      padding: 24, marginBottom: 16,
    }}>
      <div style={{
        ...mono, fontSize: 11, fontWeight: 700,
        color: LRH.red, letterSpacing: '0.18em',
        textTransform: 'uppercase', marginBottom: 16,
      }}>{isEdit ? '▸ Modifier le sponsor' : '▸ Nouveau sponsor'}</div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Nom *</FieldLabel>
        <input
          style={inputStyle}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ex. Crédit Agricole Réunion"
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Portée *</FieldLabel>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <ScopeRadio value="LIGUE" current={form.scope} onChange={(s) => setForm({ ...form, scope: s })} label="Ligue" />
          <ScopeRadio value="CLUB"  current={form.scope} onChange={(s) => setForm({ ...form, scope: s })} label="Club" />
          <ScopeRadio value="EVENT" current={form.scope} onChange={(s) => setForm({ ...form, scope: s })} label="Événement" />
        </div>
        <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.08em', marginTop: 8 }}>
          Ligue = footer du site · Club = fiche club · Événement = match ou compétition spécifique
        </div>
      </div>

      {form.scope === 'CLUB' && (
        <div style={{ marginBottom: 14, paddingLeft: 14, borderLeft: '2px solid ' + LRH.gold }}>
          <FieldLabel>Club rattaché *</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.clubId}
            onChange={(e) => setForm({ ...form, clubId: e.target.value })}
          >
            <option value="">— Choisir un club —</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <ImageUploader
          label="Logo"
          value={form.logo}
          onChange={(url) => setForm({ ...form, logo: url ?? '' })}
          hint="Glissez le logo (PNG/SVG recommandé, fond transparent), cliquez pour parcourir, ou collez une URL."
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Site web du sponsor</FieldLabel>
        <input
          style={inputStyle}
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://www.exemple.fr"
          type="url"
          inputMode="url"
        />
        <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.08em', marginTop: 6 }}>
          Quand renseigné, le logo devient cliquable dans le footer et sur les fiches club.
        </div>
      </div>

      {error && (
        <div style={{
          ...mono, fontSize: 11, color: LRH.red,
          letterSpacing: '0.1em', marginBottom: 12, padding: '8px 12px',
          background: 'rgba(168,32,47,0.08)', border: '1px solid rgba(168,32,47,0.2)',
        }}>⚠ {error}</div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={submit} disabled={saving} style={{
          ...body, fontSize: 12.5, fontWeight: 700,
          padding: '10px 18px', borderRadius: 4,
          background: saving ? LRH.mute : LRH.navy, color: '#fff',
          border: 'none', cursor: saving ? 'wait' : 'pointer',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button onClick={onCancel} disabled={saving} style={{
          ...body, fontSize: 12.5, fontWeight: 700,
          padding: '10px 18px', borderRadius: 4,
          background: 'transparent', color: LRH.mute,
          border: '1px solid ' + LRH.hairStrong, cursor: 'pointer',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Annuler</button>
      </div>
    </div>
  );
}

export function SponsorsAdmin({
  initialSponsors, clubs,
}: { initialSponsors: SponsorAdminRow[]; clubs: ClubPickerRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);

  const grouped = useMemo(() => {
    const buckets: Record<Scope, SponsorAdminRow[]> = { LIGUE: [], CLUB: [], EVENT: [] };
    for (const s of initialSponsors) buckets[s.scope as Scope].push(s);
    return buckets;
  }, [initialSponsors]);

  const refresh = () => { setEditing(null); router.refresh(); };

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le sponsor "${name}" ?`)) return;
    try {
      await deleteSponsor(id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur de suppression');
    }
  };

  return (
    <div>
      {editing && (
        <SponsorForm
          initial={editing}
          clubs={clubs}
          onCancel={() => setEditing(null)}
          onDone={refresh}
        />
      )}

      {!editing && (
        <button onClick={() => setEditing({ ...EMPTY_FORM })} style={{
          ...body, fontSize: 12.5, fontWeight: 700,
          padding: '12px 20px', borderRadius: 4,
          background: LRH.red, color: '#fff',
          border: 'none', cursor: 'pointer',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 20,
        }}>+ Ajouter un sponsor</button>
      )}

      {initialSponsors.length === 0 && !editing ? (
        <div style={{
          padding: 48, textAlign: 'center', background: '#fff',
          border: '1px dashed ' + LRH.hairStrong,
        }}>
          <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>[ vide ]</div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>Aucun sponsor enregistré pour le moment.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {(['LIGUE', 'CLUB', 'EVENT'] as Scope[]).map((scope) => {
            const rows = grouped[scope];
            if (rows.length === 0) return null;
            const accent = scopeColors(scope);
            return (
              <div key={scope}>
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 10,
                  paddingBottom: 8, marginBottom: 12,
                  borderBottom: '1px dashed ' + LRH.hairStrong,
                }}>
                  <div style={{
                    ...mono, fontSize: 11, fontWeight: 800,
                    color: LRH.navy, letterSpacing: '0.18em', textTransform: 'uppercase',
                  }}>{SCOPE_LABELS[scope]}</div>
                  <div style={{
                    ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.08em',
                  }}>· {rows.length} sponsor{rows.length > 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rows.map((s) => (
                    <div key={s.id} style={{
                      background: '#fff', border: '1px solid ' + LRH.hair,
                      borderLeft: '3px solid ' + accent.bg,
                      padding: '14px 18px',
                      display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{
                        width: 60, height: 60, flexShrink: 0,
                        background: LRH.paperWarm,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid ' + LRH.hair,
                        overflow: 'hidden',
                      }}>
                        {s.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.logo} alt={s.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.1em' }}>NO LOGO</div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...display, fontWeight: 700, fontSize: 16, color: LRH.navy, letterSpacing: '-0.01em' }}>{s.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                          <ScopeBadge scope={s.scope as Scope} />
                          {s.scope === 'CLUB' && s.club && (
                            <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.08em' }}>
                              ↳ {s.club.name}
                            </div>
                          )}
                          {s.website && (
                            <a
                              href={s.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                ...mono, fontSize: 10, fontWeight: 700,
                                color: LRH.navy, letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                borderBottom: '1px solid ' + LRH.gold,
                                paddingBottom: 1,
                                textDecoration: 'none',
                              }}
                            >↗ {s.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditing({
                          id: s.id,
                          name: s.name,
                          logo: s.logo ?? '',
                          website: s.website ?? '',
                          scope: s.scope as Scope,
                          clubId: s.clubId ?? '',
                        })} style={{
                          ...body, fontSize: 11.5, fontWeight: 700,
                          padding: '7px 14px', borderRadius: 4,
                          background: 'transparent', color: LRH.navy,
                          border: '1px solid ' + LRH.navy, cursor: 'pointer',
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>Modifier</button>
                        <button onClick={() => onDelete(s.id, s.name)} style={{
                          ...body, fontSize: 11.5, fontWeight: 700,
                          padding: '7px 14px', borderRadius: 4,
                          background: 'transparent', color: LRH.red,
                          border: '1px solid ' + LRH.red, cursor: 'pointer',
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>Suppr.</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
