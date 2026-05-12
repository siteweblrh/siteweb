import React from 'react';

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

export function LrhMark({ size = 28, dark = false }: { size?: number, dark?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: LRH.navy, color: LRH.gold,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      ...display, fontWeight: 800, fontSize: size * 0.42, letterSpacing: '-0.02em',
      border: dark ? '1px solid rgba(255,255,255,0.08)' : 'none',
      flexShrink: 0,
    }}>
      <span style={{ color: LRH.gold }}>L</span>
      <span style={{ color: '#fff' }}>R</span>
      <span style={{ color: LRH.red }}>H</span>
    </div>
  );
}

export function LrhLockup({ height = 36, white = false }: { height?: number, white?: boolean }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <img src={'/lrh-website/assets/icone-lrh.svg'} alt="" style={{ height, width: 'auto', display: 'block' }} />
      <div style={{ ...display, lineHeight: 1, color: white ? '#fff' : LRH.navy }}>
        <div style={{ fontWeight: 800, fontSize: height * 0.42, letterSpacing: '-0.01em' }}>LIGUE</div>
        <div style={{ fontWeight: 500, fontSize: height * 0.26, letterSpacing: '0.06em', opacity: 0.72, marginTop: 2 }}>RÉUNIONNAISE&nbsp;DE&nbsp;HOCKEY</div>
      </div>
    </div>
  );
}

export const CLUBS: Record<string, { name: string, full: string, short: string, primary?: string, initials?: string }> = {
  HCO:  { name: 'HC de l\'Ouest',        full: 'Hockey Club de l\'Ouest — Saint-Paul', short: 'Saint-Paul' },
  HCP:  { name: 'HC La Possession',      full: 'Hockey Club de la Possession',          short: 'La Possession' },
  HHS:  { name: 'Hockey Horizon Sud',    full: 'Hockey Horizon Sud — Club du Tampon',   short: 'Le Tampon' },
  SDHC: { name: 'Saint-Denis HC',        full: 'Saint-Denis Hockey Club',               short: 'Saint-Denis' },
  USPG: { name: 'USPG Le Port',          full: 'Union Sportive Portoise — Hockey',      short: 'Le Port' },
};

export function clubSrc(id: string) {
  const map: Record<string, string> = {
    HCO:  '/lrh-website/assets/clubs/hco.png',
    HCP:  '/lrh-website/assets/clubs/hcp.png',
    HHS:  '/lrh-website/assets/clubs/hhs.png',
    SDHC: '/lrh-website/assets/clubs/sdhc.png',
    USPG: '/lrh-website/assets/clubs/uspg.png',
  };
  return map[id] || null;
}

export function clubName(id: string) { return (CLUBS[id] && CLUBS[id].name) || id; }
export function clubShort(id: string) { return (CLUBS[id] && CLUBS[id].short) || id; }

export function ClubCrest({ id, initials, primary, secondary = '#fff', size = 40 }: { id?: string, initials?: string, primary?: string, secondary?: string, size?: number }) {
  if (id && CLUBS[id]) {
    const c = CLUBS[id];
    const src = clubSrc(id);
    if (src) {
      return (
        <img src={src} alt={c.name}
             style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block', flexShrink: 0 }} />
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
  return (
    <button style={{
      ...body, fontWeight: 700, fontSize: isLg ? 14 : 12.5,
      color: p.fg, background: p.bg,
      border: p.border || 'none', borderRadius: 8,
      padding: isLg ? '14px 22px' : '10px 18px',
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
