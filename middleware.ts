// Middleware NextAuth : applique le callback `authorized` (cf. lib/auth.config.ts)
// sur toutes les requêtes matcher. Sans ce fichier, le callback n'est jamais
// exécuté et la seule barrière est getDashboardContext() côté server component.
// Ajouter cette ligne de défense côté Edge garantit que :
//   1. Une requête /dashboard/* sans cookie session valide est redirigée vers
//      /auth/login AVANT même que le code de la page ne s'exécute.
//   2. Un cookie persistant qui n'aurait pas été correctement effacé côté
//      navigateur est filtré ici (le JWT est re-validé à chaque requête).
//
// L'authConfig est volontairement Edge-compatible : pas d'import Prisma, pas
// d'import argon2. Le check se fait uniquement sur le JWT (signature + expiry).
import NextAuth from 'next-auth';
import { authConfig } from './lib/auth.config';

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // On scope strict aux pages protégées. On évite de tout matcher pour ne pas
  // ralentir les pages publiques (qui font 90% du trafic) et ne pas casser
  // les API routes /api/auth/* qui ont leur propre handler.
  matcher: ['/dashboard/:path*'],
};
