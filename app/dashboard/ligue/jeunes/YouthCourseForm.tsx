'use client';

import React, { useMemo, useState } from 'react';
import { LRH, body, mono } from '@/components/lrh/tokens';
import { FormDialog } from '@/components/lrh/dashboard/FormDialog';
import { errorMessage } from '@/lib/utils/error-message';
import { formatMatchDay } from '@/lib/utils/match-format';
import {
  parseCourseSheet, sortByTime, courseRanks, formatCourseTime,
} from '@/lib/utils/youth-course';
import { replaceYouthCourseSeries } from '@/lib/actions/youth';
import { inputStyle, btnPrimary, btnGhost, FieldLabel } from './adminStyles';

export type GatheringOption = {
  id: string;
  date: Date | string;
  season: string;
  mode: 'GAZON' | 'SALLE';
  published: boolean;
  location: string | null;
};

/**
 * Saisie d'une série de chronos (une catégorie, un rassemblement) par
 * copier-coller : une ligne par jeune. L'aperçu sous la zone de texte est
 * produit par le MÊME parseur que la server action, donc ce qui s'affiche est
 * ce qui sera enregistré — et une ligne illisible est montrée avant l'envoi.
 *
 * Enregistrer REMPLACE la série existante (même rassemblement + catégorie) :
 * c'est aussi le chemin pour corriger un chrono (« Modifier » pré-remplit).
 */
export function YouthCourseForm({
  gatherings,
  initial,
  onClose,
  onSaved,
}: {
  gatherings: GatheringOption[];
  /** Série existante à corriger ; absente = nouvelle série. */
  initial?: { gatheringId: string; category: string; sheet: string };
  onClose: () => void;
  onSaved: (count: number) => void;
}) {
  const [gatheringId, setGatheringId] = useState(initial?.gatheringId ?? defaultGathering(gatherings));
  const [category, setCategory] = useState(initial?.category ?? '');
  const [sheet, setSheet] = useState(initial?.sheet ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseCourseSheet(sheet), [sheet]);
  const preview = useMemo(() => {
    const sorted = sortByTime(parsed.lines);
    return { rows: sorted, ranks: courseRanks(sorted) };
  }, [parsed]);
  const editing = !!initial;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await replaceYouthCourseSeries({ gatheringId, category, sheet });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onSaved(result.created ?? 0);
    } catch (e) {
      setError(errorMessage(e, "Erreur lors de l'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      busy={saving}
      size="wide"
      title={editing ? `Corriger la série ${initial.category}` : 'Saisir une série de chronos'}
      footer={
        <>
          <button style={btnGhost} disabled={saving} onClick={onClose}>Annuler</button>
          <button
            style={btnPrimary}
            disabled={saving || parsed.errors.length > 0 || parsed.lines.length === 0}
            onClick={submit}
          >
            {saving ? 'Enregistrement…' : `Enregistrer ${parsed.lines.length} chrono${parsed.lines.length > 1 ? 's' : ''}`}
          </button>
        </>
      }
    >
      {error && (
        <div role="alert" style={{
          ...body, fontSize: 13, color: LRH.red,
          background: 'rgba(168,32,47,0.07)', border: '1px solid ' + LRH.red,
          padding: '10px 12px', marginBottom: 14,
        }}>{error}</div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        gap: 14,
      }}>
        <div>
          <FieldLabel htmlFor="yc-gathering">Rassemblement *</FieldLabel>
          <select
            id="yc-gathering"
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={gatheringId}
            disabled={editing}
            onChange={(e) => setGatheringId(e.target.value)}
          >
            {gatherings.map((g) => (
              <option key={g.id} value={g.id}>
                {formatMatchDay(new Date(g.date))} {g.season.slice(2, 4)}-{g.season.slice(7)} · {g.mode === 'GAZON' ? 'Gazon' : 'Salle'}
                {g.location ? ` · ${g.location}` : ''}{g.published ? '' : ' (brouillon)'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="yc-category">Catégorie *</FieldLabel>
          <input
            id="yc-category"
            list="yc-categories"
            style={inputStyle}
            placeholder="U11"
            value={category}
            disabled={editing}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="yc-categories">
            {['U9', 'U11', 'U13', 'U15', 'U18'].map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <FieldLabel htmlFor="yc-sheet">Chronos — une ligne par jeune *</FieldLabel>
        <textarea
          id="yc-sheet"
          style={{ ...inputStyle, minHeight: 180, fontFamily: mono.fontFamily, lineHeight: 1.6 }}
          placeholder={'Naël ; 31,45\nMathéo ; HHS 1 ; 25,49 s\nRobin ; ≈ 38\nJules ; 1 min 09'}
          value={sheet}
          onChange={(e) => setSheet(e.target.value)}
          spellCheck={false}
        />
        <div style={{ ...body, fontSize: 11.5, color: LRH.mute, marginTop: 6, lineHeight: 1.5 }}>
          <code>Nom ; Chrono</code> ou <code>Nom ; Équipe ; Chrono</code> — point-virgule ou
          tabulation (copie d&apos;un tableur). Chronos : « 31,45 », « 50 s », « 1 min 09 »,
          « ≈ 38 » pour un temps approximatif. Le rang se calcule tout seul.
          {editing ? ' Enregistrer remplace la série entière.' : ' Si la série existe déjà, elle est remplacée.'}
        </div>
      </div>

      {parsed.errors.length > 0 && (
        <ul role="alert" style={{
          ...body, fontSize: 12.5, color: LRH.red, margin: '14px 0 0', paddingLeft: 18,
        }}>
          {parsed.errors.map((e) => (
            <li key={e.line}>Ligne {e.line} — {e.reason}</li>
          ))}
        </ul>
      )}

      {preview.rows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute,
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
          }}>Aperçu — classement publié</div>
          <ol style={{
            listStyle: 'none', margin: 0, padding: 0,
            border: '1px solid ' + LRH.hair, background: '#fff',
          }}>
            {preview.rows.map((r, i) => (
              <li key={r.athleteName} style={{
                ...body, fontSize: 13, display: 'flex', gap: 10, padding: '6px 10px',
                borderTop: i === 0 ? 'none' : '1px solid ' + LRH.hair,
              }}>
                <span style={{ width: 22, textAlign: 'right', color: LRH.mute }}>{preview.ranks[i]}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>
                  {r.athleteName}
                  {r.team && <span style={{ color: LRH.mute, fontWeight: 400 }}> · {r.team}</span>}
                </span>
                <span style={{ fontWeight: 700, color: LRH.navy }}>
                  {formatCourseTime(r.timeMs, r.approximate)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </FormDialog>
  );
}

/** Le rassemblement passé le plus récent : c'est celui qu'on vient de vivre. */
function defaultGathering(gatherings: GatheringOption[]): string {
  const now = Date.now();
  const past = gatherings
    .filter((g) => +new Date(g.date) <= now)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  return past[0]?.id ?? gatherings[0]?.id ?? '';
}
