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

export function LrhMark({ size = 28, white = false }: { size?: number, white?: boolean }) {
  const navy = white ? '#fff' : '#072854';
  const red = '#A8202F';
  const gold = '#F3BC1C';
  return (
    <svg width={size * 2.8} height={size} viewBox="1000 1300 2200 900" xmlns="http://www.w3.org/2000/svg">
      <g id="LRH-Complet-logo">
        <path id="L" d="M1053.362,1350l218.569,0l-183.851,825.95l323.154,0l-46.273,214.05l-543.845,0l232.246,-1040Z" style={{ fill: navy }}></path>
        <g id="R">
          <g id="Icone-Badge">
            <rect x="1717.649" y="1421.905" width="460.318" height="504.209" style={{ fill: red }}></rect>
            <path d="M1717.649,1654.844l0,-47.859l142.749,19.614c2.701,-7.858 6.567,-15.246 11.412,-21.994l-154.161,-78.817l0,-63.155l168.679,126.119c6.127,-5.3 13.008,-9.877 20.48,-13.583l-110.811,-153.265l61.362,0c20.373,45.805 48.307,107.261 66.301,146.712c8.532,-2.472 17.574,-3.893 26.943,-4.096l-19.324,-142.616l51.056,0l-17.826,143.216c7.926,0.863 15.561,2.602 22.784,5.107l63.655,-148.323l67.834,0l-116.44,154.958c7.534,4.09 14.413,9.086 20.455,14.824l155.171,-117.947l0,66.999l-141.867,66.808c4.184,6.356 7.521,13.23 9.869,20.491l131.999,-19.99l0,46.797l-128.034,0l110.553,156.4l-159.538,-156.4l-68.985,14.724l-196.127,144.671l124.301,-159.395l-142.489,0Z" style={{ fill: gold }}></path>
            <path d="M1717.649,1832.654l180.66,-198.385c0,0 19.054,28.08 45.128,18.051c26.074,-10.028 41.117,-45.128 63.18,-17.048c13.233,16.843 102.235,118.113 171.35,196.469l0,94.357l-460.318,0l0,-93.444Z" style={{ fill: red }}></path>
            <path d="M1717.649,1855.958l162.569,-133.999l-15.404,37.868l37.226,-43.002c0,0 3.209,46.211 32.733,87.288c29.524,41.077 32.733,43.644 32.733,43.644l-82.153,77.019l-167.703,0.878l0,-69.695Z" style={{ fill: navy }}></path>
            <path d="M2177.968,1855.76l0,70.036c-94.318,-0.292 -234.253,-0.573 -239.344,0.302c-7.702,1.324 50.704,-80.268 50.704,-80.268c0,0 -1.925,1.284 -35.942,-50.062c-34.017,-51.346 -17.329,-62.899 -17.329,-62.899c25.031,23.106 74.452,-16.046 74.452,-16.046l167.459,138.937Z" style={{ fill: navy }}></path>
          </g>
          <path id="R1" d="M1661.685,1350l354.845,0c0,0 303.006,-14.862 301.498,287.128c-17.777,299.956 -243.541,374.057 -243.541,374.057l147.166,378.815l-242.392,0l-121.822,-345.2l-130.789,0l-75.575,345.2l-217.353,0l227.963,-1040Z" style={{ fill: navy }}></path>
        </g>
        <g id="H">
          <path id="Haut-H" d="M2318.033,1959.114l144.122,-609.233l210.869,0.119l-92.684,410.527c0,0 -126.809,22.229 -262.307,198.587Z" style={{ fill: navy }}></path>
          <path id="Bas-H" d="M3082.831,1782.487l-132.879,607.513l-219.629,0l97.467,-430.886l-288.771,0l-96.943,430.886l-143.892,0l-48.226,-111.569c0,0 40.392,-454.315 423.066,-495.944l229.8,0l110.17,-257.698c0,0 2.525,-17.364 -9.623,-15.278c-20.132,3.457 -78.333,-10.557 -87.456,-60.642c-2.94,-16.138 -2.309,-36.181 12.556,-60.904c43.456,-72.274 160.337,-25.998 154.361,-26.809c0,0 89.552,31.381 95.895,135.022c3.7,60.457 -40.129,150.324 -40.129,150.324l-55.765,135.985Zm-143.034,0c122.1,7.261 131.067,-71.977 131.067,-71.977l-85.562,-31.986l-45.505,103.963Zm139.863,-94.267l10.869,-26.138l-86.436,-34.161l-10.869,26.576l86.436,33.723Zm20.962,-48.653l10.869,-26.138l-86.436,-34.161l-10.869,26.576l86.436,33.723Zm20.561,-50.718c0,0 10.352,-9.072 21.027,-66.587c10.675,-57.515 -33.643,-104.811 -33.643,-104.811c0,0 -41.73,-39.789 -93.165,-38.819c-51.435,0.97 -63.08,32.996 -65.992,43.671c-2.911,10.675 1.665,29.825 12.293,40.869c16.498,17.145 55.317,14.557 55.317,14.557c38.819,10.675 26.203,54.831 26.203,54.831l-7.764,22.644l85.725,33.643Z" style={{ fill: navy }}></path>
        </g>
      </g>
    </svg>
  );
}

// Logo complet officiel — L · R · H avec badge (carte de la Réunion + volcan).
// viewBox 2380×1060 ≈ ratio 2.245
const LRH_LOGO_RATIO = 2380 / 1060;

export function LrhLockup({ height = 36, white = false }: { height?: number, white?: boolean }) {
  return (
    <img
      src="/assets/logo-complet-lrh.svg"
      alt="Ligue Réunionnaise de Hockey"
      style={{
        height,
        width: height * LRH_LOGO_RATIO,
        display: 'block',
        // sur fond foncé, on inverse en blanc pur (footer / dashboard)
        filter: white ? 'brightness(0) invert(1)' : undefined,
      }}
    />
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

function CrestVisual({ id, initials, primary, secondary = '#fff', size = 40 }: { id?: string, initials?: string, primary?: string, secondary?: string, size?: number }) {
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

export function ClubCrest({ id, initials, primary, secondary = '#fff', size = 40, slug }: { id?: string, initials?: string, primary?: string, secondary?: string, size?: number, slug?: string }) {
  const crest = <CrestVisual id={id} initials={initials} primary={primary} secondary={secondary} size={size} />;
  const targetSlug = slug ?? (id ? id.toLowerCase() : undefined);
  if (!targetSlug) return crest;
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
