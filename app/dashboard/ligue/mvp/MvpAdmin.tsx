'use client';

import React, { useMemo, useState } from 'react';
import { LRH, mono, display, body } from '@/components/lrh/tokens';
import { useRouter } from 'next/navigation';
import type { PlayerOfMonthRow, MemberPickerRow } from '@/lib/queries/ligue';
import {
  createPlayerOfMonth, updatePlayerOfMonth, deletePlayerOfMonth,
  type PlayerOfMonthInput,
} from '@/lib/actions/ligue';
import { ImageUploader } from '@/components/lrh/upload/ImageUploader';

type FormState = {
  id?: string;
  mode: 'GAZON' | 'SALLE';
  memberId: string;
  periodLabel: string;
  effectiveAt: string;
  photo: string;
  goals: string;
  assists: string;
  extraStatLabel: string;
  extraStatValue: string;
  sponsor: string;
  quote: string;
};

function emptyForm(mode: 'GAZON' | 'SALLE'): FormState {
  return {
    mode,
    memberId: '',
    periodLabel: '',
    effectiveAt: new Date().toISOString().slice(0, 10),
    photo: '',
    goals: '',
    assists: '',
    extraStatLabel: '',
    extraStatValue: '',
    sponsor: '',
    quote: '',
  };
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

function MvpForm({
  initial, members, onCancel, onDone,
}: {
  initial: FormState;
  members: MemberPickerRow[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(initial.id);

  const submit = async () => {
    if (!form.memberId) { setError('Sélectionnez un joueur.'); return; }
    if (!form.periodLabel.trim()) { setError('Période requise (ex. Avril 2026).'); return; }
    if (!form.effectiveAt) { setError('Date d\'effet requise.'); return; }
    setSaving(true); setError(null);
    try {
      const payload: PlayerOfMonthInput = {
        mode: form.mode,
        memberId: form.memberId,
        periodLabel: form.periodLabel.trim(),
        effectiveAt: new Date(form.effectiveAt),
        photo: form.photo || null,
        goals: form.goals === '' ? null : Number(form.goals),
        assists: form.assists === '' ? null : Number(form.assists),
        extraStatLabel: form.extraStatLabel || null,
        extraStatValue: form.extraStatValue || null,
        sponsor: form.sponsor || null,
        quote: form.quote || null,
      };
      if (isEdit && initial.id) {
        await updatePlayerOfMonth(initial.id, payload);
      } else {
        await createPlayerOfMonth(payload);
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
      }}>{isEdit ? '▸ Modifier la nomination' : '▸ Nouvelle nomination'}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Mode *</FieldLabel>
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
          <FieldLabel>Joueur *</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
          >
            <option value="">— Sélectionner un joueur —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.lastName.toUpperCase()} {m.firstName}
                {m.club ? ` · ${m.club.name}` : ''}
                {m.jerseyNumber != null ? ` · #${m.jerseyNumber}` : ''}
                {m.position ? ` · ${m.position}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Date d'effet *</FieldLabel>
          <input
            type="date"
            style={inputStyle}
            value={form.effectiveAt}
            onChange={(e) => setForm({ ...form, effectiveAt: e.target.value })}
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Période affichée *</FieldLabel>
        <input
          style={inputStyle}
          value={form.periodLabel}
          onChange={(e) => setForm({ ...form, periodLabel: e.target.value })}
          placeholder="Ex. Avril 2026"
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <ImageUploader
          label="Photo (override)"
          value={form.photo}
          onChange={(url) => setForm({ ...form, photo: url ?? '' })}
          hint="Si vide, on utilise la photo du membre dans l'effectif."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Buts</FieldLabel>
          <input
            type="number"
            style={inputStyle}
            value={form.goals}
            onChange={(e) => setForm({ ...form, goals: e.target.value })}
            placeholder="9"
          />
        </div>
        <div>
          <FieldLabel>Passes</FieldLabel>
          <input
            type="number"
            style={inputStyle}
            value={form.assists}
            onChange={(e) => setForm({ ...form, assists: e.target.value })}
            placeholder="6"
          />
        </div>
        <div>
          <FieldLabel>Stat libre — label</FieldLabel>
          <input
            style={inputStyle}
            value={form.extraStatLabel}
            onChange={(e) => setForm({ ...form, extraStatLabel: e.target.value })}
            placeholder="xG/match"
          />
        </div>
        <div>
          <FieldLabel>Stat libre — valeur</FieldLabel>
          <input
            style={inputStyle}
            value={form.extraStatValue}
            onChange={(e) => setForm({ ...form, extraStatValue: e.target.value })}
            placeholder="2.4"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Sponsor (texte court)</FieldLabel>
          <input
            style={inputStyle}
            value={form.sponsor}
            onChange={(e) => setForm({ ...form, sponsor: e.target.value })}
            placeholder="Crédit Peï"
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Citation (optionnel)</FieldLabel>
        <textarea
          style={{ ...inputStyle, minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }}
          value={form.quote}
          onChange={(e) => setForm({ ...form, quote: e.target.value })}
          placeholder="Une phrase forte du joueur, du coach, ou d'un journaliste."
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

export function MvpAdmin({
  initialAwards, members,
}: {
  initialAwards: PlayerOfMonthRow[];
  members: MemberPickerRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);

  const refresh = () => { setEditing(null); router.refresh(); };

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer la nomination de "${name}" ?`)) return;
    try {
      await deletePlayerOfMonth(id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur de suppression');
    }
  };

  // Groupe par mode pour rendre clair lequel est actif (le plus récent par mode).
  const grouped = useMemo(() => {
    const out: Record<'GAZON' | 'SALLE', PlayerOfMonthRow[]> = { GAZON: [], SALLE: [] };
    for (const a of initialAwards) out[a.mode].push(a);
    return out;
  }, [initialAwards]);

  return (
    <div>
      {editing && (
        <MvpForm
          initial={editing}
          members={members}
          onCancel={() => setEditing(null)}
          onDone={refresh}
        />
      )}

      {!editing && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setEditing(emptyForm('GAZON'))} style={{
            ...body, fontSize: 12.5, fontWeight: 700,
            padding: '12px 20px', borderRadius: 4,
            background: LRH.red, color: '#fff',
            border: 'none', cursor: 'pointer',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>+ Nouveau MVP Gazon</button>
          <button onClick={() => setEditing(emptyForm('SALLE'))} style={{
            ...body, fontSize: 12.5, fontWeight: 700,
            padding: '12px 20px', borderRadius: 4,
            background: LRH.navy, color: '#fff',
            border: 'none', cursor: 'pointer',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>+ Nouveau MVP Salle</button>
        </div>
      )}

      {(['GAZON', 'SALLE'] as const).map((mode) => {
        const rows = grouped[mode];
        const current = rows[0] ?? null;
        return (
          <section key={mode} style={{ marginBottom: 32 }}>
            <div style={{
              ...mono, fontSize: 11, fontWeight: 700,
              color: LRH.gold, letterSpacing: '0.18em',
              textTransform: 'uppercase', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 5, height: 5, background: LRH.gold }} />
              {mode === 'GAZON' ? 'Mode Gazon' : 'Mode Salle'}
              {current && (
                <span style={{
                  ...mono, fontSize: 9, color: LRH.navy,
                  background: LRH.gold, padding: '2px 8px', borderRadius: 2,
                  letterSpacing: '0.1em',
                }}>EN COURS · {current.periodLabel}</span>
              )}
            </div>
            {rows.length === 0 ? (
              <div style={{
                padding: 32, textAlign: 'center', background: '#fff',
                border: '1px dashed ' + LRH.hairStrong,
              }}>
                <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>[ vide ]</div>
                <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>
                  Aucun joueur du mois nommé pour le mode {mode === 'GAZON' ? 'gazon' : 'salle'}.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map((a, idx) => {
                  const isCurrent = idx === 0;
                  const fullName = `${a.member.firstName} ${a.member.lastName}`;
                  return (
                    <div key={a.id} style={{
                      background: '#fff', border: '1px solid ' + LRH.hair,
                      borderLeft: `3px solid ${isCurrent ? LRH.gold : LRH.hairStrong}`,
                      padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{
                        width: 56, height: 56, flexShrink: 0,
                        background: LRH.paperWarm,
                        backgroundImage: (a.photo ?? a.member.photo) ? `url(${a.photo ?? a.member.photo})` : undefined,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        border: '1px solid ' + LRH.hairStrong,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>
                          {a.periodLabel}
                          {a.sponsor && <> · <span style={{ color: LRH.navy }}>présenté par {a.sponsor.toUpperCase()}</span></>}
                        </div>
                        <div style={{ ...display, fontWeight: 700, fontSize: 16, color: LRH.navy, letterSpacing: '-0.01em' }}>{fullName}</div>
                        <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.06em', marginTop: 4 }}>
                          {[a.member.club?.name, a.member.jerseyNumber != null ? `#${a.member.jerseyNumber}` : null, a.member.position].filter(Boolean).join(' · ') || '—'}
                          {(a.goals != null || a.assists != null) && (
                            <> · <span style={{ color: LRH.ink2 }}>
                              {a.goals != null ? `${a.goals} but${a.goals > 1 ? 's' : ''}` : ''}
                              {a.goals != null && a.assists != null ? ' / ' : ''}
                              {a.assists != null ? `${a.assists} passe${a.assists > 1 ? 's' : ''}` : ''}
                            </span></>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditing({
                          id: a.id,
                          mode: a.mode,
                          memberId: a.member.id,
                          periodLabel: a.periodLabel,
                          effectiveAt: a.effectiveAt.toISOString().slice(0, 10),
                          photo: a.photo ?? '',
                          goals: a.goals != null ? String(a.goals) : '',
                          assists: a.assists != null ? String(a.assists) : '',
                          extraStatLabel: a.extraStatLabel ?? '',
                          extraStatValue: a.extraStatValue ?? '',
                          sponsor: a.sponsor ?? '',
                          quote: a.quote ?? '',
                        })} style={{
                          ...body, fontSize: 11.5, fontWeight: 700,
                          padding: '7px 14px', borderRadius: 4,
                          background: 'transparent', color: LRH.navy,
                          border: '1px solid ' + LRH.navy, cursor: 'pointer',
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>Modifier</button>
                        <button onClick={() => onDelete(a.id, fullName)} style={{
                          ...body, fontSize: 11.5, fontWeight: 700,
                          padding: '7px 14px', borderRadius: 4,
                          background: 'transparent', color: LRH.red,
                          border: '1px solid ' + LRH.red, cursor: 'pointer',
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>Suppr.</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
