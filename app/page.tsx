import { HomePage } from "@/components/lrh/HomePage";

// ISR : la home était le seul point d'entrée public rendu dynamiquement, à
// cause de la détection UA via `headers()` (choix HomeMobile/HomeDesktop au
// SSR). Le score PageSpeed mobile dépendait alors de la météo serverless
// (69-99 selon cold/warm). La détection UA vit désormais dans proxy.ts qui
// rewrite les UA mobiles vers /m : les deux variantes sont des HTML statiques
// revalidés toutes les 60 s, servis chauds depuis le cache.
//
// 300 → 3600 le 2026-08-03 : avec `/m` et `/competitions` sur la même fenêtre
// de 5 min, leurs régénérations se décalaient et se relayaient, ne laissant
// jamais 5 min de silence à Neon — or la base ne s'endort qu'au-delà. La
// fraîcheur ne repose pas sur cette valeur mais sur les 116 `revalidatePath`
// de lib/actions/ ; c'est un filet, pas le mécanisme.
export const revalidate = 3600;

export default function Home() {
  return <HomePage ssrIsMobile={false} />;
}
