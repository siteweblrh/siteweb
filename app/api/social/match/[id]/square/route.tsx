import { renderMatchPoster } from '@/lib/social/render-match-poster';

export const runtime = 'nodejs'; // fs.readFileSync pour les assets locaux

// Coût (règle n°2) — portée : 2 routes d'affiche. Fréquence : réponse NON
// cachée, mais ses 2 lectures base le sont (lib/social/render-match-poster.tsx).
// Défaillance : match absent → 404 explicite.
//
// ⚠️ NE PAS ajouter `export const revalidate` ici, ni `generateStaticParams`.
// Essayé le 2026-08-03 : la route passe bien de `ƒ` à `●` au build, mais une
// route statique est cachée PAR CHEMIN — les query params ne font pas partie
// de la clé. Or l'admin appelle `?v=<updatedAt>&t=<now>` précisément pour
// forcer une affiche fraîche (cf. SocialPosterDownloads dans
// MatchDetailAdmin.tsx) : corriger un score puis télécharger l'affiche aurait
// rendu l'ANCIEN score pendant 1 h. Régression inacceptable sur le seul cas
// d'usage de la feature.
//
// Le réveil de Neon — le vrai sujet — est déjà réglé au niveau des données :
// `getMatchForPoster` et `getLeagueSponsors` sont cachés. Un robot qui frappe
// cette URL consomme du CPU Vercel, pas du temps d'éveil Neon.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return renderMatchPoster(id, 'square');
}
