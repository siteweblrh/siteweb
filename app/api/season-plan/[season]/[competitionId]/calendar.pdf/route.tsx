import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { renderToBuffer } from '@react-pdf/renderer';
import { getDraftCalendarsForSeasonPdf } from '@/lib/queries/seasonPlanPdf';
import { SeasonPlanPDF } from '@/lib/pdf/SeasonPlanPDF';
import type { SeasonPlanPdfData } from '@/lib/pdf/SeasonPlanPDF';
import { buildSlotsFromCalendars } from '../../calendar.pdf/route';

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ season: string; competitionId: string }> },
) {
  const { season, competitionId } = await params;
  const decoded = decodeURIComponent(season);

  const calendars = await getDraftCalendarsForSeasonPdf(decoded);
  if (calendars.length === 0) {
    return NextResponse.json(
      { error: `Aucun calendrier provisoire pour la saison ${decoded}` },
      { status: 404 },
    );
  }

  const { slots, competitionColors } = buildSlotsFromCalendars(calendars, competitionId);

  if (slots.length === 0) {
    return NextResponse.json(
      { error: `Aucun créneau pour cette compétition dans la saison ${decoded}` },
      { status: 404 },
    );
  }

  const compName = slots[0].competition?.name ?? 'Compétition';

  const data: SeasonPlanPdfData = {
    season: decoded,
    slots,
    competitionColors,
    title: `${compName} — ${decoded}`,
  };

  const logoDataUri = await loadLogoDataUri();

  const pdfBuffer = await renderToBuffer(
    <SeasonPlanPDF data={data} logoDataUri={logoDataUri ?? undefined} />,
  );

  const filename = `calendrier-${slugify(compName)}-${slugify(decoded)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
