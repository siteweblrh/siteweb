// Proxy NextAuth (ex-"middleware", renommé en Next 16 — même rôle).
// Applique le callback `authorized` (cf. lib/auth.config.ts) sur les requêtes
// du matcher. Sans ce fichier, le callback n'est jamais exécuté et la seule
// barrière est getDashboardContext() côté server component. Cette ligne de
// défense côté Edge garantit que :
//   1. Une requête /dashboard/* sans cookie session valide est redirigée vers
//      /auth/login AVANT même que le code de la page ne s'exécute.
//   2. Un cookie persistant qui n'aurait pas été correctement effacé côté
//      navigateur est filtré ici (le JWT est re-validé à chaque requête).
//
// L'authConfig est volontairement Edge-compatible : pas d'import Prisma, pas
// d'import argon2. Le check se fait uniquement sur le JWT (signature + expiry).
//
// Next 16 attend un export `default` (ou nommé `proxy`) — surtout PAS un export
// nommé `middleware`, qui serait ignoré. cf. node_modules/next/dist/docs/.../16-proxy.md
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";
import { isMobileUserAgent } from "./lib/utils/detect-mobile";

const nextAuthProxy = NextAuth(authConfig).auth;

// En plus de l'auth /dashboard : rewrite UA de la home. `/` et `/m` sont deux
// variantes statiques ISR de la même page (desktop / mobile) — le choix se
// fait ici au Edge, AVANT le cache, pour que chaque UA tombe sur le HTML
// statique de sa variante au lieu d'un rendu dynamique par requête
// (l'ancien `headers()` dans app/page.tsx rendait la home auto-dynamic).
// Le rewrite se fait HORS du wrapper auth() : NextAuth normalise
// req.nextUrl avec AUTH_URL/NEXTAUTH_URL, ce qui transformait le rewrite en
// proxy cross-origin (ECONNREFUSED en local, boucle potentielle www/non-www
// en prod). Ici req.nextUrl garde l'origine réelle de la requête.
export default function proxy(req: NextRequest, ev: NextFetchEvent) {
  if (req.nextUrl.pathname === "/") {
    if (isMobileUserAgent(req.headers.get("user-agent"))) {
      const url = req.nextUrl.clone();
      url.pathname = "/m";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return nextAuthProxy(req as any, ev as any);
}

export const config = {
  // Scope strict : la home (rewrite UA) + les pages protégées (auth). On
  // évite de tout matcher pour ne pas ralentir les autres pages publiques ni
  // casser les API routes /api/auth/* qui ont leur propre handler. Le
  // callback `authorized` ne filtre de toute façon que /dashboard.
  matcher: ['/', '/dashboard/:path*'],
};
