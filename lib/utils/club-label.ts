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
 *
 * Le club peut être `null` : un match de phase finale est planifié avant que
 * ses participants soient connus. On passe alors la règle de qualification en
 * second argument (« Vainqueur demi-finale 1 »), qui s'affiche à sa place.
 * Cf. lib/utils/match-side.ts.
 */

export type ClubLabelInput = {
  name: string;
  shortCode?: string | null;
};

const PREFIX_RE = /^(Entente|Hockey Club|HC)\s+/i;

/**
 * Les ententes portent un `shortCode` composé, saisi avec un underscore
 * (`HCP_HCD`, `SDHC_HHS`) parce que c'est une clé technique. Affiché tel quel
 * au visiteur, l'underscore fait faute — le nom réel du club s'écrit
 * « Entente HCP / HCD ». On rend donc `HCP/HCD`.
 */
function presentShortCode(code: string): string {
  return code.trim().replace(/_/g, '/');
}

export function compactClubLabel(
  c: ClubLabelInput | null | undefined,
  fallback?: string | null,
  maxChars = 18,
): string {
  if (!c) {
    const f = fallback?.trim();
    if (!f) return 'À déterminer';
    return f.length <= maxChars ? f : f.slice(0, maxChars - 1).trimEnd() + '…';
  }
  if (c.shortCode && c.shortCode.trim().length > 0) return presentShortCode(c.shortCode);
  const stripped = c.name.replace(PREFIX_RE, '').trim();
  if (stripped.length <= maxChars) return stripped;
  return stripped.slice(0, maxChars - 1).trimEnd() + '…';
}

/** Variante très courte (≤8 chars) pour les pastilles de calendrier dense. */
export function ultraShortClubLabel(
  c: ClubLabelInput | null | undefined,
  fallback?: string | null,
): string {
  if (!c) {
    const f = fallback?.trim();
    return f ? (f.length <= 8 ? f : f.slice(0, 7) + '…') : '?';
  }
  if (c.shortCode && c.shortCode.trim().length > 0) return presentShortCode(c.shortCode);
  const stripped = c.name.replace(PREFIX_RE, '').trim();
  if (stripped.length <= 8) return stripped;
  // Initiales : "Saint-Denis Hockey Club" → "SDHC".
  // ⚠️ Le trait d'union est un séparateur au même titre que l'espace : sans
  // lui, ce helper rendait "SHC" alors que son propre commentaire annonçait
  // "SDHC" depuis l'origine. Défaut resté invisible parce que tous les clubs en
  // base ont un `shortCode`, qui court-circuite ce repli.
  const initials = stripped
    .split(/[\s-]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
  if (initials.length >= 2 && initials.length <= 5) return initials;
  return stripped.slice(0, 7) + '…';
}
