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
import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // On scope strict aux pages protégées. On évite de tout matcher pour ne pas
  // ralentir les pages publiques (qui font 90% du trafic) et ne pas casser
  // les API routes /api/auth/* qui ont leur propre handler. Le callback
  // `authorized` ne filtre de toute façon que /dashboard.
  matcher: ['/dashboard/:path*'],
};
