import type { Metadata } from "next";
import { HomePage } from "@/components/lrh/HomePage";

// Variante MOBILE de la home, servie uniquement via le rewrite UA de proxy.ts
// (jamais linkée dans le site). Même contenu que `/` : noindex + canonical
// vers `/` pour que Google n'y voie pas un doublon.
export const revalidate = 60;

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  alternates: { canonical: "/" },
};

export default function HomeMobileVariant() {
  return <HomePage ssrIsMobile={true} />;
}
