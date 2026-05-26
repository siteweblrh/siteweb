import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { renderToBuffer } from '@react-pdf/renderer';
import { getDraftCalendarsForSeasonPdf } from '@/lib/queries/seasonPlanPdf';
import { SeasonPlanPDF } from '@/lib/pdf/SeasonPlanPDF';
import type { SeasonSlot, SeasonPlanPdfData } from '@/lib/pdf/SeasonPlanPDF';

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

let cachedLogoDataUri: string | null = null;
async function loadLogoWhiteDataUri(): Promise<string | null> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', 'logo-uni-lrh.svg');
    const raw = await fs.readFile(filePath, 'utf-8');
    const whitened = raw
      .replace(/fill:\s*#072854/gi, 'fill:#ffffff')
      .replace(/fill="#072854"/gi, 'fill="#ffffff"');
    cachedLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(whitened).toString('base64')}`;
    return cachedLogoDataUri;
  } catch {
    return null;
  }
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

  const slots: SeasonSlot[] = [];
  for (const cal of calendars) {
    for (const slot of cal.slots) {
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

  const data: SeasonPlanPdfData = { season: decoded, slots };

  const logoDataUri = await loadLogoWhiteDataUri();
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
