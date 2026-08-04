import type { Metadata } from 'next';
import { MentionsLegalesPageClient } from '@/components/lrh/pages/MentionsLegalesPageClient';

export const metadata: Metadata = {
  // Nom du site ajouté par `title.template` (app/layout.tsx) — pas de suffixe ici.
  title: 'Mentions légales',
  description:
    'Informations légales du site de la Ligue Réunionnaise de Hockey : éditeur, hébergeur, directeur de publication, conception, propriété intellectuelle et données personnelles.',
  robots: { index: true, follow: true },
};

export default function MentionsLegalesPage() {
  return <MentionsLegalesPageClient />;
}
