'use client';

import React, { useState } from 'react';
import { LRH, mono, display, body, MODE_COLOR, CATEGORY_SUGGESTIONS } from '@/components/lrh/tokens';
import { ModeBadge, CategoryBadge } from '@/components/lrh/Badge';
import { useRouter } from 'next/navigation';
import {
  createCompetition, updateCompetition, deleteCompetition,
  type CompetitionInput, type CompetitionAdminRow,
} from '@/lib/actions/competition';

type FormState = Partial<CompetitionInput> & { id?: string };

const EMPTY_FORM: FormState = {
  name: '', slug: '', mode: 'GAZON', season: '', category: 'Sénior',
};

const SEASON_PRESETS = [
  '2025-2026',
  '2026-2027',
  '2027-2028',
];

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

function CompetitionForm({
  initial, onCancel, onDone,
}: { initial: FormState; onCancel: () => void; onDone: () => void }) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial.id);

  const submit = async () => {
    if (!form.name?.trim() || !form.season?.trim() || !form.category?.trim() || !form.mode) {
      setError('Nom, discipline, catégorie et saison sont obligatoires.');
      return;
    }
    setSaving(true); setError(null);
    try {
      const payload: CompetitionInput = {
        name: form.name!.trim(),
        slug: form.slug?.trim() || undefined,
        mode: form.mode as 'GAZON' | 'SALLE',
        season: form.season!.trim(),
        category: form.category!.trim(),
      };
      if (isEdit && initial.id) await updateCompetition(initial.id, payload);
      else await createCompetition(payload);
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally { setSaving(false); }
  };

  const palette = form.mode === 'SALLE' ? MODE_COLOR.SALLE : MODE_COLOR.GAZON;

  return (
    <div style={{
      background: '#fff', border: '1px solid ' + LRH.hair,
      borderLeft: `3px solid ${palette.bg}`,
      padding: 24, marginBottom: 16,
    }}>
      <div style={{
        ...mono, fontSize: 11, fontWeight: 700,
        color: LRH.red, letterSpacing: '0.18em',
        textTransform: 'uppercase', marginBottom: 16,
      }}>{isEdit ? '▸ Modifier la compétition' : '▸ Nouvelle compétition'}</div>

      {/* Discipline + Catégorie en proéminence avec preview live */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Discipline *</FieldLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['GAZON', 'SALLE'] as const).map((m) => {
              const isActive = form.mode === m;
              const pal = MODE_COLOR[m];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm({ ...form, mode: m })}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: 4,
                    background: isActive ? pal.bg : '#fff',
                    color: isActive ? pal.fg : LRH.ink2,
                    border: `1px solid ${isActive ? pal.bg : LRH.hairStrong}`,
                    cursor: 'pointer',
                    ...display, fontWeight: 700, fontSize: 14,
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isActive ? pal.fg : pal.bg, opacity: isActive ? 0.85 : 1,
                  }} />
                  {pal.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Catégorie *</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.category ?? ''}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">— Choisir —</option>
            {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Nom de la compétition *</FieldLabel>
          <input
            style={inputStyle}
            value={form.name ?? ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Championnat Réunion Gazon Sénior"
          />
        </div>
        <div>
          <FieldLabel>Saison *</FieldLabel>
          <input
            style={inputStyle}
            list="lrh-season-list"
            value={form.season ?? ''}
            onChange={(e) => setForm({ ...form, season: e.target.value })}
            placeholder="2025-2026"
          />
          <datalist id="lrh-season-list">
            {SEASON_PRESETS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <FieldLabel>Slug (URL)</FieldLabel>
          <input
            style={inputStyle}
            value={form.slug ?? ''}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="auto si vide"
          />
        </div>
      </div>

      {/* Preview live des badges */}
      <div style={{
        marginBottom: 14, padding: '10px 14px',
        background: LRH.paper, border: '1px dashed ' + LRH.hairStrong,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          ...mono, fontSize: 9.5, fontWeight: 700,
          color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>Aperçu</span>
        <ModeBadge mode={form.mode ?? 'GAZON'} />
        <CategoryBadge category={form.category || 'Sénior'} />
        <span style={{ ...mono, fontSize: 11, color: LRH.ink2, fontWeight: 600 }}>
          {form.name || '— Nom de la compétition —'}
        </span>
        <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.08em' }}>
          {form.season || '----/----'}
        </span>
      </div>

      {error && (
        <div style={{
          ...mono, fontSize: 11, color: LRH.red,
          marginBottom: 12, padding: '8px 12px',
          background: 'rgba(168,32,47,0.08)', border: '1px solid rgba(168,32,47,0.2)',
        }}>⚠ {error}</div>
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

export function CompetitionsAdmin({ initialCompetitions }: { initialCompetitions: CompetitionAdminRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);

  const refresh = () => { setEditing(null); router.refresh(); };

  const onDelete = async (row: CompetitionAdminRow) => {
    if (!confirm(`Supprimer "${row.name}" (${row.season}) ?`)) return;
    try { await deleteCompetition(row.id); router.refresh(); }
    catch (e: any) { alert(e?.message || 'Erreur de suppression'); }
  };

  // Groupage par saison décroissant pour faciliter la lecture
  const bySeason = new Map<string, CompetitionAdminRow[]>();
  for (const c of initialCompetitions) {
    if (!bySeason.has(c.season)) bySeason.set(c.season, []);
    bySeason.get(c.season)!.push(c);
  }

  return (
    <div>
      {editing && (
        <CompetitionForm initial={editing} onCancel={() => setEditing(null)} onDone={refresh} />
      )}

      {!editing && (
        <button onClick={() => setEditing({ ...EMPTY_FORM })} style={{
          ...body, fontSize: 12.5, fontWeight: 700,
          padding: '12px 20px', borderRadius: 4,
          background: LRH.red, color: '#fff', border: 'none',
          cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 20,
        }}>+ Nouvelle compétition</button>
      )}

      {initialCompetitions.length === 0 && !editing ? (
        <div style={{
          padding: 48, textAlign: 'center', background: '#fff',
          border: '1px dashed ' + LRH.hairStrong,
        }}>
          <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>[ vide ]</div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>
            Aucune compétition créée. Commencez par en ajouter une — elle servira à rattacher les matchs.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Array.from(bySeason.entries()).map(([season, list]) => (
            <div key={season}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                <div style={{ width: 14, height: 2, background: LRH.gold }} />
                <div style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy, letterSpacing: '-0.01em' }}>
                  Saison {season}
                </div>
                <div style={{ flex: 1, height: 1, background: LRH.hair }} />
                <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  {list.length.toString().padStart(2, '0')} compétition{list.length > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map((c) => {
                  const pal = MODE_COLOR[c.mode];
                  return (
                    <div key={c.id} style={{
                      background: '#fff', border: '1px solid ' + LRH.hair,
                      borderLeft: `3px solid ${pal.bg}`,
                      padding: '14px 18px',
                      display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <ModeBadge mode={c.mode} size="sm" />
                          <CategoryBadge category={c.category} size="sm" />
                        </div>
                        <div style={{
                          ...display, fontWeight: 700, fontSize: 16,
                          color: LRH.navy, letterSpacing: '-0.01em',
                        }}>{c.name}</div>
                        <div style={{
                          ...mono, fontSize: 10, color: LRH.mute,
                          letterSpacing: '0.08em', marginTop: 4,
                        }}>
                          {c._count.matches} match{c._count.matches > 1 ? 's' : ''} ·{' '}
                          {c._count.standings} équipe{c._count.standings > 1 ? 's' : ''} · slug:{c.slug}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditing({
                          id: c.id, name: c.name, slug: c.slug,
                          mode: c.mode, season: c.season, category: c.category,
                        })} style={{
                          ...body, fontSize: 11.5, fontWeight: 700,
                          padding: '6px 12px', borderRadius: 4,
                          background: 'transparent', color: LRH.navy,
                          border: '1px solid ' + LRH.navy, cursor: 'pointer',
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>Modifier</button>
                        <button onClick={() => onDelete(c)} style={{
                          ...body, fontSize: 11.5, fontWeight: 700,
                          padding: '6px 12px', borderRadius: 4,
                          background: 'transparent', color: LRH.red,
                          border: '1px solid ' + LRH.red, cursor: 'pointer',
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>Suppr.</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
