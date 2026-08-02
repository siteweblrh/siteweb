'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // `refetchOnWindowFocus` vaut `true` par défaut : chaque retour sur
    // l'onglet déclenchait un appel à /api/auth/session, donc le rappel `jwt`,
    // donc une requête Prisma. Un onglet dashboard laissé ouvert derrière
    // l'éditeur suffisait à réveiller la base à chaque alt-tab et à lui
    // interdire de s'endormir (Neon facture le temps d'éveil, cf. CLAUDE.md
    // règle n°2).
    //
    // Ce qu'on perd : une session expirée côté serveur n'est plus détectée au
    // retour sur l'onglet, mais à la navigation suivante. `IdleTimer`
    // (30 min) et le rappel `jwt` couvrent déjà ce besoin.
    <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>
  );
}
