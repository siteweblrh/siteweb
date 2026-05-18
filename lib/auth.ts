import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";
import argon2 from "argon2";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { verifyTurnstile } from "./turnstile";

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
      return session;
    },
    async jwt({ token }) {
      if (!token.sub) return token;

      const existingUser = await prisma.user.findUnique({ where: { id: token.sub } });
      if (!existingUser) return token;

      token.role = existingUser.role;
      return token;
    },
  },
});
