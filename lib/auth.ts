import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";
import argon2 from "argon2";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { verifyTurnstile } from "./turnstile";

/**
 * Fenêtre pendant laquelle on fait confiance au `role` et au
 * `mustChangePassword` portés par le jeton, sans relire la base.
 *
 * Contrepartie assumée : une révocation de rôle par un admin met jusqu'à
 * 15 min à s'appliquer sur une session déjà ouverte (au lieu d'être
 * immédiate). C'est borné par `maxAge: 30 min` dans `auth.config.ts`, et le
 * mot de passe, lui, est invalidé tout de suite — l'utilisateur ne peut plus
 * se reconnecter. Un geste qui doit porter sur-le-champ dispose de
 * `useSession().update()`, qui force la relecture.
 */
const JWT_DB_REFRESH_MS = 15 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
            // Token Turnstile fourni par le widget côté login.
            // Optionnel pour rétrocompat (CLI / tests / migration), mais en
            // pratique toujours présent depuis le form login.
            turnstileToken: z.string().min(1).optional(),
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;
        const { email, password, turnstileToken } = parsedCredentials.data;

        // Si un token est fourni, on l'exige valide. Pas de token =
        // probablement un appel programmatique : on laisse passer pour ne pas
        // casser d'éventuels flows internes (admin via signIn server-side).
        if (turnstileToken) {
          const ok = await verifyTurnstile(turnstileToken);
          if (!ok) return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const passwordsMatch = await argon2.verify(user.password, password);
        if (passwordsMatch) return user;

        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (token.role && session.user) {
        session.user.role = token.role as string;
      }
      if (session.user) {
        session.user.mustChangePassword = token.mustChangePassword ?? false;
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      // À la connexion, `authorize` a déjà chargé l'utilisateur complet :
      // relire la base ici serait une seconde requête pour rien.
      //
      // On exige `user.role` explicitement. Si NextAuth ne le transmettait pas,
      // sortir ici poserait `refreshedAt` et figerait un jeton sans rôle
      // pendant 15 min — donc un dashboard inaccessible. En laissant filer, le
      // jeton est réputé périmé et la relecture ci-dessous rétablit le rôle.
      if (user?.role) {
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword ?? false;
        token.refreshedAt = Date.now();
        return token;
      }

      if (!token.sub) return token;

      // Portée : ce rappel s'exécute à CHAQUE lecture de session — donc à
      // chaque requête serveur du dashboard et à chaque appel client à
      // /api/auth/session. Sans la fenêtre ci-dessous, un onglet dashboard
      // laissé ouvert réveillait la base en continu et l'empêchait de
      // s'endormir (Neon facture le temps d'éveil, cf. CLAUDE.md règle n°2).
      //
      // Fréquence : au plus une requête par jeton et par fenêtre. Entre deux
      // lectures on fait confiance au jeton — signé, donc non falsifiable.
      //
      // Défaillance : base muette → `findUnique` lève, NextAuth invalide la
      // session et renvoie au login. Panne visible, pas de rôle fantôme.
      const stale = Date.now() - (token.refreshedAt ?? 0) >= JWT_DB_REFRESH_MS;
      // `trigger === 'update'` = appel explicite à `useSession().update()`.
      // C'est l'échappatoire pour rendre un changement effectif tout de suite.
      if (trigger !== 'update' && !stale) return token;

      const existingUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { role: true, mustChangePassword: true },
      });
      if (!existingUser) return token;

      token.role = existingUser.role;
      token.mustChangePassword = existingUser.mustChangePassword;
      token.refreshedAt = Date.now();
      return token;
    },
  },
});
