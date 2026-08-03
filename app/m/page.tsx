import type { Metadata } from "next";
import { HomePage } from "@/components/lrh/HomePage";

// Variante MOBILE de la home, servie via le rewrite UA de proxy.ts (jamais
// linkée dans le site). Canonical vers `/` : c'est lui qui gère le doublon si
// /m est crawlée directement. SURTOUT PAS de noindex ici — Googlebot
// smartphone (l'indexeur mobile-first) reçoit CE HTML quand il visite `/`
// (le rewrite est invisible pour lui) : un noindex désindexerait la home.
// Constaté le 18/07 : PSI mobile notait SEO 69 « page is blocked from
// indexing » à cause du noindex initial.
// 300 → 3600 le 2026-08-03, même raison que la home desktop (app/page.tsx).
export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomeMobileVariant() {
  return <HomePage ssrIsMobile={true} />;
}
