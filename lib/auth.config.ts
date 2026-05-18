import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import argon2 from "argon2";
import { z } from "zod";
import type { NextAuthConfig } from "next-auth";

// On sépare la config pour qu'elle soit compatible avec l'Edge Runtime (Middleware)
export const authConfig = {
  session: {
    strategy: "jwt",
    // Session expire après 30 min d'inactivité. Refresh du JWT toutes les 5 min
    // d'activité (toute requête à l'app re-touche le cookie).
    maxAge: 30 * 60,
    updateAge: 5 * 60,
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        // Cette partie ne sera exécutée QUE sur le serveur (Node.js)
        // car l'adapter Prisma (dans auth.ts) force l'exécution hors-Edge
        return null; // Sera surchargé dans auth.ts
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = nextUrl.pathname.startsWith("/dashboard");
      
      if (isDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirige vers login
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
