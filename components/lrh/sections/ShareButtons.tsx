'use client';

import React, { useState } from 'react';
import { LRH, mono } from '../tokens';

const SITE_ORIGIN = 'https://lrh.re';

/**
 * Boutons de partage social pour les articles. Stateless côté props (path +
 * title), les URLs absolues sont construites au click avec window.location
 * (origin local en dev, lrh.re en prod). Le copy-link utilise l'API
 * navigator.clipboard avec un fallback texte sélectionnable.
 *
 * Pas de tracking, pas de SDK lourd — juste des `window.open()` sur les URLs
 * d'intent officielles de chaque plateforme.
 */
export function ShareButtons({
  path,
  title,
  mobileVariant = false,
}: {
  /** Chemin relatif vers l'article, ex. "/actualites/mon-slug". */
  path: string;
  title: string;
  mobileVariant?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const getFullUrl = () => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}${path}`;
    }
    return `${SITE_ORIGIN}${path}`;
  };

  const share = (kind: 'facebook' | 'x' | 'linkedin' | 'whatsapp' | 'email') => {
    const fullUrl = getFullUrl();
    const u = encodeURIComponent(fullUrl);
    const t = encodeURIComponent(title);
    const targets: Record<typeof kind, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      email: `mailto:?subject=${t}&body=${u}`,
    };
    if (kind === 'email') {
      window.location.href = targets.email;
    } else {
      window.open(targets[kind], '_blank', 'noopener,noreferrer,width=720,height=580');
    }
  };

  const copyLink = async () => {
    const fullUrl = getFullUrl();
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      // Fallback : sélection manuelle (rare, sans HTTPS context)
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div
      style={{
        padding: mobileVariant ? '18px 16px' : '22px 24px',
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${LRH.gold}`,
        marginTop: mobileVariant ? 24 : 32,
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 700,
          color: LRH.red,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        ▸ Partager cet article
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <ShareBtn label="Facebook" color="#1877F2" onClick={() => share('facebook')}>
          {iconFacebook}
        </ShareBtn>
        <ShareBtn label="X (Twitter)" color="#000" onClick={() => share('x')}>
          {iconX}
        </ShareBtn>
        <ShareBtn label="LinkedIn" color="#0A66C2" onClick={() => share('linkedin')}>
          {iconLinkedin}
        </ShareBtn>
        <ShareBtn label="WhatsApp" color="#25D366" onClick={() => share('whatsapp')}>
          {iconWhatsapp}
        </ShareBtn>
        <ShareBtn label="Email" color={LRH.navy} onClick={() => share('email')}>
          {iconMail}
        </ShareBtn>
        <ShareBtn
          label={copied ? 'Copié !' : 'Copier le lien'}
          color={copied ? '#1d6b3f' : LRH.mute}
          onClick={copyLink}
        >
          {copied ? iconCheck : iconLink}
        </ShareBtn>
      </div>
    </div>
  );
}

function ShareBtn({
  label,
  color,
  onClick,
  children,
}: {
  label: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 14px',
        background: '#fff',
        color,
        border: `1px solid ${color}`,
        cursor: 'pointer',
        ...mono,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = color;
        (e.currentTarget as HTMLButtonElement).style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = '#fff';
        (e.currentTarget as HTMLButtonElement).style.color = color;
      }}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

/* ─────────────────────── Icônes SVG inline (16×16) ─────────────────────── */

const iconFacebook = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
  </svg>
);

const iconX = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const iconLinkedin = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.27 2.38 4.27 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM3.56 20.45h3.56V9H3.56v11.45zM22.22 0H1.77C.79 0 0 .78 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .78 23.2 0 22.22 0z" />
  </svg>
);

const iconWhatsapp = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
  </svg>
);

const iconMail = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <polyline points="3,7 12,13 21,7" />
  </svg>
);

const iconLink = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);

const iconCheck = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
    <polyline points="5,12 10,17 19,7" />
  </svg>
);
