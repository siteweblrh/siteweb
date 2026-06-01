import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCityLatLon,
  findCitySlug,
  CITY_LABELS_BY_SLUG,
} from "@/lib/reunionCityCoords";
import { reunionDayKey, parseReunionDatetimeLocal } from "@/lib/utils/datetime-reunion";

// Open-Meteo : API publique gratuite, sans clé. Doc : https://open-meteo.com/en/docs
// On interroge plusieurs communes en UN seul appel (latitude/longitude en
// listes séparées par des virgules) — l'API renvoie alors un tableau.
const BASE = "https://api.open-meteo.com/v1/forecast";

// Coordonnées du centre administratif (fallback si aucune ville club résolue).
const FALLBACK = { slug: "saint-denis", lat: -20.8789, lon: 55.4481 };

// Plafond de villes envoyées à Open-Meteo (rotation lisible + requête légère).
const MAX_CITIES = 12;

// Mapping WMO Weather Code → libellé FR concis.
// Codes : https://open-meteo.com/en/docs#weathervariables
function codeToLabel(code: number): string {
  if (code === 0) return "Soleil";
  if (code === 1) return "Peu nuageux";
  if (code === 2) return "Éclaircies";
  if (code === 3) return "Nuageux";
  if (code === 45 || code === 48) return "Brume";
  if (code >= 51 && code <= 57) return "Bruine";
  if (code >= 61 && code <= 67) return "Pluie";
  if (code >= 71 && code <= 77) return "Neige";
  if (code >= 80 && code <= 82) return "Averses";
  if (code === 95) return "Orage";
  if (code === 96 || code === 99) return "Orage de grêle";
  return "—";
}

type ResolvedCity = {
  slug: string;
  label: string;
  lat: number;
  lon: number;
  matchDay: boolean;
};

/**
 * Construit la liste des communes à afficher dans le bandeau :
 *  1. Les lieux où se joue un match AUJOURD'HUI (priorité, drapeau matchDay).
 *  2. Les villes des clubs existants (rotation par défaut).
 * Dédup par slug commune, plafonné à MAX_CITIES. Fallback Saint-Denis.
 */
async function resolveCities(): Promise<ResolvedCity[]> {
  const bySlug = new Map<string, ResolvedCity>();

  const add = (rawCity: string | null | undefined, matchDay: boolean) => {
    if (!rawCity) return;
    const slug = findCitySlug(rawCity);
    if (!slug) return; // commune non reconnue → on ignore
    const ll = getCityLatLon(slug);
    if (!ll) return;
    const existing = bySlug.get(slug);
    if (existing) {
      // Une ville déjà connue qui devient lieu de match conserve le drapeau.
      if (matchDay) existing.matchDay = true;
      return;
    }
    bySlug.set(slug, {
      slug,
      label: CITY_LABELS_BY_SLUG[slug] ?? rawCity,
      lat: ll.lat,
      lon: ll.lon,
      matchDay,
    });
  };

  // Bornes du jour calendaire courant en TZ Réunion (UTC+4).
  const todayKey = reunionDayKey(new Date());
  const dayStart = parseReunionDatetimeLocal(`${todayKey}T00:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  try {
    const [todaysMatches, clubs] = await Promise.all([
      prisma.match.findMany({
        where: { kickoffAt: { gte: dayStart, lt: dayEnd } },
        select: {
          venueRef: { select: { city: true } },
          homeClub: { select: { city: true } },
        },
        orderBy: { kickoffAt: "asc" },
      }),
      prisma.club.findMany({ select: { city: true }, orderBy: { name: "asc" } }),
    ]);

    // 1. Lieux de match du jour (priorité d'insertion).
    for (const m of todaysMatches) {
      add(m.venueRef?.city ?? m.homeClub?.city, true);
    }
    // 2. Villes des clubs.
    for (const c of clubs) {
      add(c.city, false);
    }
  } catch {
    // DB indisponible : on retombe sur Saint-Denis seul.
  }

  let list = Array.from(bySlug.values());

  // Les jours de match : ne montrer que les lieux de match (focus). Sinon,
  // rotation sur l'ensemble des villes de clubs.
  const matchCities = list.filter((c) => c.matchDay);
  if (matchCities.length > 0) list = matchCities;

  if (list.length === 0) {
    list = [
      {
        slug: FALLBACK.slug,
        label: CITY_LABELS_BY_SLUG[FALLBACK.slug] ?? "Saint-Denis",
        lat: FALLBACK.lat,
        lon: FALLBACK.lon,
        matchDay: false,
      },
    ];
  }

  return list.slice(0, MAX_CITIES);
}

export async function GET() {
  try {
    const cities = await resolveCities();

    const url =
      `${BASE}?latitude=${cities.map((c) => c.lat).join(",")}` +
      `&longitude=${cities.map((c) => c.lon).join(",")}` +
      `&current=temperature_2m,weather_code&timezone=Indian/Reunion`;

    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) {
      return NextResponse.json({ error: "weather upstream failed" }, { status: 503 });
    }
    const data = await res.json();
    // Open-Meteo renvoie un objet pour 1 point, un tableau pour plusieurs.
    const points = Array.isArray(data) ? data : [data];

    const out = cities.map((c, i) => {
      const cur = points[i]?.current;
      const t = cur?.temperature_2m;
      const code = cur?.weather_code;
      return {
        city: c.label,
        temperature: typeof t === "number" ? Math.round(t) : null,
        code: typeof code === "number" ? code : null,
        label: typeof code === "number" ? codeToLabel(code) : "—",
        matchDay: c.matchDay,
      };
    });

    const valid = out.filter((c) => c.temperature !== null);
    if (valid.length === 0) {
      return NextResponse.json({ error: "weather payload invalid" }, { status: 502 });
    }

    return NextResponse.json({
      cities: valid,
      matchDay: valid.some((c) => c.matchDay),
    });
  } catch {
    return NextResponse.json({ error: "weather fetch error" }, { status: 503 });
  }
}
