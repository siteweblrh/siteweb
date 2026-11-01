'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono, MODE_COLOR } from '@/components/lrh/tokens';
import { useConfirm } from '@/components/lrh/dashboard/useConfirm';
import { errorMessage } from '@/lib/utils/error-message';
import { formatMatchDay } from '@/lib/utils/match-format';
import { groupCourseSessions, courseSheetText, formatCourseTime } from '@/lib/utils/youth-course';
import { deleteYouthCourseSeries } from '@/lib/actions/youth';
import type { YouthCourseTimeAdminRow } from '@/lib/queries/youth';
import { btnPrimary, btnGhost, btnDanger } from './adminStyles';
import { YouthCourseForm, type GatheringOption } from './YouthCourseForm';

/** Les dates traversent le RSC : `Date` ou chaîne selon le chemin. */
type Row = Omit<YouthCourseTimeAdminRow, 'gathering'> & {
  gathering: Omit<YouthCourseTimeAdminRow['gathering'], 'date'> & { date: Date | string };
};

/**
 * Admin du parcours du jeune hockeyeur : les séries saisies, par journée puis
 * par catégorie, avec le meilleur chrono et l'effectif — de quoi vérifier
 * d'un coup d'œil contre l'affiche de la journée.
 */
export function YouthCourseAdmin({
  rows,
  gatherings,
}: {
  rows: Row[];
  gatherings: GatheringOption[];
}) {
  const router = useRouter();
  const [ask, confirmDialog] = useConfirm();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<null | { initial?: { gatheringId: string; category: string; sheet: string } }>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sessions = useMemo(() => groupCourseSessions(rows), [rows]);

  const remove = async (gatheringId: string, category: string, label: string, count: number) => {
    const ok = await ask({
      title: `Supprimer la série ${category} ?`,
      message: `${label} — ${count} chrono${count > 1 ? 's' : ''}.\nIls disparaîtront de la page publique /jeunes.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteYouthCourseSeries(gatheringId, category);
        router.refresh();
      } catch (e) {
        setError(errorMessage(e, 'Erreur lors de la suppression'));
      }
    });
  };

  return (
    <div>
      {error && <p role="alert" style={{ ...body, fontSize: 13, color: LRH.red, margin: '0 0 12px' }}>{error}</p>}
      {notice && <p role="status" style={{ ...body, fontSize: 13, color: '#1d6b3f', margin: '0 0 12px' }}>{notice}</p>}

      <button
        style={btnPrimary}
        disabled={gatherings.length === 0}
        onClick={() => { setError(null); setNotice(null); setForm({}); }}
      >
        + Saisir une série de chronos
      </button>
      {gatherings.length === 0 && (
        <p style={{ ...body, fontSize: 12.5, color: LRH.mute, margin: '8px 0 0' }}>
          Créez d&apos;abord le rassemblement dans le calendrier ci-dessus.
        </p>
      )}

      {sessions.length === 0 && gatherings.length > 0 && (
        <div style={{
          ...body, fontSize: 13, color: LRH.mute,
          marginTop: 20, padding: 24, background: '#fff',
          border: '1px dashed ' + LRH.hairStrong, textAlign: 'center',
        }}>
          Aucun chrono enregistré.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 20 }}>
        {sessions.map(({ gathering, series }) => {
          const dayLabel = formatMatchDay(new Date(gathering.date));
          return (
            <div key={gathering.id}>
              <div style={{
                ...display, fontWeight: 800, fontSize: 14, color: LRH.navy,
                letterSpacing: '-0.01em', marginBottom: 6,
              }}>
                {dayLabel}
                <span style={{
                  ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.mute, marginLeft: 10,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                }}>
                  {gathering.season} · {gathering.mode === 'GAZON' ? 'Gazon' : 'Salle'}
                  {!gathering.published && ' · date en brouillon, non publiée'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {series.map((s) => (
                  <div key={s.category} style={{
                    background: '#fff',
                    border: '1px solid ' + LRH.hair,
                    borderLeft: `3px solid ${MODE_COLOR[gathering.mode].bg}`,
                    padding: '10px 14px',
                    display: 'flex', flexWrap: 'wrap', gap: 10,
                    alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                      <div style={{ ...body, fontSize: 14, fontWeight: 700, color: LRH.ink }}>
                        {s.category} · {s.rows.length} chrono{s.rows.length > 1 ? 's' : ''}
                      </div>
                      <div style={{ ...body, fontSize: 12.5, color: LRH.ink2, marginTop: 2 }}>
                        Meilleur : {s.rows[0].athleteName} — {formatCourseTime(s.rows[0].timeMs, s.rows[0].approximate)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        style={btnGhost}
                        onClick={() => {
                          setError(null); setNotice(null);
                          setForm({ initial: { gatheringId: gathering.id, category: s.category, sheet: courseSheetText(s.rows) } });
                        }}
                      >Corriger</button>
                      <button
                        style={btnDanger}
                        disabled={pending}
                        onClick={() => remove(gathering.id, s.category, dayLabel, s.rows.length)}
                      >Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {form && (
        <YouthCourseForm
          gatherings={gatherings}
          initial={form.initial}
          onClose={() => setForm(null)}
          onSaved={(count) => {
            setForm(null);
            setNotice(`${count} chrono${count > 1 ? 's' : ''} enregistré${count > 1 ? 's' : ''}.`);
            router.refresh();
          }}
        />
      )}

      {confirmDialog}
    </div>
  );
}
