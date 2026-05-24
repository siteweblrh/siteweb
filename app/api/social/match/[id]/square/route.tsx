import { renderMatchPoster } from '@/lib/social/render-match-poster';

export const runtime = 'nodejs'; // fs.readFileSync pour les assets locaux

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return renderMatchPoster(id, 'square');
}
