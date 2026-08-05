const REUNION_TZ = "Indian/Reunion";

/**
 * Abréviations de mois, en majuscules — source unique du site public.
 *
 * ⚠️ Écrites une par une plutôt que dérivées d'un `slice(0, 3)` sur les noms
 * complets : ce raccourci rend **"JUI" pour juin ET pour juillet**. Il était en
 * place dans la colonne de jour du calendrier, où deux mois consécutifs de
 * pleine saison s'affichaient donc à l'identique.
 */
export const MONTHS_SHORT = [
  "JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN",
  "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC",
];

/**
 * Date courte d'un match en TZ Réunion : `"SAM 05 AOÛT"`.
 *
 * Le mois a été ajouté le 2026-08-05 sur remarque de l'user : la forme
 * précédente, `"SAM 05"`, laissait le visiteur sans repère — un jour de semaine
 * et un quantième ne situent rien à eux seuls. Les quatre appelants (hero
 * d'accueil, strip calendrier de la home, carte de match, bandeau de stats de
 * /competitions) sont tous des lignes `mono` isolées, sans bandeau de mois
 * autour pour rattraper l'information — contrairement au calendrier de
 * /competitions, qui affiche déjà le mois dans sa colonne de gauche.
 *
 * Pas d'année : ces emplacements montrent des rencontres à venir proches, et
 * la saison consultée est annoncée par ailleurs (header + sélecteur).
 */
export function formatMatchDay(date: Date): string {
  // weekday + day + month en heure Réunion. Plus simple : on lit les parts via Intl.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REUNION_TZ,
    weekday: "short",
    day: "2-digit",
    month: "numeric",
  }).formatToParts(date);
  const weekdayEn = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const monthIndex = parseInt(parts.find((p) => p.type === "month")?.value ?? "1", 10) - 1;
  const map: Record<string, string> = {
    Sun: "DIM", Mon: "LUN", Tue: "MAR", Wed: "MER",
    Thu: "JEU", Fri: "VEN", Sat: "SAM",
  };
  const month = MONTHS_SHORT[monthIndex] ?? "";
  return `${map[weekdayEn] ?? weekdayEn.toUpperCase()} ${day} ${month}`.trim();
}

export function formatMatchTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    timeZone: REUNION_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatStatus(status: string, homeScore: number | null, awayScore: number | null): string {
  switch (status) {
    case "LIVE": return "● EN DIRECT";
    case "HALFTIME": return "MI-TEMPS";
    case "FINISHED": return "TERMINÉ";
    case "POSTPONED": return "REPORTÉ";
    case "CANCELLED": return "ANNULÉ";
    case "SCHEDULED":
    default: return homeScore != null && awayScore != null ? "TERMINÉ" : "À VENIR";
  }
}
