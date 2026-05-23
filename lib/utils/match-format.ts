const WEEKDAYS_SHORT = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

const REUNION_TZ = "Indian/Reunion";

/** Renvoie le jour de semaine ("LUN", "MAR", ...) et le numéro du jour en TZ Réunion. */
export function formatMatchDay(date: Date): string {
  // weekday + day en heure Réunion. Plus simple : on lit les parts via Intl.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REUNION_TZ,
    weekday: "short",
    day: "2-digit",
  }).formatToParts(date);
  const weekdayEn = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const map: Record<string, string> = {
    Sun: "DIM", Mon: "LUN", Tue: "MAR", Wed: "MER",
    Thu: "JEU", Fri: "VEN", Sat: "SAM",
  };
  return `${map[weekdayEn] ?? weekdayEn.toUpperCase()} ${day}`;
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
