import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
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

// Cache du logo officiel en data URI PNG. Lu une seule fois au cold-start de
// la lambda Vercel — le fichier ne change jamais. Le logo historique est
// multicolore et utilise des transforms matrix (texte circulaire) que le
// support SVG partiel de @react-pdf rend mal : on le rasterise donc avec sharp
// (rendu fidèle) sans modifier le SVG source. Fond transparent → posé tel quel
// sur le cartouche blanc du header.
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
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await getCompetitionForPdf(id);
  if (!data) {
    return NextResponse.json({ error: 'Compétition introuvable' }, { status: 404 });
  }

  const logoDataUri = await loadLogoDataUri();

  const pdfBuffer = await renderToBuffer(
    <CompetitionCalendarPDF data={data} logoDataUri={logoDataUri ?? undefined} />,
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
