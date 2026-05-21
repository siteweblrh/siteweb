'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, mono } from '@/components/lrh/tokens';
import { setManyContent, resetContent } from '@/lib/actions/siteContent';
import { CONTENT_DEFS, type ContentKey, type ContentMeta } from '@/lib/siteContent';
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

export function CategoryEditor({
  category,
  categoryLabel,
  keys,
  initialValues,
  isOverridden: initialOverridden,
}: {
  category: string;
  categoryLabel: string;
  keys: ContentKey[];
  initialValues: Record<string, string>;
  isOverridden: Record<string, boolean>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [overridden, setOverridden] = useState<Record<string, boolean>>(initialOverridden);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await setManyContent(keys.map((k) => ({ key: k, value: values[k] ?? '' })));
      // Une clé devient "overridden" si sa valeur diffère du default
      const next: Record<string, boolean> = { ...overridden };
      for (const k of keys) {
        const v = (values[k] ?? '').trim();
        next[k] = v.length > 0 && v !== CONTENT_DEFS[k].default;
      }
      setOverridden(next);
      setSuccess(`« ${categoryLabel} » enregistré.`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: ContentKey) => {
    if (!confirm(`Restaurer la valeur d'origine de « ${CONTENT_DEFS[key].label} » ?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await resetContent(key);
      setValues({ ...values, [key]: CONTENT_DEFS[key].default });
      setOverridden({ ...overridden, [key]: false });
      setSuccess(`Valeur d'origine restaurée.`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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

      <section
        style={{
          background: '#fff',
          border: '1px solid ' + LRH.hair,
          borderLeft: `3px solid ${LRH.gold}`,
          padding: 'clamp(16px, 2.5vw, 24px)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {keys.map((key) => {
            const def = CONTENT_DEFS[key] as ContentMeta;
            const isImage = def.type === 'image';
            const isMulti = def.multiline === true;
            return (
              <div key={key}>
                <FieldLabel overridden={overridden[key]}>{def.label}</FieldLabel>
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
                  {overridden[key] && (
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
      </section>

      {/* Sticky save bar — toujours accessible même sur form long */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          marginTop: 4,
          padding: '14px 16px',
          background: '#fff',
          borderTop: '1px solid ' + LRH.hairStrong,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 -4px 16px rgba(10,18,32,0.04)',
          zIndex: 5,
        }}
      >
        <span
          style={{
            ...mono,
            fontSize: 10,
            color: LRH.mute,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {keys.length} champ{keys.length > 1 ? 's' : ''}
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...body,
            fontSize: 12.5,
            fontWeight: 700,
            padding: '12px 22px',
            borderRadius: 4,
            background: LRH.navy,
            color: '#fff',
            border: 'none',
            cursor: saving ? 'wait' : 'pointer',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
