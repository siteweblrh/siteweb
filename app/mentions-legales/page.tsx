import type { Metadata } from 'next';
import { MentionsLegalesPageClient } from '@/components/lrh/pages/MentionsLegalesPageClient';

export const metadata: Metadata = {
  title: 'Mentions légales · Ligue Réunionnaise de Hockey',
  description:
    'Informations légales du site de la Ligue Réunionnaise de Hockey : éditeur, hébergeur, directeur de publication, conception, propriété intellectuelle et données personnelles.',
  robots: { index: true, follow: true },
};

export default function MentionsLegalesPage() {
  return <MentionsLegalesPageClient />;
}
