import type { Metadata } from "next";
import { Poppins, Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// On NE charge PAS Geist / Geist_Mono — non utilisés (aucune référence à
// `--font-geist-*` hors de ce fichier). Évite 4-8 préchargements WOFF2
// inutiles que Lighthouse pénalisait sur mobile.

// Budget de préchargement des fonts.
//
// `next/font` précharge par défaut TOUTES les familles déclarées. Mesuré en
// prod le 2026-07-19 : 6 `<link rel=preload>` pour 105 Ko de WOFF2, en priorité
// haute — contre 29 Ko pour l'image LCP du hero. Sur le lien slow-4G simulé de
// PSI, ces 105 Ko volent ~0,5-0,7 s de bande passante au LCP, ce qui correspond
// au swing observé de FCP (0,9 s sur les bons runs, 1,8 s sur les mauvais).
//
// On ne précharge donc QUE Poppins : c'est la font des titres (`display`), elle
// porte le `<h1>` du hero — l'élément le plus dominant à l'écran, et candidat
// LCP quand l'image gagne moins vite. 4 poids statiques ≈ 31,6 Ko.
//
// Montserrat (texte courant) et JetBrains Mono (kickers, microcopy) passent en
// `preload: false` : 40,5 + 35,5 = 76 Ko retirés de la file haute priorité.
// Elles restent en `display: 'swap'`, donc le texte s'affiche immédiatement
// dans la fallback puis permute — et `adjustFontFallback` (actif par défaut)
// aligne les métriques de la fallback pour que la permutation ne décale pas
// la mise en page.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  // Le 500 n'est utilisé que 3 fois dans tout le projet → fallback sur 400.
  // `display: swap` évite de bloquer le rendu sur le téléchargement.
  display: 'swap',
  preload: true,
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: 'swap',
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: false,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <Providers>{children}</Providers>
        <CookieConsent />
        <AnalyticsGated />
      </body>
    </html>
  );
}
