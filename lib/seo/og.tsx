/**
 * Helpers communs aux Open Graph images générées via `next/og` (satori).
 *
 * Contraintes satori importantes :
 * - **chaque élément avec plusieurs enfants doit avoir `display: 'flex'`**
 *   (satori refuse `display: block` par défaut, contrairement à un navigateur).
 * - **pas de CSS variables / classes** — uniquement des inline styles.
 * - **fonts** : satori utilise une font système par défaut (Noto Sans). On peut
 *   charger une police custom via `fonts: [{ name, data: ArrayBuffer, … }]`
 *   dans les options de `ImageResponse`. Pour rester simple et éviter un
 *   round-trip Google Fonts à build, on s'en tient au défaut.
 *
 * Format OG standard : 1200×630, image/png.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

/** Palette LRH dupliquée ici pour éviter d'importer `tokens.tsx` (qui contient
 *  des composants React + références CSS qui ne passent pas satori). */
export const OG_COLORS = {
  navy: '#002244',
  navyDeep: '#001833',
  gold: '#F3BC1C',
  red: '#A8202F',
  paper: '#F8F9FA',
  paperWarm: '#F1EFE9',
  ink: '#1A1F2E',
  mute: 'rgba(248,249,250,0.7)',
} as const;

/** Bandeau diagonal (pattern signature LRH). Renvoyé en background CSS prêt à
 *  utiliser dans un parent satori. */
export const OG_DIAGONAL_STRIPES =
  'repeating-linear-gradient(112deg, rgba(255,255,255,0.03) 0 18px, transparent 18px 36px)';

/** Spotlight radial gold dans le coin haut-droit. */
export const OG_GOLD_SPOTLIGHT =
  'radial-gradient(ellipse at top right, rgba(243,188,28,0.25), transparent 60%)';

/** Kicker mono uppercase, signature visuelle LRH. */
export function OgKicker({ children, color = OG_COLORS.gold }: { children: string; color?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: 22,
        fontWeight: 700,
        color,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

/** Pied de page commun à tous les OG : logo texte + URL site. */
export function OgFooter() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingTop: 24,
        borderTop: '2px solid rgba(243,188,28,0.4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 46,
            height: 46,
            background: OG_COLORS.gold,
            color: OG_COLORS.navy,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.04em',
          }}
        >
          LRH
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
            Ligue Réunionnaise de Hockey
          </div>
          <div style={{ fontSize: 13, color: OG_COLORS.mute, letterSpacing: '0.08em' }}>
            HOCKEY GAZON & SALLE · LA RÉUNION
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', fontSize: 14, color: OG_COLORS.mute, letterSpacing: '0.14em' }}>
        LRH.RE
      </div>
    </div>
  );
}

/** Wrapper standard : fond navy + spotlight + stripes + padding. */
export function OgFrame({
  children,
  accentSide,
}: {
  children: React.ReactNode;
  accentSide?: 'gold' | 'red';
}) {
  const accent = accentSide === 'red' ? OG_COLORS.red : OG_COLORS.gold;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: OG_COLORS.navy,
        backgroundImage: `${OG_GOLD_SPOTLIGHT}, ${OG_DIAGONAL_STRIPES}`,
        color: '#fff',
        padding: '60px 64px',
        position: 'relative',
      }}
    >
      {/* Bande verticale accent gauche */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 8,
          height: '100%',
          background: accent,
          display: 'flex',
        }}
      />
      {children}
    </div>
  );
}
