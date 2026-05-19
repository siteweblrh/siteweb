'use client';

import React, { useState } from 'react';
import { LRH, mono, display, body } from '@/components/lrh/tokens';
import { useRouter } from 'next/navigation';
import type { BureauMemberRow } from '@/lib/queries/ligue';
import {
  createBureauMember, updateBureauMember, deleteBureauMember,
  type BureauMemberInput,
} from '@/lib/actions/ligue';
import { ImageUploader } from '@/components/lrh/upload/ImageUploader';

type FormState = Partial<BureauMemberInput> & { id?: string };

const EMPTY_FORM: FormState = {
  fullName: '', role: '', order: 0,
  photo: '', email: '', phone: '', bio: '',
};

const BUREAU_ROLES = [
  'Président',
  'Présidente',
  'Vice-Président',
  'Vice-Présidente',
  'Secrétaire général',
  'Secrétaire générale',
  'Secrétaire adjoint',
  'Secrétaire adjointe',
  'Trésorier',
  'Trésorière',
  'Trésorier adjoint',
  'Trésorière adjointe',
  'Membre du bureau',
] as const;

const CUSTOM_ROLE = '__custom__';

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

function MemberForm({
  initial, onCancel, onDone,
}: { initial: FormState; onCancel: () => void; onDone: () => void }) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomRole, setUseCustomRole] = useState<boolean>(
    Boolean(initial.role) && !(BUREAU_ROLES as readonly string[]).includes(initial.role!),
  );

  const isEdit = Boolean(initial.id);

  const submit = async () => {
    if (!form.fullName?.trim() || !form.role?.trim()) {
      setError('Nom et rôle sont obligatoires.');
      return;
    }
    setSaving(true); setError(null);
    try {
      const payload = {
        fullName: form.fullName!.trim(),
        role: form.role!.trim(),
        order: Number(form.order ?? 0),
        photo: form.photo || null,
        email: form.email || null,
        phone: form.phone || null,
        bio: form.bio || null,
        startedAt: form.startedAt || null,
      } as BureauMemberInput;
      if (isEdit && initial.id) {
        await updateBureauMember(initial.id, payload);
      } else {
        await createBureauMember(payload);
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
      }}>{isEdit ? '▸ Modifier' : '▸ Nouveau membre'}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Nom complet *</FieldLabel>
          <input style={inputStyle} value={form.fullName ?? ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Marie Dupont" />
        </div>
        <div>
          <FieldLabel>Poste *</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={useCustomRole ? CUSTOM_ROLE : (form.role ?? '')}
            onChange={(e) => {
              const v = e.target.value;
              if (v === CUSTOM_ROLE) {
                setUseCustomRole(true);
                setForm({ ...form, role: '' });
              } else {
                setUseCustomRole(false);
                setForm({ ...form, role: v });
              }
            }}
          >
            <option value="">— Choisir un poste —</option>
            {BUREAU_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value={CUSTOM_ROLE}>Autre (préciser)…</option>
          </select>
        </div>
        <div>
          <FieldLabel>Ordre</FieldLabel>
          <input type="number" style={inputStyle} value={form.order ?? 0} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} />
        </div>
      </div>

      {useCustomRole && (
        <div style={{ marginBottom: 14, paddingLeft: 14, borderLeft: '2px solid ' + LRH.gold }}>
          <FieldLabel>Intitulé personnalisé du poste *</FieldLabel>
          <input
            style={inputStyle}
            value={form.role ?? ''}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Ex. Secrétaire adjoint chargé du protocole"
            autoFocus
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Email</FieldLabel>
          <input style={inputStyle} type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="m.dupont@lrh.re" />
        </div>
        <div>
          <FieldLabel>Téléphone</FieldLabel>
          <input style={inputStyle} value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+262 692 00 00 00" />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <ImageUploader
          label="Photo"
          value={form.photo}
          onChange={(url) => setForm({ ...form, photo: url ?? '' })}
          hint="Glissez une photo, cliquez pour parcourir, ou collez une URL existante."
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Bio courte</FieldLabel>
        <textarea
          style={{ ...inputStyle, minHeight: 80, fontFamily: 'inherit', resize: 'vertical' }}
          value={form.bio ?? ''}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Quelques lignes sur le parcours…"
        />
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

export function BureauAdmin({ initialMembers }: { initialMembers: BureauMemberRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);

  const refresh = () => { setEditing(null); router.refresh(); };

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" du bureau ?`)) return;
    try {
      await deleteBureauMember(id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur de suppression');
    }
  };

  return (
    <div>
      {editing && (
        <MemberForm
          initial={editing}
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
        }}>+ Ajouter un membre</button>
      )}

      {initialMembers.length === 0 && !editing ? (
        <div style={{
          padding: 48, textAlign: 'center', background: '#fff',
          border: '1px dashed ' + LRH.hairStrong,
        }}>
          <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>[ vide ]</div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>Bureau non encore renseigné.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {initialMembers.map((m) => (
            <div key={m.id} style={{
              background: '#fff', border: '1px solid ' + LRH.hair,
              borderLeft: '3px solid ' + LRH.navy,
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 30, height: 30, flexShrink: 0,
                background: LRH.paperWarm, color: LRH.navy,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                ...mono, fontWeight: 800, fontSize: 11, letterSpacing: '0.04em',
              }}>{m.order.toString().padStart(2, '0')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>{m.role}</div>
                <div style={{ ...display, fontWeight: 700, fontSize: 16, color: LRH.navy, letterSpacing: '-0.01em' }}>{m.fullName}</div>
                <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.06em', marginTop: 4 }}>
                  {[m.email, m.phone].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditing({
                  id: m.id, fullName: m.fullName, role: m.role, order: m.order,
                  photo: m.photo ?? '', email: m.email ?? '', phone: m.phone ?? '',
                  bio: m.bio ?? '',
                })} style={{
                  ...body, fontSize: 11.5, fontWeight: 700,
                  padding: '7px 14px', borderRadius: 4,
                  background: 'transparent', color: LRH.navy,
                  border: '1px solid ' + LRH.navy, cursor: 'pointer',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>Modifier</button>
                <button onClick={() => onDelete(m.id, m.fullName)} style={{
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
      )}
    </div>
  );
}
