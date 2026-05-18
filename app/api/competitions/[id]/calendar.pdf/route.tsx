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

// Cache du logo encodé en data URI SVG (blanc, pour fond navy). Lu une seule
// fois au cold-start de la lambda Vercel — le fichier SVG ne change jamais.
let cachedLogoDataUri: string | null = null;
async function loadLogoWhiteDataUri(): Promise<string | null> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', 'logo-uni-lrh.svg');
    const raw = await fs.readFile(filePath, 'utf-8');
    // Le SVG d'origine a tous ses paths en navy #072854. On les bascule en
    // blanc pour qu'il soit lisible sur le bandeau navy du header PDF.
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
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await getCompetitionForPdf(id);
  if (!data) {
    return NextResponse.json({ error: 'Compétition introuvable' }, { status: 404 });
  }

  const logoDataUri = await loadLogoWhiteDataUri();
  const generatedAt = new Date();

  const pdfBuffer = await renderToBuffer(
    <CompetitionCalendarPDF data={data} logoDataUri={logoDataUri ?? undefined} generatedAt={generatedAt} />,
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
