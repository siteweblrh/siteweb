'use client';

import React, { useCallback, useRef, useState } from 'react';
import { LRH, mono, display, body } from '../tokens';

type Status =
  | { kind: 'idle' }
  | { kind: 'uploading'; progress?: number }
  | { kind: 'error'; message: string };

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
const DEFAULT_MAX_MB = 10;

/**
 * Variants prédéfinis → transformations Cloudinary appliquées à la volée
 * dans l'URL. Cloudinary génère/cache la variante à la première requête.
 * Format auto + qualité auto = WebP/AVIF servi selon le navigateur.
 */
const VARIANT_TRANSFORMS: Record<string, string> = {
  public:    '',                                          // URL native, taille originale
  thumbnail: 'w_200,h_200,c_fill,f_auto,q_auto',
  cover:     'w_1200,h_630,c_fill,f_auto,q_auto',          // OpenGraph-friendly
  card:      'w_600,h_400,c_fill,f_auto,q_auto',
  avatar:    'w_120,h_120,c_fill,g_face,f_auto,q_auto',    // crop centré sur visage
};

/** Insère la transformation dans `https://res.cloudinary.com/{cn}/image/upload/...` */
function applyTransform(secureUrl: string, transform: string): string {
  if (!transform) return secureUrl;
  return secureUrl.replace('/image/upload/', `/image/upload/${transform}/`);
}

export type ImageUploaderProps = {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  /** Variante de transformation Cloudinary. Default `public` (URL native). */
  variant?: 'public' | 'thumbnail' | 'cover' | 'card' | 'avatar' | string;
  accept?: string;
  maxSizeMB?: number;
  /** Visual height of the empty drop zone / preview. */
  height?: number;
};

export function ImageUploader({
  value,
  onChange,
  label = 'Image',
  hint,
  variant = 'public',
  accept = DEFAULT_ACCEPT,
  maxSizeMB = DEFAULT_MAX_MB,
  height = 180,
}: ImageUploaderProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        setStatus({ kind: 'error', message: `Fichier trop volumineux (max ${maxSizeMB} Mo).` });
        return;
      }
      if (!file.type.startsWith('image/')) {
        setStatus({ kind: 'error', message: 'Le fichier doit être une image.' });
        return;
      }

      setStatus({ kind: 'uploading' });
      try {
        const sigRes = await fetch('/api/upload/cloudinary', { method: 'POST' });
        if (!sigRes.ok) {
          const data = await sigRes.json().catch(() => ({}));
          const detail =
            data?.error ||
            (sigRes.status === 503
              ? 'Cloudinary non configuré. Collez une URL manuellement ci-dessous.'
              : `HTTP ${sigRes.status}`);
          throw new Error(detail);
        }
        const { signature, timestamp, apiKey, cloudName, folder } = (await sigRes.json()) as {
          signature: string;
          timestamp: number;
          apiKey: string;
          cloudName: string;
          folder: string;
        };

        const form = new FormData();
        form.append('file', file);
        form.append('api_key', apiKey);
        form.append('timestamp', String(timestamp));
        form.append('signature', signature);
        form.append('folder', folder);

        const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: form,
        });
        if (!upRes.ok) {
          const text = await upRes.text().catch(() => '');
          throw new Error(`Cloudinary a refusé l'upload (${upRes.status}). ${text.slice(0, 200)}`);
        }
        const data = (await upRes.json()) as {
          secure_url?: string;
          public_id?: string;
          error?: { message: string };
        };
        if (!data.secure_url) {
          throw new Error(data.error?.message ?? 'Réponse Cloudinary inattendue.');
        }

        const transform = VARIANT_TRANSFORMS[variant] ?? '';
        onChange(applyTransform(data.secure_url, transform));
        setStatus({ kind: 'idle' });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Erreur inconnue.';
        setStatus({ kind: 'error', message });
      }
    },
    [maxSizeMB, onChange, variant],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void upload(file);
    },
    [upload],
  );

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    e.target.value = ''; // allow re-picking same file
  };

  const applyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      const u = new URL(trimmed);
      if (!/^https?:$/.test(u.protocol)) throw new Error('http/https uniquement');
      onChange(trimmed);
      setUrlInput('');
      setStatus({ kind: 'idle' });
    } catch {
      setStatus({ kind: 'error', message: 'URL invalide.' });
    }
  };

  const clear = () => {
    onChange(null);
    setStatus({ kind: 'idle' });
  };

  /* ── render ──────────────────────────────────────────────── */

  const hasValue = Boolean(value);
  const uploading = status.kind === 'uploading';
  const errorMsg = status.kind === 'error' ? status.message : null;

  return (
    <div>
      {label && (
        <div style={{
          ...mono, fontSize: 10, fontWeight: 700,
          color: LRH.mute, letterSpacing: '0.14em',
          textTransform: 'uppercase', marginBottom: 6,
        }}>{label}</div>
      )}

      {/* Preview or Drop Zone */}
      {hasValue ? (
        <div style={{
          position: 'relative',
          background: '#fff',
          border: '1px solid ' + LRH.hairStrong,
          padding: 10,
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <img
            src={value!}
            alt="aperçu"
            style={{
              width: 120, height: Math.min(height - 20, 100),
              objectFit: 'cover',
              background: LRH.paperWarm,
              border: '1px solid ' + LRH.hair,
              flexShrink: 0,
            }}
            onError={() => setStatus({ kind: 'error', message: 'Image inaccessible à cette URL.' })}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...mono, fontSize: 10, color: LRH.mute,
              letterSpacing: '0.1em', wordBreak: 'break-all',
              lineHeight: 1.45, maxHeight: 56, overflow: 'hidden',
            }}>{value}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  ...body, fontSize: 11, fontWeight: 700,
                  padding: '6px 12px', borderRadius: 4,
                  background: 'transparent', color: LRH.navy,
                  border: '1px solid ' + LRH.navy, cursor: uploading ? 'wait' : 'pointer',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}
              >Remplacer</button>
              <button
                type="button"
                onClick={clear}
                disabled={uploading}
                style={{
                  ...body, fontSize: 11, fontWeight: 700,
                  padding: '6px 12px', borderRadius: 4,
                  background: 'transparent', color: LRH.red,
                  border: '1px solid ' + LRH.red, cursor: uploading ? 'wait' : 'pointer',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}
              >Retirer</button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) fileInputRef.current?.click(); }}
          style={{
            position: 'relative',
            height,
            background: isDragging ? 'rgba(243,188,28,0.08)' : '#fff',
            border: `1px dashed ${isDragging ? LRH.gold : LRH.hairStrong}`,
            cursor: uploading ? 'wait' : 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, transition: 'all 0.15s',
          }}
        >
          {/* Decorative diagonal stripe pattern */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(112deg, rgba(10,18,32,0.02) 0 1px, transparent 1px 22px)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 6,
          }}>
            {uploading ? (
              <>
                <div style={{
                  width: 28, height: 28, border: '3px solid ' + LRH.hair,
                  borderTopColor: LRH.navy, borderRadius: '50%',
                  animation: 'lrh-spin 0.8s linear infinite',
                }} />
                <div style={{
                  ...mono, fontSize: 10.5, fontWeight: 700,
                  color: LRH.navy, letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}>Téléversement…</div>
              </>
            ) : (
              <>
                <div style={{
                  width: 36, height: 36,
                  background: isDragging ? LRH.gold : LRH.navy,
                  color: isDragging ? LRH.navy : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...display, fontWeight: 800, fontSize: 22,
                }}>↑</div>
                <div style={{
                  ...mono, fontSize: 11, fontWeight: 700,
                  color: LRH.navy, letterSpacing: '0.12em',
                  textTransform: 'uppercase', marginTop: 4,
                }}>
                  {isDragging ? 'Déposez ici' : 'Glissez ou cliquez pour parcourir'}
                </div>
                <div style={{
                  ...mono, fontSize: 9.5, color: LRH.mute,
                  letterSpacing: '0.08em', marginTop: 2,
                }}>
                  PNG · JPG · WEBP · SVG — max {maxSizeMB} Mo
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={onPickFile}
        style={{ display: 'none' }}
      />

      {/* URL paste row */}
      <div style={{
        marginTop: 10, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          ...mono, fontSize: 9.5, fontWeight: 700,
          color: LRH.mute, letterSpacing: '0.12em',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>ou&nbsp;URL</div>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } }}
          placeholder="https://res.cloudinary.com/... ou autre URL"
          style={{
            ...body, fontSize: 13,
            flex: 1, padding: '8px 10px',
            border: '1px solid ' + LRH.hairStrong,
            borderRadius: 4, background: '#fff',
            color: LRH.ink, minWidth: 0,
          }}
        />
        <button
          type="button"
          onClick={applyUrl}
          disabled={!urlInput.trim()}
          style={{
            ...body, fontSize: 11, fontWeight: 700,
            padding: '8px 12px', borderRadius: 4,
            background: urlInput.trim() ? LRH.navy : LRH.paperWarm,
            color: urlInput.trim() ? '#fff' : LRH.mute,
            border: 'none', cursor: urlInput.trim() ? 'pointer' : 'not-allowed',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >Utiliser</button>
      </div>

      {hint && (
        <div style={{
          ...mono, fontSize: 9.5, color: LRH.mute,
          letterSpacing: '0.06em', marginTop: 6,
        }}>{hint}</div>
      )}

      {errorMsg && (
        <div style={{
          ...mono, fontSize: 10.5, fontWeight: 600,
          color: LRH.red, letterSpacing: '0.06em',
          marginTop: 8, padding: '8px 10px',
          background: 'rgba(168,32,47,0.06)',
          border: '1px solid rgba(168,32,47,0.2)',
        }}>⚠ {errorMsg}</div>
      )}

      {/* Inline keyframe for spinner */}
      <style>{`@keyframes lrh-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
