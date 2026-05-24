/**
 * Helpers pour afficher un nom de club de façon compacte sur petits écrans
 * (mobile, calendrier admin, mini-cards). Client-safe (pas d'import prisma).
 *
 * Règles :
 *  - Si `shortCode` existe → on l'utilise toujours (3-5 lettres pensées pour ça).
 *  - Sinon, retire les préfixes éditoriaux (Entente / Hockey Club / HC) et
 *    tronque à `maxChars` (default 18) avec un caractère d'ellipsis.
 *
 * Utilisé partout où un long nom (« Saint-Denis Hockey Club », « Entente
 * Possession Le Port ») casse la mise en page mobile (calendar, bento, match
 * detail, etc.).
 */

export type ClubLabelInput = {
  name: string;
  shortCode?: string | null;
};

const PREFIX_RE = /^(Entente|Hockey Club|HC)\s+/i;

export function compactClubLabel(c: ClubLabelInput, maxChars = 18): string {
  if (c.shortCode && c.shortCode.trim().length > 0) return c.shortCode.trim();
  const stripped = c.name.replace(PREFIX_RE, '').trim();
  if (stripped.length <= maxChars) return stripped;
  return stripped.slice(0, maxChars - 1).trimEnd() + '…';
}

/** Variante très courte (≤8 chars) pour les pastilles de calendrier dense. */
export function ultraShortClubLabel(c: ClubLabelInput): string {
  if (c.shortCode && c.shortCode.trim().length > 0) return c.shortCode.trim();
  const stripped = c.name.replace(PREFIX_RE, '').trim();
  if (stripped.length <= 8) return stripped;
  // Initiales : "Saint-Denis Hockey Club" → "SDHC"
  const initials = stripped
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
  if (initials.length >= 2 && initials.length <= 5) return initials;
  return stripped.slice(0, 7) + '…';
}
