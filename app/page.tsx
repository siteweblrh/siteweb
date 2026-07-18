import { HomePage } from "@/components/lrh/HomePage";

// ISR : la home était le seul point d'entrée public rendu dynamiquement, à
// cause de la détection UA via `headers()` (choix HomeMobile/HomeDesktop au
// SSR). Le score PageSpeed mobile dépendait alors de la météo serverless
// (69-99 selon cold/warm). La détection UA vit désormais dans proxy.ts qui
// rewrite les UA mobiles vers /m : les deux variantes sont des HTML statiques
// revalidés toutes les 60 s, servis chauds depuis le cache.
export const revalidate = 60;

export default function Home() {
  return <HomePage ssrIsMobile={false} />;
}
