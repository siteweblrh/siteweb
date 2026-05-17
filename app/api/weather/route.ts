import { NextResponse } from "next/server";

// Open-Meteo : API publique gratuite, sans clé. Coordonnées : Saint-Denis (centre
// administratif de la Ligue). Doc : https://open-meteo.com/en/docs
const ENDPOINT =
  "https://api.open-meteo.com/v1/forecast" +
  "?latitude=-20.8789" +
  "&longitude=55.4481" +
  "&current=temperature_2m,weather_code" +
  "&timezone=Indian/Reunion";

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

export async function GET() {
  try {
    const res = await fetch(ENDPOINT, { next: { revalidate: 600 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "weather upstream failed" },
        { status: 503 },
      );
    }
    const data = await res.json();
    const t = data?.current?.temperature_2m;
    const code = data?.current?.weather_code;
    if (typeof t !== "number" || typeof code !== "number") {
      return NextResponse.json(
        { error: "weather payload invalid" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      temperature: Math.round(t),
      code,
      label: codeToLabel(code),
      city: "Saint-Denis",
    });
  } catch {
    return NextResponse.json(
      { error: "weather fetch error" },
      { status: 503 },
    );
  }
}
