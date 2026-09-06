import React from 'react';
import Link from 'next/link';

// LRH design tokens — shared across all artboards
export const LRH = {
  navy:    '#002244',
  navyDeep:'#001833',
  red:     '#A8202F',
  redDeep: '#8B1825',
  gold:    '#F3BC1C',
  goldSoft:'#FFE07A',
  paper:   '#F8F9FA',
  paperWarm:'#F1EFE9',
  ink:     '#0B1220',
  ink2:    '#1F2937',
  mute:    '#6B7280',
  hair:    'rgba(10,18,32,0.08)',
  hairStrong:'rgba(10,18,32,0.14)',
};

// Couleurs sémantiques par discipline — utilisées pour les badges, accents et
// strips de carte sur tout ce qui distingue Gazon / Salle.
//   - Gazon : vert profond (rappel du terrain)
//   - Salle : ambre terre cuite (rappel du parquet indoor)
export const MODE_COLOR = {
  GAZON: { bg: '#1d6b3f', fg: '#fff', soft: 'rgba(29,107,63,0.08)', label: 'Gazon' },
  SALLE: { bg: '#C9531A', fg: '#fff', soft: 'rgba(201,83,26,0.08)', label: 'Salle' },
} as const;

export type ModeKey = keyof typeof MODE_COLOR;

// Catégories suggérées dans les formulaires de création de compétition.
// Liste éditable côté admin (Competition.category est `String` libre).
export const CATEGORY_SUGGESTIONS = [
  'Sénior',
  'Sénior Féminines',
  'Junior',
  'U18',
  'U16',
  'U14',
  'U11',
  'U9',
  'Loisir',
  'Vétérans',
] as const;

// Petits accents typés selon la catégorie. Sert à colorer la pastille catégorie
// dans les listes / formulaires. Pour les valeurs non listées, on retombe sur navy.
const CATEGORY_ACCENTS: Record<string, string> = {
  'Sénior': '#002244',           // navy — le standard
  'Sénior Féminines': '#B83A8F', // rose magenta
  'Junior': '#1E4FAE',           // bleu intermédiaire
  'U18': '#2E7AC9',
  'U16': '#1F9DAF',
  'U14': '#5BAF1F',
  'U11': '#A8B81F',
  'U9':  '#C29A1A',
  'Loisir': '#6B7280',           // gris — sport plaisir
  'Vétérans': '#5C4033',
};

export function categoryAccent(category: string): string {
  return CATEGORY_ACCENTS[category] ?? LRH.navy;
}

// monospace stencil — used for tags, timecodes, sponsor microcopy
export const mono = { fontFamily: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.02em' };
export const display = { fontFamily: 'var(--font-poppins), system-ui, sans-serif' };
export const body = { fontFamily: 'var(--font-montserrat), system-ui, sans-serif' };

// Hero placeholder — diagonal-striped intentional placeholder, plus subtle vignette
export function heroPlaceholderStyle({ tone = 'gazon' }: { tone?: 'gazon' | 'salle' } = {}) {
  if (tone === 'salle') {
    return {
      backgroundColor: '#3a2418',
      backgroundImage: [
        'radial-gradient(ellipse at 70% 30%, rgba(243,188,28,0.35), transparent 55%)',
        'radial-gradient(ellipse at 20% 90%, rgba(168,32,47,0.35), transparent 60%)',
        'repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 38px)',
        'linear-gradient(180deg, #4a2c1a 0%, #2b1810 100%)',
      ].join(','),
    };
  }
  return {
    backgroundColor: '#1d3522',
    backgroundImage: [
      'radial-gradient(ellipse at 80% 20%, rgba(243,188,28,0.45), transparent 50%)',
      'radial-gradient(ellipse at 15% 85%, rgba(0,34,68,0.55), transparent 55%)',
      'repeating-linear-gradient(95deg, rgba(0,0,0,0.10) 0 3px, transparent 3px 28px)',
      'linear-gradient(180deg, #2a4f33 0%, #0f2a1b 100%)',
    ].join(','),
  };
}

// Logos officiels — la ligue conserve son logo historique (mai 2026).
// Deux fichiers fournis, carrés (viewBox 1080×1080, ratio 1:1), multicolores.
// INTERDIT de modifier les SVG : on les affiche tels quels via <img>.
//  - site    : header public + dashboard
//  - officiel : footer + génération PDF
const SITE_LOGO_SRC = '/assets/logo-ligue-officiel-site.svg';
const OFFICIAL_LOGO_SRC = '/assets/logo-ligue-officiel.svg';
const LRH_LOGO_RATIO = 1; // 1080×1080

/**
 * Logo officiel LRH affiché en petit (dashboard sidebar / topbar).
 *
 * Le logo historique est multicolore : on l'affiche tel quel (`<img>`, AUCUNE
 * recoloration). Comme le fond du dashboard est navy et que le logo contient
 * lui-même du navy, on le pose dans un cartouche blanc carré pour la lisibilité
 * — même traitement que `LrhLockup white`.
 */
export function LrhWordmark({ height = 28 }: { height?: number }) {
  const pad = Math.max(3, Math.round(height * 0.1));
  const inner = height - pad * 2;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        borderRadius: 6,
        padding: pad,
        lineHeight: 0,
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SITE_LOGO_SRC}
        alt="Ligue Réunionnaise de Hockey"
        width={inner}
        height={inner}
        style={{ width: inner, height: inner, display: 'block' }}
      />
    </span>
  );
}

export function LrhLockup({
  height = 64,
  white = false,
  variant = 'complet',
}: {
  height?: number;
  white?: boolean;
  variant?: 'complet' | 'uni';
}) {
  // variant 'uni' = logo "officiel" (footer / PDF), 'complet' = logo "site"
  // (header public). Les deux sont carrés (ratio 1:1) et affichés tels quels.
  const src = variant === 'uni' ? OFFICIAL_LOGO_SRC : SITE_LOGO_SRC;
  // Width explicite calculée depuis le ratio pour éviter le CLS (le navigateur
  // doit savoir l'espace à réserver AVANT le téléchargement de l'image).
  const width = Math.round(height * LRH_LOGO_RATIO);
  // eslint-disable-next-line @next/next/no-img-element
  const img = (
    <img
      src={src}
      alt="Ligue Réunionnaise de Hockey"
      width={width}
      height={height}
      style={{ height, width, display: 'block' }}
    />
  );
  // Sur fond sombre, on garde les couleurs d'origine du logo et on ajoute
  // un cartouche blanc autour pour la lisibilité (au lieu du filter
  // brightness/invert qui écrasait la charte navy/red/gold).
  if (!white) return img;
  const pad = Math.max(6, Math.round(height * 0.12));
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        padding: `${pad}px ${pad * 1.5}px`,
        borderRadius: 6,
        lineHeight: 0,
      }}
    >
      {img}
    </div>
  );
}

export const CLUBS: Record<string, { name: string, full: string, short: string, primary?: string, initials?: string }> = {
  HCO:  { name: 'HC de l\'Ouest',        full: 'Hockey Club de l\'Ouest — Saint-Paul', short: 'Saint-Paul' },
  HCP:  { name: 'HC La Possession',      full: 'Hockey Club de la Possession',          short: 'La Possession' },
  HHS:  { name: 'Hockey Horizon Sud',    full: 'Hockey Horizon Sud — Club du Tampon',   short: 'Le Tampon' },
  SDHC: { name: 'Saint-Denis HC',        full: 'Saint-Denis Hockey Club',               short: 'Saint-Denis' },
  USPG: { name: 'USPG Le Port',          full: 'Union Sportive de la Pointe des Galets', short: 'Le Port' },
  AZO:  { name: "Zarlors de l'Ouest",    full: "Association Zarlors de l'Ouest — Saint-Paul", short: 'Saint-Paul', initials: 'AZO' },
};

export function clubSrc(id: string): string | null {
  // Seuls les clubs autonomes ont un logo image (les ententes utilisent
  // les initials par défaut).
  const fileSlug = clubFileSlug(id);
  return fileSlug ? `/assets/clubs/${fileSlug}.png` : null;
}

/** Slug filesystem (pour les fichiers logos PNG/WebP). */
function clubFileSlug(id: string): string | null {
  switch (id) {
    case 'HCO':  return 'hco';
    case 'HCP':  return 'hcp';
    case 'HHS':  return 'hhs';
    case 'SDHC': return 'sdhc';
    case 'USPG': return 'uspg';
    default:     return null;
  }
}

/**
 * Slug URL utilisé pour les liens vers /clubs/{slug}. Différent de
 * clubFileSlug() car les ententes ont un slug DB (entente-hcp-hcd) ≠ shortCode
 * lowercase (hcp_hcd qui donnerait 404).
 */
export function clubLinkSlug(id: string): string {
  switch (id) {
    case 'HCO':      return 'hco';
    case 'HCP':      return 'hcp';
    case 'HHS':      return 'hhs';
    case 'SDHC':     return 'sdhc';
    case 'USPG':     return 'uspg';
    case 'AZO':      return 'zarlors-ouest';
    case 'HCP_HCD':  return 'entente-hcp-hcd';
    case 'SDHC_HHS': return 'entente-sdhc-hhs';
    // Entente a 3 clubs engagee en salle 2026-2027 a la place du SDHC seul.
    case 'SDHC_HHS_AZO': return 'entente-sdhc-hhs-azo';
    default:         return id.toLowerCase();
  }
}

export function clubName(id: string) { return (CLUBS[id] && CLUBS[id].name) || id; }
export function clubShort(id: string) { return (CLUBS[id] && CLUBS[id].short) || id; }

function CrestVisual({ id, initials, primary, secondary = '#fff', size = 40 }: { id?: string, initials?: string, primary?: string, secondary?: string, size?: number }) {
  if (id && CLUBS[id]) {
    const c = CLUBS[id];
    const slug = clubFileSlug(id);
    if (slug) {
      // <picture> avec srcset WebP 64/128/256 + PNG fallback 128px.
      // Les fichiers source pèsent ~3-15 KB chacun (cf.
      // scripts/optimize-club-logos.mjs). Le navigateur choisit la variante
      // selon DPR (1x → 64w, 2x → 128w, 3x → 256w).
      const base = `/assets/clubs/${slug}`;
      return (
        <picture style={{ display: 'inline-flex', flexShrink: 0 }}>
          <source
            type="image/webp"
            srcSet={`${base}-64.webp 1x, ${base}-128.webp 2x, ${base}-256.webp 3x`}
          />
          <img
            src={`${base}.png`}
            alt={c.name}
            width={size}
            height={size}
            loading="lazy"
            decoding="async"
            style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block', flexShrink: 0 }}
          />
        </picture>
      );
    }
    return (
      <div style={{
        width: size, height: size,
        background: c.primary || LRH.navy, color: '#fff',
        clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)',
        ...display, fontWeight: 800,
        fontSize: size * 0.30, letterSpacing: '-0.02em',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        paddingBottom: size * 0.12,
        flexShrink: 0,
      }}>{c.initials || id}</div>
    );
  }
  return (
    <div style={{
      width: size, height: size,
      background: primary || LRH.navy, color: secondary,
      clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)',
      ...display, fontWeight: 800,
      fontSize: size * 0.36, letterSpacing: '-0.02em',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      paddingBottom: size * 0.12,
      flexShrink: 0,
    }}>{initials}</div>
  );
}

export function ClubCrest({ id, initials, primary, secondary = '#fff', size = 40, slug, noLink = false }: { id?: string, initials?: string, primary?: string, secondary?: string, size?: number, slug?: string, noLink?: boolean }) {
  const crest = <CrestVisual id={id} initials={initials} primary={primary} secondary={secondary} size={size} />;
  // Important : utiliser clubLinkSlug() pour mapper les ententes
  // (HCP_HCD → entente-hcp-hcd) au lieu d'un simple toLowerCase qui
  // donnait /clubs/hcp_hcd → 404.
  const targetSlug = slug ?? (id ? clubLinkSlug(id) : undefined);
  if (!targetSlug || noLink) return crest;
  return (
    <Link href={`/clubs/${targetSlug}`} style={{ display: 'inline-flex', textDecoration: 'none', flexShrink: 0 }} aria-label={id && CLUBS[id] ? CLUBS[id].name : 'Voir le club'}>
      {crest}
    </Link>
  );
}

export function ImageSlot({ label, height = 200, tone = 'sun', radius = 12, style = {} }: { label: string, height?: number | string, tone?: 'sun' | 'turf' | 'indoor' | 'paper' | 'navy', radius?: number, style?: React.CSSProperties }) {
  const tones = {
    sun:    'linear-gradient(135deg, #f3bc1c 0%, #a8202f 100%)',
    turf:   'linear-gradient(135deg, #1d3522 0%, #002244 100%)',
    indoor: 'linear-gradient(135deg, #3a2418 0%, #002244 100%)',
    paper:  'linear-gradient(135deg, #e8e4d8 0%, #c8c1ad 100%)',
    navy:   'linear-gradient(135deg, #002244 0%, #001022 100%)',
  };
  return (
    <div style={{
      position: 'relative',
      height, borderRadius: radius, overflow: 'hidden',
      background: tones[tone] || tones.sun,
      ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 8px, transparent 8px 22px)',
      }} />
      <div style={{
        position: 'absolute', left: 12, bottom: 10,
        ...mono, fontSize: 10, color: 'rgba(255,255,255,0.78)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
      }}>{label}</div>
      <div style={{
        position: 'absolute', right: 12, top: 10,
        ...mono, fontSize: 9, color: 'rgba(255,255,255,0.45)',
      }}>● REC</div>
    </div>
  );
}

export function CTAButton({ children, variant = 'red', size = 'md' }: { children: React.ReactNode, variant?: 'red' | 'gold' | 'navy' | 'ghost', size?: 'md' | 'lg' }) {
  const isLg = size === 'lg';
  const palettes = {
    red:   { bg: LRH.red,  fg: '#fff',     hover: LRH.redDeep, border: undefined },
    gold:  { bg: LRH.gold, fg: LRH.navy,   hover: '#E0A810', border: undefined },
    navy:  { bg: LRH.navy, fg: '#fff',     hover: LRH.navyDeep, border: undefined },
    ghost: { bg: 'transparent', fg: LRH.navy, border: '1px solid ' + LRH.hairStrong },
  };
  const p = palettes[variant];
  // `minHeight` garantit la cible tactile WCAG (≥48×48px sur lg, ≥44 sur md)
  // même si la police hérite d'un line-height plus serré dans certains contextes.
  return (
    <button style={{
      ...body, fontWeight: 700, fontSize: isLg ? 14 : 12.5,
      color: p.fg, background: p.bg,
      border: p.border || 'none', borderRadius: 8,
      padding: isLg ? '14px 24px' : '11px 18px',
      minHeight: isLg ? 48 : 44,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10,
    }}>
      {children}
      <span style={{ ...mono, fontSize: 12, opacity: 0.8 }}>→</span>
    </button>
  );
}

export function Card({ children, dark = false, style = {} }: { children: React.ReactNode, dark?: boolean, style?: React.CSSProperties, hoverShadow?: boolean }) {
  return (
    <div style={{
      background: dark ? LRH.navy : '#fff',
      color: dark ? '#fff' : LRH.ink,
      borderRadius: 16,
      border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid ' + LRH.hair,
      padding: 24, position: 'relative', overflow: 'hidden',
      ...style,
    }}>{children}</div>
  );
}

export function CardHeader({ kicker, meta }: { kicker: string, meta: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ ...mono, fontSize: 10.5, color: LRH.red, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
        {kicker}
      </div>
      <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>{meta}</div>
    </div>
  );
}

export function CardHeaderDark({ kicker, meta }: { kicker: string, meta: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ ...mono, fontSize: 10.5, color: LRH.gold, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
        {kicker}
      </div>
      <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>{meta}</div>
    </div>
  );
}

export function Stat({ n, l }: { n: string, l: string }) {
  return (
    <div>
      <div style={{ ...display, fontWeight: 800, fontSize: 22, color: LRH.navy, letterSpacing: '-0.02em' }}>{n}</div>
      <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{l}</div>
    </div>
  );
}
