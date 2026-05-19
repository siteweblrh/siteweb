'use client';

import React, { useState } from 'react';
import { LRH, mono, display, body } from '@/components/lrh/tokens';
import { useRouter } from 'next/navigation';
import type { CommissionRow } from '@/lib/queries/ligue';
import {
  createCommission, updateCommission, deleteCommission,
  createCommissionMember, updateCommissionMember, deleteCommissionMember,
  type CommissionInput, type CommissionMemberInput,
} from '@/lib/actions/ligue';
import { ImageUploader } from '@/components/lrh/upload/ImageUploader';

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

const btnPrimary: React.CSSProperties = {
  ...body, fontSize: 12.5, fontWeight: 700,
  padding: '10px 18px', borderRadius: 4,
  background: LRH.navy, color: '#fff',
  border: 'none', cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

const btnGhost: React.CSSProperties = {
  ...body, fontSize: 12.5, fontWeight: 700,
  padding: '10px 18px', borderRadius: 4,
  background: 'transparent', color: LRH.mute,
  border: '1px solid ' + LRH.hairStrong, cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

/* ── COMMISSION FORM ─────────────────────────────────────────── */

function CommissionForm({
  initial, onCancel, onDone,
}: { initial: (Partial<CommissionInput> & { id?: string }); onCancel: () => void; onDone: () => void }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial.id);

  const submit = async () => {
    if (!form.name?.trim()) { setError('Nom requis.'); return; }
    setSaving(true); setError(null);
    try {
      const payload: CommissionInput = {
        name: form.name!.trim(),
        slug: form.slug?.trim() || undefined,
        description: form.description || null,
        mission: form.mission || null,
        order: Number(form.order ?? 0),
      };
      if (isEdit && initial.id) await updateCommission(initial.id, payload);
      else await createCommission(payload);
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally { setSaving(false); }
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
      }}>{isEdit ? '▸ Modifier la commission' : '▸ Nouvelle commission'}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Nom *</FieldLabel>
          <input style={inputStyle} value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Commission Sportive" />
        </div>
        <div>
          <FieldLabel>Slug</FieldLabel>
          <input style={inputStyle} value={form.slug ?? ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto si vide" />
        </div>
        <div>
          <FieldLabel>Ordre</FieldLabel>
          <input type="number" style={inputStyle} value={form.order ?? 0} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Description courte</FieldLabel>
        <input style={inputStyle} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Une ligne qui résume la commission" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Mission (texte long)</FieldLabel>
        <textarea
          style={{ ...inputStyle, minHeight: 100, fontFamily: 'inherit', resize: 'vertical' }}
          value={form.mission ?? ''}
          onChange={(e) => setForm({ ...form, mission: e.target.value })}
          placeholder="Détail des missions, prérogatives, périmètre…"
        />
      </div>

      {error && (
        <div style={{ ...mono, fontSize: 11, color: LRH.red, marginBottom: 12 }}>⚠ {error}</div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={submit} disabled={saving} style={btnPrimary}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button onClick={onCancel} disabled={saving} style={btnGhost}>Annuler</button>
      </div>
    </div>
  );
}

/* ── COMMISSION MEMBER FORM ──────────────────────────────────── */

function MemberForm({
  commissionId, initial, onCancel, onDone,
}: {
  commissionId: string;
  initial: (Partial<CommissionMemberInput> & { id?: string });
  onCancel: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ ...initial, commissionId });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial.id);

  const submit = async () => {
    if (!form.fullName?.trim() || !form.role?.trim()) { setError('Nom et rôle requis.'); return; }
    setSaving(true); setError(null);
    try {
      const payload: CommissionMemberInput = {
        fullName: form.fullName!.trim(),
        role: form.role!.trim(),
        order: Number(form.order ?? 0),
        photo: form.photo || null,
        email: form.email || null,
        commissionId,
      };
      if (isEdit && initial.id) await updateCommissionMember(initial.id, payload);
      else await createCommissionMember(payload);
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      background: LRH.paper, border: '1px solid ' + LRH.hairStrong,
      padding: 16, marginBottom: 10,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 10, marginBottom: 10 }}>
        <div>
          <FieldLabel>Nom *</FieldLabel>
          <input style={inputStyle} value={form.fullName ?? ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Rôle *</FieldLabel>
          <input style={inputStyle} value={form.role ?? ''} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Président, Membre…" />
        </div>
        <div>
          <FieldLabel>Ordre</FieldLabel>
          <input type="number" style={inputStyle} value={form.order ?? 0} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <FieldLabel>Email</FieldLabel>
        <input style={inputStyle} type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <ImageUploader
          label="Photo"
          value={form.photo}
          onChange={(url) => setForm({ ...form, photo: url ?? '' })}
          height={140}
        />
      </div>
      {error && <div style={{ ...mono, fontSize: 11, color: LRH.red, marginBottom: 10 }}>⚠ {error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} disabled={saving} style={{ ...btnPrimary, padding: '8px 14px', fontSize: 11.5 }}>
          {saving ? '…' : 'Enregistrer'}
        </button>
        <button onClick={onCancel} disabled={saving} style={{ ...btnGhost, padding: '8px 14px', fontSize: 11.5 }}>Annuler</button>
      </div>
    </div>
  );
}

/* ── PANEL ───────────────────────────────────────────────────── */

function CommissionPanel({
  c, isOpen, onToggle, onEdit, onDelete, refresh,
}: {
  c: CommissionRow;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  refresh: () => void;
}) {
  const [memberForm, setMemberForm] = useState<(Partial<CommissionMemberInput> & { id?: string }) | null>(null);

  const onDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Retirer "${name}" de la commission ?`)) return;
    try { await deleteCommissionMember(id); refresh(); } catch (e: any) { alert(e?.message || 'Erreur'); }
  };

  return (
    <div style={{
      background: '#fff', border: '1px solid ' + LRH.hair,
      borderLeft: '3px solid ' + LRH.gold,
    }}>
      <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onToggle} style={{
          all: 'unset', cursor: 'pointer',
          flex: 1, minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 32, height: 32, flexShrink: 0,
              background: LRH.paperWarm, color: LRH.navy,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...mono, fontWeight: 800, fontSize: 12,
            }}>{c.order.toString().padStart(2, '0')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Commission · {c.slug}</div>
              <div style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy, marginTop: 2 }}>{c.name}</div>
            </div>
            <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>{c.members.length.toString().padStart(2, '0')} membres</div>
            <div style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isOpen ? LRH.navy : LRH.paperWarm, color: isOpen ? '#fff' : LRH.navy,
              ...display, fontWeight: 800, fontSize: 14,
              transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s',
            }}>+</div>
          </div>
        </button>
        <button onClick={onEdit} style={{
          ...body, fontSize: 11.5, fontWeight: 700,
          padding: '6px 12px', borderRadius: 4,
          background: 'transparent', color: LRH.navy,
          border: '1px solid ' + LRH.navy, cursor: 'pointer',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Édit.</button>
        <button onClick={onDelete} style={{
          ...body, fontSize: 11.5, fontWeight: 700,
          padding: '6px 12px', borderRadius: 4,
          background: 'transparent', color: LRH.red,
          border: '1px solid ' + LRH.red, cursor: 'pointer',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Suppr.</button>
      </div>

      {isOpen && (
        <div style={{ borderTop: '1px solid ' + LRH.hair, padding: 20, background: LRH.paper }}>
          {c.description && <div style={{ ...body, fontSize: 13, color: LRH.ink2, marginBottom: 16 }}>{c.description}</div>}

          <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>▸ Membres</div>

          {memberForm && (
            <MemberForm
              commissionId={c.id}
              initial={memberForm}
              onCancel={() => setMemberForm(null)}
              onDone={() => { setMemberForm(null); refresh(); }}
            />
          )}

          {!memberForm && (
            <button onClick={() => setMemberForm({ fullName: '', role: 'Membre', order: 0, photo: '', email: '' })} style={{
              ...body, fontSize: 11.5, fontWeight: 700,
              padding: '8px 14px', borderRadius: 4,
              background: LRH.red, color: '#fff',
              border: 'none', cursor: 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              marginBottom: 14,
            }}>+ Ajouter un membre</button>
          )}

          {c.members.length === 0 && !memberForm ? (
            <div style={{ ...body, fontSize: 12.5, color: LRH.mute, fontStyle: 'italic' }}>Aucun membre.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.members.map((m) => (
                <div key={m.id} style={{
                  background: '#fff', border: '1px solid ' + LRH.hair,
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 26, height: 26, flexShrink: 0,
                    background: LRH.paperWarm, color: LRH.navy,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    ...mono, fontWeight: 800, fontSize: 10,
                  }}>{m.order.toString().padStart(2, '0')}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...display, fontWeight: 700, fontSize: 14, color: LRH.navy }}>{m.fullName}</div>
                    <div style={{ ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>{m.role}{m.email ? ` · ${m.email}` : ''}</div>
                  </div>
                  <button onClick={() => setMemberForm({
                    id: m.id, fullName: m.fullName, role: m.role,
                    order: m.order, photo: m.photo ?? '', email: m.email ?? '',
                  })} style={{
                    ...body, fontSize: 11, fontWeight: 700,
                    padding: '5px 10px', borderRadius: 4,
                    background: 'transparent', color: LRH.navy,
                    border: '1px solid ' + LRH.navy, cursor: 'pointer',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>Édit.</button>
                  <button onClick={() => onDeleteMember(m.id, m.fullName)} style={{
                    ...body, fontSize: 11, fontWeight: 700,
                    padding: '5px 10px', borderRadius: 4,
                    background: 'transparent', color: LRH.red,
                    border: '1px solid ' + LRH.red, cursor: 'pointer',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CommissionsAdmin({ initialCommissions }: { initialCommissions: CommissionRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState<(Partial<CommissionInput> & { id?: string }) | null>(null);
  const [openId, setOpenId] = useState<string | null>(initialCommissions[0]?.id ?? null);

  const refresh = () => { setCreating(null); router.refresh(); };

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer la commission "${name}" et tous ses membres ?`)) return;
    try { await deleteCommission(id); router.refresh(); } catch (e: any) { alert(e?.message || 'Erreur'); }
  };

  return (
    <div>
      {creating && (
        <CommissionForm initial={creating} onCancel={() => setCreating(null)} onDone={refresh} />
      )}

      {!creating && (
        <button onClick={() => setCreating({ name: '', order: 0 })} style={{
          ...body, fontSize: 12.5, fontWeight: 700,
          padding: '12px 20px', borderRadius: 4,
          background: LRH.red, color: '#fff', border: 'none',
          cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 20,
        }}>+ Nouvelle commission</button>
      )}

      {initialCommissions.length === 0 && !creating ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#fff', border: '1px dashed ' + LRH.hairStrong }}>
          <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>[ vide ]</div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>Aucune commission créée.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {initialCommissions.map((c) => (
            <CommissionPanel
              key={c.id}
              c={c}
              isOpen={openId === c.id}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
              onEdit={() => setCreating({
                id: c.id, name: c.name, slug: c.slug,
                description: c.description ?? '', mission: c.mission ?? '',
                order: c.order,
              })}
              onDelete={() => onDelete(c.id, c.name)}
              refresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
