import { renderMatchPoster } from '@/lib/social/render-match-poster';

export const runtime = 'nodejs'; // fs.readFileSync pour les assets locaux

// ⚠️ Pas de `revalidate` ni de `generateStaticParams` ici — cf. la route
// `square` voisine pour la raison détaillée : cacher la réponse casserait le
// cache buster `?v=&t=` de l'admin. Ce sont les lectures base qui sont cachées,
// dans lib/social/render-match-poster.tsx.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return renderMatchPoster(id, 'story');
}
