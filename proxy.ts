import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // On protège tout sauf les routes publiques, l'API auth et les assets statiques
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth|assets|lrh-website).*)'],
};
