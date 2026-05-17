'use client';

import React, { useState } from 'react';
import { LRH, mono, display, body, MODE_COLOR, CATEGORY_SUGGESTIONS } from '@/components/lrh/tokens';
import { ModeBadge, CategoryBadge } from '@/components/lrh/Badge';
import { useRouter } from 'next/navigation';
import {
  createCompetition, updateCompetition, deleteCompetition,
  addCompetitionEntry, removeCompetitionEntry,
  generateBracket, deleteBracket,
  type CompetitionInput, type CompetitionAdminRow,
} from '@/lib/actions/competition';
import type { ClubAdminRow } from '@/lib/actions/club';

type FormState = Partial<CompetitionInput> & { id?: string };

const EMPTY_FORM: FormState = {
  name: '', slug: '', mode: 'GAZON', season: '', category: 'Sénior',
  format: 'CHAMPIONSHIP',
};

const FORMAT_LABEL: Record<NonNullable<CompetitionInput['format']>, { label: string; hint: string }> = {
  CHAMPIONSHIP: {
    label: 'Championnat',
    hint: 'Round-robin classique avec classement par points. Tableau uniquement.',
  },
  CHAMPIONSHIP_PLAYOFFS: {
    label: 'Championnat + Playoffs',
    hint: 'Phase régulière (classement) suivie d\'une phase finale (1/2, 3e place, finale).',
  },
  CUP: {
    label: 'Coupe / Bracket',
    hint: 'Élimination directe pure, pas de classement. Affichage bracket uniquement.',
  },
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
        format: form.format ?? 'CHAMPIONSHIP',
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

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Format de la compétition *</FieldLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {(Object.keys(FORMAT_LABEL) as Array<keyof typeof FORMAT_LABEL>).map((f) => {
            const isActive = (form.format ?? 'CHAMPIONSHIP') === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setForm({ ...form, format: f })}
                style={{
                  ...body, fontSize: 12.5, fontWeight: 600,
                  padding: '12px 14px',
                  background: isActive ? LRH.navy : '#fff',
                  color: isActive ? '#fff' : LRH.ink,
                  border: `1px solid ${isActive ? LRH.navy : LRH.hairStrong}`,
                  borderLeft: `3px solid ${isActive ? LRH.gold : LRH.hairStrong}`,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                <span style={{
                  ...mono, fontSize: 10, fontWeight: 800,
                  color: isActive ? LRH.gold : LRH.navy,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                }}>
                  {FORMAT_LABEL[f].label}
                </span>
                <span style={{
                  ...body, fontSize: 11,
                  color: isActive ? 'rgba(255,255,255,0.7)' : LRH.mute,
                  lineHeight: 1.4,
                }}>
                  {FORMAT_LABEL[f].hint}
                </span>
              </button>
            );
          })}
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

export function CompetitionsAdmin({
  initialCompetitions,
  allClubs,
  entriesByCompetition,
}: {
  initialCompetitions: CompetitionAdminRow[];
  allClubs: ClubAdminRow[];
  entriesByCompetition: Record<string, string[]>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [entriesOpen, setEntriesOpen] = useState<string | null>(null);
  const [bracketOpen, setBracketOpen] = useState<string | null>(null);

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
                  const isOpen = entriesOpen === c.id;
                  const entryIds = entriesByCompetition[c.id] ?? [];
                  return (
                    <div key={c.id} style={{
                      background: '#fff', border: '1px solid ' + LRH.hair,
                      borderLeft: `3px solid ${pal.bg}`,
                    }}>
                      <div style={{
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
                            {c._count.entries} inscrit{c._count.entries > 1 ? 's' : ''} ·{' '}
                            {c._count.matches} match{c._count.matches > 1 ? 's' : ''} ·{' '}
                            {c._count.standings} classement{c._count.standings > 1 ? 's' : ''} · slug:{c.slug}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(c.format === 'CUP' || c.format === 'CHAMPIONSHIP_PLAYOFFS') && (
                            <button onClick={() => setBracketOpen(bracketOpen === c.id ? null : c.id)} style={{
                              ...body, fontSize: 11.5, fontWeight: 700,
                              padding: '6px 12px', borderRadius: 4,
                              background: bracketOpen === c.id ? LRH.gold : 'transparent',
                              color: bracketOpen === c.id ? LRH.navy : LRH.gold,
                              border: '1px solid ' + LRH.gold, cursor: 'pointer',
                              letterSpacing: '0.06em', textTransform: 'uppercase',
                            }}>
                              {bracketOpen === c.id ? '↑ Fermer' : '◆ Bracket'}
                            </button>
                          )}
                          <button onClick={() => setEntriesOpen(isOpen ? null : c.id)} style={{
                            ...body, fontSize: 11.5, fontWeight: 700,
                            padding: '6px 12px', borderRadius: 4,
                            background: isOpen ? LRH.gold : 'transparent',
                            color: isOpen ? LRH.navy : LRH.navy,
                            border: '1px solid ' + LRH.gold, cursor: 'pointer',
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                          }}>{isOpen ? '↑ Fermer' : 'Inscrits'}</button>
                          <button onClick={() => setEditing({
                            id: c.id, name: c.name, slug: c.slug,
                            mode: c.mode, season: c.season, category: c.category,
                            format: c.format,
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
                      {isOpen && (
                        <EntriesPanel
                          competitionId={c.id}
                          competitionName={c.name}
                          allClubs={allClubs}
                          entryIds={entryIds}
                          onChange={() => router.refresh()}
                        />
                      )}
                      {bracketOpen === c.id && (
                        <BracketPanel
                          competitionId={c.id}
                          competitionName={c.name}
                          format={c.format}
                          standingsCount={c._count.standings}
                          entriesCount={c._count.entries}
                          onDone={() => { setBracketOpen(null); router.refresh(); }}
                        />
                      )}
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

function EntriesPanel({
  competitionId,
  competitionName,
  allClubs,
  entryIds,
  onChange,
}: {
  competitionId: string;
  competitionName: string;
  allClubs: ClubAdminRow[];
  entryIds: string[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inscritIds = new Set(entryIds);
  const inscrits = allClubs.filter((c) => inscritIds.has(c.id));
  const dispo = allClubs.filter((c) => !inscritIds.has(c.id));

  const add = async (clubId: string) => {
    setBusy(clubId); setError(null);
    try {
      await addCompetitionEntry(competitionId, clubId);
      onChange();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (clubId: string) => {
    if (!confirm(`Désinscrire ce club de "${competitionName}" ?`)) return;
    setBusy(clubId); setError(null);
    try {
      await removeCompetitionEntry(competitionId, clubId);
      onChange();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{
      padding: 20,
      borderTop: '1px dashed ' + LRH.hairStrong,
      background: LRH.paperWarm,
    }}>
      <div style={{
        ...mono, fontSize: 10, fontWeight: 700,
        color: LRH.red, letterSpacing: '0.18em',
        textTransform: 'uppercase', marginBottom: 12,
      }}>
        ▸ Équipes inscrites — {inscrits.length.toString().padStart(2, '0')}
      </div>

      {error && (
        <div style={{
          ...mono, fontSize: 11, color: LRH.red,
          marginBottom: 12, padding: '8px 12px',
          background: 'rgba(168,32,47,0.08)', border: '1px solid rgba(168,32,47,0.2)',
        }}>⚠ {error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Inscrits */}
        <div>
          <div style={{
            ...mono, fontSize: 9.5, fontWeight: 700,
            color: LRH.mute, letterSpacing: '0.14em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>Engagés</div>
          {inscrits.length === 0 ? (
            <div style={{
              padding: 12, ...body, fontSize: 12, color: LRH.mute,
              background: '#fff', border: '1px dashed ' + LRH.hairStrong,
            }}>Aucun club inscrit.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inscrits.map((c) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: '#fff',
                  border: '1px solid ' + LRH.hair,
                  borderLeft: `3px solid ${c.kind === 'ENTENTE' ? LRH.gold : LRH.navy}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      ...display, fontWeight: 700, fontSize: 13,
                      color: LRH.navy, letterSpacing: '-0.005em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{c.name}</div>
                    <div style={{
                      ...mono, fontSize: 9, color: LRH.mute,
                      letterSpacing: '0.06em', marginTop: 2,
                    }}>
                      {c.kind === 'ENTENTE' ? 'ENTENTE' : 'CLUB'} · {c.shortCode ?? '—'} · {c.city}
                    </div>
                  </div>
                  <button onClick={() => remove(c.id)} disabled={busy === c.id} style={{
                    ...body, fontSize: 10.5, fontWeight: 700,
                    padding: '4px 9px', borderRadius: 4,
                    background: 'transparent', color: LRH.red,
                    border: '1px solid ' + LRH.red, cursor: 'pointer',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>{busy === c.id ? '…' : 'Retirer'}</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disponibles */}
        <div>
          <div style={{
            ...mono, fontSize: 9.5, fontWeight: 700,
            color: LRH.mute, letterSpacing: '0.14em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>Disponibles</div>
          {dispo.length === 0 ? (
            <div style={{
              padding: 12, ...body, fontSize: 12, color: LRH.mute,
              background: '#fff', border: '1px dashed ' + LRH.hairStrong,
            }}>Tous les clubs sont inscrits.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dispo.map((c) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: '#fff',
                  border: '1px solid ' + LRH.hair,
                  opacity: 0.85,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      ...display, fontWeight: 700, fontSize: 13,
                      color: LRH.ink2, letterSpacing: '-0.005em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{c.name}</div>
                    <div style={{
                      ...mono, fontSize: 9, color: LRH.mute,
                      letterSpacing: '0.06em', marginTop: 2,
                    }}>
                      {c.kind === 'ENTENTE' ? 'ENTENTE' : 'CLUB'} · {c.shortCode ?? '—'} · {c.city}
                    </div>
                  </div>
                  <button onClick={() => add(c.id)} disabled={busy === c.id} style={{
                    ...body, fontSize: 10.5, fontWeight: 700,
                    padding: '4px 9px', borderRadius: 4,
                    background: LRH.navy, color: '#fff',
                    border: 'none', cursor: 'pointer',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>{busy === c.id ? '…' : '+ Inscrire'}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BracketPanel({
  competitionId,
  competitionName,
  format,
  standingsCount,
  entriesCount,
  onDone,
}: {
  competitionId: string;
  competitionName: string;
  format: 'CHAMPIONSHIP' | 'CHAMPIONSHIP_PLAYOFFS' | 'CUP';
  standingsCount: number;
  entriesCount: number;
  onDone: () => void;
}) {
  const [teamCount, setTeamCount] = useState<4 | 8 | 16 | 32>(8);
  const [includeThirdPlace, setIncludeThirdPlace] = useState(true);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T19:00`;
  });
  const [weekInterval, setWeekInterval] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sourceCount = format === 'CHAMPIONSHIP_PLAYOFFS' ? standingsCount : entriesCount;
  const sourceLabel =
    format === 'CHAMPIONSHIP_PLAYOFFS' ? 'classés au championnat' : 'inscrits à la coupe';
  const insufficient = sourceCount < teamCount;

  const handleGenerate = async () => {
    const msg =
      'Générer un bracket de ' + teamCount + ' équipes' +
      (includeThirdPlace ? ' avec match 3e place' : '') +
      ' pour « ' + competitionName + ' » ?';
    if (!confirm(msg)) return;
    setBusy(true); setError(null); setSuccess(null);
    try {
      const result = await generateBracket(competitionId, {
        teamCount,
        includeThirdPlace,
        startDate: new Date(startDate),
        weekInterval,
      });
      setSuccess(
        result.created + ' match' + (result.created > 1 ? 's' : '') + ' créé' +
        (result.created > 1 ? 's' : '') +
        '. Éditez-les pour ajuster les équipes des manches suivantes.',
      );
      setTimeout(onDone, 1500);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la génération');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer TOUS les matchs de phase finale de « ' + competitionName + ' » ? Cette action est irréversible.')) return;
    setBusy(true); setError(null); setSuccess(null);
    try {
      const result = await deleteBracket(competitionId);
      setSuccess(result.deleted + ' match' + (result.deleted > 1 ? 's' : '') + ' supprimé' + (result.deleted > 1 ? 's' : '') + '.');
      setTimeout(onDone, 1200);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la suppression');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      background: LRH.paperWarm,
      borderTop: '1px dashed ' + LRH.hairStrong,
      padding: 18,
    }}>
      <div style={{
        ...mono, fontSize: 10, fontWeight: 800,
        color: LRH.gold, letterSpacing: '0.18em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        ◆ Génération automatique du bracket
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Équipes finalistes</FieldLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            {([4, 8, 16, 32] as const).map((n) => {
              const isActive = teamCount === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTeamCount(n)}
                  style={{
                    ...mono, fontSize: 12, fontWeight: 700,
                    padding: '8px 12px', flex: 1,
                    background: isActive ? LRH.navy : '#fff',
                    color: isActive ? '#fff' : LRH.ink2,
                    border: '1px solid ' + (isActive ? LRH.navy : LRH.hairStrong),
                    cursor: 'pointer',
                    letterSpacing: '0.06em',
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div style={{
            ...mono, fontSize: 9.5, color: insufficient ? LRH.red : LRH.mute,
            letterSpacing: '0.06em', marginTop: 6, fontWeight: 700,
          }}>
            {sourceCount} {sourceLabel}{insufficient ? ' — insuffisant (' + teamCount + ' requis)' : ' ✓'}
          </div>
        </div>

        <div>
          <FieldLabel>1er match — coup d&apos;envoi</FieldLabel>
          <input
            type="datetime-local"
            style={inputStyle}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <FieldLabel>Intervalle entre phases</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={weekInterval}
            onChange={(e) => setWeekInterval(Number(e.target.value))}
          >
            <option value={1}>1 semaine</option>
            <option value={2}>2 semaines</option>
            <option value={3}>3 semaines</option>
            <option value={4}>1 mois</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeThirdPlace}
            onChange={(e) => setIncludeThirdPlace(e.target.checked)}
            disabled={teamCount < 4}
          />
          <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: LRH.ink, letterSpacing: '0.06em' }}>
            Inclure un match pour la 3e place
          </span>
        </label>
      </div>

      <div style={{
        ...mono, fontSize: 10, color: LRH.mute,
        letterSpacing: '0.06em', lineHeight: 1.6, marginBottom: 14,
        padding: 12, background: '#fff', border: '1px dashed ' + LRH.hairStrong,
      }}>
        <strong style={{ color: LRH.navy }}>Comment ça marche :</strong> la première
        manche est seedée automatiquement (1 vs N, 2 vs N-1, …) à partir
        {format === 'CHAMPIONSHIP_PLAYOFFS' ? ' du classement régulier' : ' des clubs inscrits'}.
        Les manches suivantes sont créées avec des placeholders à corriger après
        chaque match joué. La 3e place est programmée 2 h avant la finale.
      </div>

      {error && (
        <div style={{
          ...mono, fontSize: 11, color: LRH.red,
          padding: '8px 12px', marginBottom: 12,
          background: 'rgba(168,32,47,0.08)', border: '1px solid rgba(168,32,47,0.2)',
        }}>⚠ {error}</div>
      )}
      {success && (
        <div style={{
          ...mono, fontSize: 11, color: '#1d6b3f',
          padding: '8px 12px', marginBottom: 12,
          background: 'rgba(29,107,63,0.08)', border: '1px solid rgba(29,107,63,0.2)',
        }}>✓ {success}</div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={handleGenerate}
          disabled={busy || insufficient}
          style={{
            ...btnPrimary,
            background: insufficient ? LRH.hairStrong : LRH.navy,
            cursor: insufficient ? 'not-allowed' : 'pointer',
            opacity: insufficient ? 0.6 : 1,
          }}
        >
          {busy ? 'En cours…' : '◆ Générer le bracket'}
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          style={{
            ...btnGhost,
            color: LRH.red, borderColor: LRH.red,
          }}
        >
          ⌫ Supprimer le bracket existant
        </button>
      </div>
    </div>
  );
}
