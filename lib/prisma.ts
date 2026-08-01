import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Le driver Neon parle en WebSocket à l'endpoint serverless : il ne sait pas
 * se connecter à un Postgres classique. Or le développement tourne désormais
 * sur une base locale (cf. règle n°3 dans CLAUDE.md) — sans ce test, l'app
 * échoue avec un « Received network error or non-101 status code » assez
 * opaque, y compris pendant `next build`.
 *
 * On choisit donc l'adaptateur d'après l'hôte, et pas d'après NODE_ENV : c'est
 * l'URL qui détermine à quoi on parle. Une base locale en production (ou
 * l'inverse) fonctionnerait tout aussi bien.
 */
function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    // URL non parsable : on laisse Neon échouer avec son propre message
    // plutôt que de masquer le problème derrière un mauvais adaptateur.
    return true;
  }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  const adapter = isNeonUrl(connectionString)
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
