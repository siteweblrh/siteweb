import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { renderToBuffer } from '@react-pdf/renderer';
import { getDraftCalendarsForSeasonPdf } from '@/lib/queries/seasonPlanPdf';
import { SeasonPlanPDF } from '@/lib/pdf/SeasonPlanPDF';
import type { SeasonSlot, SeasonPlanPdfData, CompetitionColorEntry } from '@/lib/pdf/SeasonPlanPDF';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Logo officiel LRH rasterisé en PNG via sharp (cf. route compétitions).
let cachedLogoDataUri: string | null = null;
async function loadLogoDataUri(): Promise<string | null> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', 'logo-ligue-officiel.svg');
    const raw = await fs.readFile(filePath);
    const png = await sharp(raw, { density: 300 })
      .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    cachedLogoDataUri = `data:image/png;base64,${png.toString('base64')}`;
    return cachedLogoDataUri;
  } catch {
    return null;
  }
}

export function buildSlotsFromCalendars(
  calendars: Awaited<ReturnType<typeof getDraftCalendarsForSeasonPdf>>,
  filterCompetitionId?: string,
): { slots: SeasonSlot[]; competitionColors: CompetitionColorEntry[] } {
  const slots: SeasonSlot[] = [];
  const colorMap = new Map<string, CompetitionColorEntry>();

  for (const cal of calendars) {
    for (const dcc of cal.competitions) {
      if (!colorMap.has(dcc.competitionId) && dcc.color) {
        colorMap.set(dcc.competitionId, {
          competitionId: dcc.competitionId,
          name: dcc.competition.name,
          color: dcc.color,
          dayOfWeek: (dcc.dayOfWeek ?? cal.dayOfWeek) as string,
          recurrence: dcc.recurrence ?? cal.recurrence,
          startDate: dcc.startDate.toISOString(),
          endDate: dcc.endDate.toISOString(),
        });
      }
    }

    for (const slot of cal.slots) {
      if (filterCompetitionId && slot.competitionId !== filterCompetitionId) continue;

      const venueText = slot.venueRef
        ? `${slot.venueRef.name} (${slot.venueRef.city})`
        : slot.venueText ?? null;

      slots.push({
        date: slot.date.toISOString(),
        matchday: slot.matchday,
        slotIndex: slot.slotIndex,
        label: slot.label,
        calendarName: cal.name,
        competition: slot.competition
          ? {
              id: slot.competition.id,
              name: slot.competition.name,
              mode: slot.competition.mode,
              category: slot.competition.category,
              format: slot.competition.format,
            }
          : null,
        venue: venueText,
      });
    }
  }

  slots.sort((a, b) => {
    const dCmp = a.date.localeCompare(b.date);
    if (dCmp !== 0) return dCmp;
    return a.slotIndex - b.slotIndex;
  });

  return { slots, competitionColors: Array.from(colorMap.values()) };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ season: string }> },
) {
  const { season } = await params;
  const decoded = decodeURIComponent(season);

  const calendars = await getDraftCalendarsForSeasonPdf(decoded);
  if (calendars.length === 0) {
    return NextResponse.json(
      { error: `Aucun calendrier provisoire pour la saison ${decoded}` },
      { status: 404 },
    );
  }

  const { slots, competitionColors } = buildSlotsFromCalendars(calendars);
  const data: SeasonPlanPdfData = { season: decoded, slots, competitionColors };

  const logoDataUri = await loadLogoDataUri();
  const generatedAt = new Date();

  const pdfBuffer = await renderToBuffer(
    <SeasonPlanPDF data={data} logoDataUri={logoDataUri ?? undefined} generatedAt={generatedAt} />,
  );

  const filename = `calendrier-general-${slugify(decoded)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
