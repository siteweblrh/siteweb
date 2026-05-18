import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { renderToBuffer } from '@react-pdf/renderer';
import { getCompetitionForPdf } from '@/lib/queries/competitionPdf';
import { CompetitionCalendarPDF } from '@/lib/pdf/CompetitionCalendarPDF';

// @react-pdf/renderer ne marche pas sur Edge — force Node.js runtime.
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

let cachedLogo: string | null = null;
async function loadLogoBase64(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', 'logo-complet-lrh.png');
    const buf = await fs.readFile(filePath);
    cachedLogo = buf.toString('base64');
    return cachedLogo;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await getCompetitionForPdf(id);
  if (!data) {
    return NextResponse.json({ error: 'Compétition introuvable' }, { status: 404 });
  }

  const logoBase64 = await loadLogoBase64();
  const generatedAt = new Date();

  const pdfBuffer = await renderToBuffer(
    <CompetitionCalendarPDF data={data} logoBase64={logoBase64 ?? undefined} generatedAt={generatedAt} />,
  );

  const filename = `calendrier-${slugify(data.name)}-${slugify(data.season)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
