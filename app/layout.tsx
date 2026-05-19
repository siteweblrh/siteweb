import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins, Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${montserrat.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
      </body>
    </html>
  );
}
