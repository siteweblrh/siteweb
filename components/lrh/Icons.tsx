import React from 'react';

/**
 * Icônes SVG inline charte LRH — line-based, 2px stroke, currentColor.
 * Aucune dépendance externe (pas de lucide). Design sobre, géométrique.
 * Toutes les icônes acceptent `size` (px) et utilisent `currentColor`.
 */

type IconProps = { size?: number };

function I({ size = 16, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function IconGrid({ size }: IconProps) {
  return <I size={size}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></I>;
}

export function IconMegaphone({ size }: IconProps) {
  return <I size={size}><path d="M3 11v4l11 4V7L3 11Z" /><path d="M14 9.5v6" /><path d="M14 8h2a3 3 0 0 1 0 6h-2" /><path d="M7 19a2 2 0 0 0 4 0v-3" /></I>;
}

export function IconHockey({ size }: IconProps) {
  // hockey stick + puck
  return <I size={size}><path d="M4 4l8 8" /><path d="M12 12l4 4a3 3 0 0 0 4 0" /><circle cx="6" cy="18" r="2" /></I>;
}

export function IconPodium({ size }: IconProps) {
  return <I size={size}><rect x="9" y="6" width="6" height="14" /><rect x="3" y="11" width="6" height="9" /><rect x="15" y="9" width="6" height="11" /></I>;
}

export function IconIdCard({ size }: IconProps) {
  return <I size={size}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8" cy="11" r="2" /><path d="M14 10h4" /><path d="M14 13h3" /><path d="M5 17h6" /></I>;
}

export function IconUsers({ size }: IconProps) {
  return <I size={size}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M21 19c0-2-1.5-4-4-4" /></I>;
}

export function IconFolder({ size }: IconProps) {
  return <I size={size}><path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /></I>;
}

export function IconHandshake({ size }: IconProps) {
  return <I size={size}><path d="M3 11l3-3 5 5" /><path d="M21 11l-3-3-5 5" /><path d="M8 13l2 2 2-2 2 2 3-3" /><path d="M3 11l5 5" /><path d="M21 11l-5 5" /></I>;
}

export function IconWallet({ size }: IconProps) {
  return <I size={size}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="17" cy="14.5" r="1.2" /></I>;
}

export function IconBriefcase({ size }: IconProps) {
  return <I size={size}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></I>;
}

export function IconNetwork({ size }: IconProps) {
  return <I size={size}><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7v4" /><path d="M12 11l-5 6" /><path d="M12 11l5 6" /></I>;
}

export function IconTrophy({ size }: IconProps) {
  return <I size={size}><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4a3 3 0 0 0 3 3" /><path d="M17 6h3a3 3 0 0 1-3 3" /><path d="M12 13v3" /><path d="M9 20h6" /><path d="M9 18h6v2H9z" /></I>;
}

export function IconLogout({ size }: IconProps) {
  return <I size={size}><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></I>;
}

export function IconPin({ size }: IconProps) {
  return <I size={size}><path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12Z" /><circle cx="12" cy="9" r="2.5" /></I>;
}

export function IconWhistle({ size }: IconProps) {
  // Sifflet d'arbitre : corps oval + bec + bille
  return <I size={size}><path d="M3 12a5 5 0 0 0 5 5h6a5 5 0 0 0 0-10H8a5 5 0 0 0-5 5Z" /><circle cx="8" cy="12" r="1.4" /><path d="M14 7l3-3" /></I>;
}

export function IconInstagram({ size }: IconProps) {
  return <I size={size}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" /></I>;
}

export function IconFacebook({ size }: IconProps) {
  return <I size={size}><path d="M14 9V7a2 2 0 0 1 2-2h2V2h-3a4 4 0 0 0-4 4v3H8v3h3v9h3v-9h2.5l.5-3H14Z" /></I>;
}

export function IconYoutube({ size }: IconProps) {
  return <I size={size}><rect x="2" y="6" width="20" height="13" rx="3" /><path d="M10 9.5v6l5-3-5-3Z" fill="currentColor" stroke="none" /></I>;
}

export function IconTiktok({ size }: IconProps) {
  return <I size={size}><path d="M14 3v10a4 4 0 1 1-3-3.87" /><path d="M14 3a5 5 0 0 0 5 5" /></I>;
}
