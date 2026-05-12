// LRH design tokens — shared across all artboards
const LRH = {
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
const mono = { fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.02em' };
const display = { fontFamily: '"Poppins", system-ui, sans-serif' };
const body = { fontFamily: '"Montserrat", system-ui, sans-serif' };

// Hero placeholder — diagonal-striped intentional placeholder, plus subtle vignette
// Returns inline style for a hero image well.
function heroPlaceholderStyle({ tone = 'gazon' } = {}) {
  // gazon = field hockey -> sun-baked turf greens
  // salle = indoor hockey -> hardwood / parquet warmth
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

// little inline mark — uses the LRH brand colors as a flat geometric monogram.
// Kept simple per system rules (no complex svg).
function LrhMark({ size = 28, dark = false }) {
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

function LrhLockup({ height = 36, white = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <img src={(window.__resources && window.__resources.iconeLrh) || 'assets/icone-lrh.svg'} alt="" style={{ height, width: 'auto', display: 'block' }} />
      <div style={{ ...display, lineHeight: 1, color: white ? '#fff' : LRH.navy }}>
        <div style={{ fontWeight: 800, fontSize: height * 0.42, letterSpacing: '-0.01em' }}>LIGUE</div>
        <div style={{ fontWeight: 500, fontSize: height * 0.26, letterSpacing: '0.06em', opacity: 0.72, marginTop: 2 }}>RÉUNIONNAISE&nbsp;DE&nbsp;HOCKEY</div>
      </div>
    </div>
  );
}

// Real club registry — official logos provided by LRH.
function clubSrc(id) {
  const map = {
    HCO:  (window.__resources && window.__resources.hco)  || 'assets/clubs/hco.png',
    HCP:  (window.__resources && window.__resources.hcp)  || 'assets/clubs/hcp.png',
    HHS:  (window.__resources && window.__resources.hhs)  || 'assets/clubs/hhs.png',
    SDHC: (window.__resources && window.__resources.sdhc) || 'assets/clubs/sdhc.png',
    USPG: (window.__resources && window.__resources.uspg) || 'assets/clubs/uspg.png',
  };
  return map[id] || null;
}
const CLUBS = {
  HCO:  { name: 'HC de l\'Ouest',        full: 'Hockey Club de l\'Ouest — Saint-Paul', short: 'Saint-Paul' },
  HCP:  { name: 'HC La Possession',      full: 'Hockey Club de la Possession',          short: 'La Possession' },
  HHS:  { name: 'Hockey Horizon Sud',    full: 'Hockey Horizon Sud — Club du Tampon',   short: 'Le Tampon' },
  SDHC: { name: 'Saint-Denis HC',        full: 'Saint-Denis Hockey Club',               short: 'Saint-Denis' },
  USPG: { name: 'USPG Le Port',          full: 'Union Sportive Portoise — Hockey',      short: 'Le Port' },
};

function clubName(id) { return (CLUBS[id] && CLUBS[id].name) || id; }
function clubShort(id) { return (CLUBS[id] && CLUBS[id].short) || id; }

// ClubCrest — renders the real club logo when an `id` is provided; falls back
// to a colored monogram for sponsors/placeholders.
function ClubCrest({ id, initials, primary, secondary = '#fff', size = 40 }) {
  if (id && CLUBS[id]) {
    const c = CLUBS[id];
    const src = clubSrc(id);
    if (src) {
      return (
        <img src={src} alt={c.name}
             style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block', flexShrink: 0 }} />
      );
    }
    // No image — monogram fallback using the club's own initials + brand color.
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

// Striped intentional image placeholder. Tag in corner says what should go there.
function ImageSlot({ label, height = 200, tone = 'sun', radius = 12, style = {} }) {
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

Object.assign(window, { LRH, mono, display, body, heroPlaceholderStyle, LrhMark, LrhLockup, ClubCrest, ImageSlot, CLUBS, clubName, clubShort });
