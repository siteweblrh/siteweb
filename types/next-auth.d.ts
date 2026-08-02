import { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: string;
    mustChangePassword?: boolean;
    /** Horodatage de la dernière relecture de la base (cf. JWT_DB_REFRESH_MS). */
    refreshedAt?: number;
  }
}
