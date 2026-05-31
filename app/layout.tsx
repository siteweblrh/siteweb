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
    default: "Ligue Régionale de Hockey",
    template: "%s · Ligue Régionale de Hockey",
  },
  description: "Site officiel de la Ligue Régionale de Hockey — calendrier, classements, clubs et actualités du hockey sur gazon et en salle à La Réunion.",
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
