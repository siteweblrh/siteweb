import type { Metadata } from "next";
import { Poppins, Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// On NE charge PAS Geist / Geist_Mono — non utilisés (aucune référence à
// `--font-geist-*` hors de ce fichier). Évite 4-8 préchargements WOFF2
// inutiles que Lighthouse pénalisait sur mobile.

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  // Le 500 n'est utilisé que 3 fois dans tout le projet → fallback sur 400.
  // `display: swap` évite de bloquer le rendu sur le téléchargement.
  display: 'swap',
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: 'swap',
});

// URL canonique du site. Override possible via NEXT_PUBLIC_SITE_URL pour
// preview Vercel / staging. `metadataBase` est utilisé par Next pour
// résoudre les `alternates.canonical` relatifs et l'Open Graph.
//
// Normalisation indispensable : les env vars Vercel arrivent parfois avec
// un espace ou un retour à la ligne final, ce qui casse le sitemap
// (Search Console rejette `https://lrh.re /` comme URL invalide).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lrh.re')
  .trim()
  .replace(/\/+$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ligue Réunionnaise de Hockey",
    template: "%s · Ligue Réunionnaise de Hockey",
  },
  description: "Site officiel de la Ligue Réunionnaise de Hockey — calendrier, classements, clubs et actualités du hockey sur gazon et en salle à La Réunion.",
  verification: {
    google: "IgnPujvmqA2q4C1dn0EtJRzsUIs0am1X-Ao-C26hLMs",
  },
};

import { Providers } from "@/components/Providers";
import { CookieConsent } from "@/components/lrh/rgpd/CookieConsent";
import { AnalyticsGated } from "@/components/lrh/rgpd/AnalyticsGated";
import { SeasonProvider } from "@/components/lrh/SeasonProvider";
import { ModeProvider } from "@/components/lrh/ModeProvider";
import { getContent } from "@/lib/queries/siteContent";
import { getActiveSeasonLabelCached } from "@/lib/queries/season";
import { getActiveModeCached } from "@/lib/queries/activeMode";

// Saison affichée dans le header et le toggle, par ordre de priorité :
//
//   1. `season.current` — forçage explicite depuis /dashboard/ligue/contenu ;
//   2. la saison `EN_COURS` de l'entité Season, pilotée depuis
//      /dashboard/ligue/saisons ;
//   3. la règle de calendrier (bascule au 1er septembre), dernier recours.
//
// Le niveau 2 a été ajouté le 2026-08-04 : ouvrir 2026-2027 faisait bien
// basculer /competitions, mais le header restait sur 2025-2026 — deux saisons
// affichées sur le même écran. Le forçage manuel reste prioritaire pour ne pas
// retirer un réglage déjà en place.
//
// Coût (règle n°2) — portée : 100 % des pages, dashboard compris, puisqu'on est
// dans le layout racine. Les DEUX lectures sont enveloppées dans `cachePublic`
// (fenêtre 1 h, invalidée par tag à chaque enregistrement admin), soit de
// l'ordre d'une lecture Neon par heure pour le site entier, pas une par visite.
// Défaillance : les deux rendent null et SeasonProvider retombe sur le
// calendrier — le site affiche une saison plausible, jamais un trou.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // La discipline en cours rejoint le même Promise.all : pas de vague de
  // requêtes supplémentaire, et sa lecture est cachée comme les deux autres.
  // Cf. lib/queries/activeMode.ts pour la règle de résolution et le coût.
  const [manualOverride, activeSeason, activeMode] = await Promise.all([
    getContent('season.current'),
    getActiveSeasonLabelCached(),
    getActiveModeCached(),
  ]);
  const seasonOverride = manualOverride?.trim() ? manualOverride : activeSeason;
  return (
    <html
      lang="fr"
      className={`${poppins.variable} ${montserrat.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Preconnect aux CDN d'images : économise ~150-300ms sur le hero LCP
            en établissant TCP + TLS avant que le navigateur ne découvre l'URL
            dans la CSS. Cloudinary sert le hero d'accueil, Cloudflare Images
            sert les photos news/bureau/clubs. */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://imagedelivery.net" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        <SeasonProvider value={seasonOverride}>
          <ModeProvider value={activeMode}>
            <Providers>{children}</Providers>
          </ModeProvider>
        </SeasonProvider>
        <CookieConsent />
        <AnalyticsGated />
      </body>
    </html>
  );
}
