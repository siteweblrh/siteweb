const WEEKDAYS_SHORT = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

export function formatMatchDay(date: Date): string {
  const d = WEEKDAYS_SHORT[date.getDay()];
  const day = date.getDate().toString().padStart(2, "0");
  return `${d} ${day}`;
}

export function formatMatchTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
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
