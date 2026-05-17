'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { setManyContent, resetContent } from '@/lib/actions/siteContent';
import {
  CONTENT_DEFS,
  CONTENT_CATEGORY_ORDER,
  CONTENT_CATEGORY_LABEL,
  type ContentKey,
  type ContentMeta,
} from '@/lib/siteContent';
import { ImageUploader } from '@/components/lrh/upload/ImageUploader';

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 13.5,
  padding: '10px 12px',
  width: '100%',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4,
  background: '#fff',
  color: LRH.ink,
  fontFamily: 'inherit',
};

function FieldLabel({ children, overridden }: { children: React.ReactNode; overridden: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        marginBottom: 6,
      }}
    >
      <label
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 700,
          color: LRH.mute,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          flex: 1,
        }}
      >
        {children}
      </label>
      {overridden && (
        <span
          style={{
            ...mono,
            fontSize: 9,
            fontWeight: 800,
            color: '#1d6b3f',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            padding: '2px 6px',
            background: 'rgba(29,107,63,0.1)',
            border: '1px solid rgba(29,107,63,0.3)',
          }}
        >
          ◉ Modifié
        </span>
      )}
    </div>
  );
}

export function ContenuAdmin({
  initialValues,
  isOverridden,
}: {
  initialValues: Record<string, string>;
  isOverridden: Record<string, boolean>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const groups: Record<string, ContentKey[]> = {};
    for (const k of Object.keys(CONTENT_DEFS) as ContentKey[]) {
      const cat = CONTENT_DEFS[k].category;
      (groups[cat] ??= []).push(k);
    }
    return groups;
  }, []);

  const handleSaveCategory = async (category: string) => {
    setSavingCategory(category);
    setError(null);
    setSuccess(null);
    const keys = byCategory[category] ?? [];
    try {
      await setManyContent(keys.map((k) => ({ key: k, value: values[k] ?? '' })));
      setSuccess(`Catégorie « ${CONTENT_CATEGORY_LABEL[category] ?? category} » enregistrée.`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSavingCategory(null);
    }
  };

  const handleReset = async (key: ContentKey) => {
    if (!confirm(`Restaurer la valeur d'origine de « ${CONTENT_DEFS[key].label} » ?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await resetContent(key);
      setValues({ ...values, [key]: CONTENT_DEFS[key].default });
      setSuccess(`Valeur d'origine restaurée.`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            padding: '10px 14px',
            background: 'rgba(168,32,47,0.08)',
            border: '1px solid rgba(168,32,47,0.2)',
          }}
        >
          ⚠ {error}
        </div>
      )}
      {success && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: '#1d6b3f',
            padding: '10px 14px',
            background: 'rgba(29,107,63,0.08)',
            border: '1px solid rgba(29,107,63,0.2)',
          }}
        >
          ✓ {success}
        </div>
      )}

      {CONTENT_CATEGORY_ORDER.map((category) => {
        const keys = byCategory[category];
        if (!keys || keys.length === 0) return null;
        const overriddenCount = keys.filter((k) => isOverridden[k]).length;
        return (
          <section
            key={category}
            style={{
              background: '#fff',
              border: '1px solid ' + LRH.hair,
              borderLeft: `3px solid ${LRH.gold}`,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16 }}>
              <span style={{ width: 14, height: 2, background: LRH.gold }} />
              <h3
                style={{
                  ...display,
                  fontWeight: 700,
                  fontSize: 18,
                  color: LRH.navy,
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {CONTENT_CATEGORY_LABEL[category] ?? category}
              </h3>
              <span style={{ flex: 1 }} />
              <span
                style={{
                  ...mono,
                  fontSize: 10,
                  color: LRH.mute,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                {keys.length} clé{keys.length > 1 ? 's' : ''}
                {overriddenCount > 0 && ` · ${overriddenCount} modifiée${overriddenCount > 1 ? 's' : ''}`}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {keys.map((key) => {
                const def = CONTENT_DEFS[key] as ContentMeta;
                const isImage = def.type === 'image';
                const isMulti = def.multiline === true;
                return (
                  <div key={key}>
                    <FieldLabel overridden={isOverridden[key]}>{def.label}</FieldLabel>
                    {isImage ? (
                      <ImageUploader
                        value={values[key] ?? ''}
                        onChange={(url) => setValues({ ...values, [key]: url ?? '' })}
                        hint={def.hint}
                      />
                    ) : isMulti ? (
                      <textarea
                        style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                        value={values[key] ?? ''}
                        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      />
                    ) : (
                      <input
                        type="text"
                        style={inputStyle}
                        value={values[key] ?? ''}
                        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <span
                        style={{
                          ...mono,
                          fontSize: 9.5,
                          color: LRH.mute,
                          letterSpacing: '0.06em',
                          fontFamily: 'JetBrains Mono, monospace',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isImage ? `clé : ${key}` : (def.hint ?? `clé : ${key}`)}
                      </span>
                      {isOverridden[key] && (
                        <button
                          type="button"
                          onClick={() => handleReset(key)}
                          style={{
                            ...mono,
                            fontSize: 10,
                            fontWeight: 700,
                            color: LRH.red,
                            background: 'transparent',
                            border: '1px solid ' + LRH.red,
                            padding: '4px 10px',
                            cursor: 'pointer',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            flexShrink: 0,
                          }}
                        >
                          Restaurer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleSaveCategory(category)}
                disabled={savingCategory === category}
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
                {savingCategory === category ? 'Enregistrement…' : 'Enregistrer cette section'}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
