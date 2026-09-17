/**
 * Libellé de la journée récompensée par un MVP — source unique, côté public
 * comme côté administration.
 *
 * Dérivé et non stocké : un champ texte libre finirait par contredire la
 * journée réellement pointée (« J3 » saisi sur la J2). Toutes les journées ne
 * sont pas numérotées — 4 matchs sur 24 en 2026-2027 — d'où le repli sur le
 * seul nom de la compétition.
 *
 * Fichier neutre (`lib/utils/`) et type d'entrée structurel : il est importé
 * par des composants `'use client'`, il ne peut donc pas vivre à côté de
 * Prisma.
 */
export function mvpPeriodLabel(mvp: {
  matchday: number | null;
  competition: { name: string };
}): string {
  return mvp.matchday != null
    ? `${mvp.competition.name} · J${mvp.matchday}`
    : mvp.competition.name;
}
