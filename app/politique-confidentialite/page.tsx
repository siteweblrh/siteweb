import type { Metadata } from 'next';
import Link from 'next/link';
import { LRH, mono, display, body } from '@/components/lrh/tokens';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Politique de protection des données personnelles de la Ligue Réunionnaise de Hockey (RGPD).',
  alternates: { canonical: '/politique-confidentialite' },
};

export default function PolitiqueConfidentialitePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: LRH.paper,
        padding: 'clamp(28px, 5vw, 64px) clamp(20px, 5vw, 64px)',
      }}
    >
      <article style={{ maxWidth: 820, margin: '0 auto' }}>
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ width: 28, height: 2, background: LRH.red }} />
          Mentions légales · RGPD
        </div>

        <h1
          style={{
            ...display,
            fontWeight: 800,
            fontSize: 'clamp(28px, 5vw, 48px)',
            color: LRH.navy,
            margin: '0 0 12px',
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
          }}
        >
          Politique de confidentialité.
        </h1>

        <p
          style={{
            ...body,
            fontSize: 14,
            color: LRH.mute,
            margin: '0 0 36px',
            lineHeight: 1.6,
            maxWidth: 640,
          }}
        >
          Comment la Ligue Réunionnaise de Hockey collecte, utilise et protège
          tes données personnelles. Dernière mise à jour : 2026-05-19.
        </p>

        <Section title="1. Qui est responsable du traitement ?">
          <p>
            La <strong>Ligue Réunionnaise de Hockey (LRH)</strong>, association
            loi 1901, SIREN 421 664 079, RNA W9R1000088, dont le siège social
            est à La Réunion (974), est responsable du traitement de tes
            données collectées via ce site.
          </p>
          <p>
            Les coordonnées complètes sont disponibles dans les{' '}
            <Link href="/mentions-legales" style={inlineLink}>mentions légales</Link>.
          </p>
        </Section>

        <Section title="2. Quelles données sont collectées ?">
          <p>Sont collectées <strong>uniquement</strong> les données suivantes :</p>
          <Bullets
            items={[
              <>
                <strong>Compte utilisateur</strong> (managers de club, arbitres,
                administrateurs) : nom, prénom, email, mot de passe haché
                (Argon2). Saisi par toi-même ou créé par un administrateur.
              </>,
              <>
                <strong>Données de session</strong> : cookie HTTP-only signé,
                durée 30 minutes d&apos;inactivité (NextAuth). Indispensable au
                fonctionnement de l&apos;espace privé.
              </>,
              <>
                <strong>Mesure d&apos;audience</strong> (Vercel Analytics) :
                pages visitées, type d&apos;appareil, pays, Web Vitals. Données{' '}
                <em>anonymes</em>, agrégées, jamais croisées avec ton compte.
                Activée uniquement si tu y consens via le bandeau d&apos;accueil.
              </>,
              <>
                <strong>Logs techniques</strong> : adresse IP, user-agent,
                date/heure des actions sensibles (suppressions, modifications
                de score officiel). Conservés au titre du journal
                d&apos;audit (article 6.1.f RGPD — intérêt légitime de la ligue à
                tracer les actes administratifs sportifs).
              </>,
            ]}
          />
        </Section>

        <Section title="3. Pourquoi ces données ?">
          <Bullets
            items={[
              <>
                <strong>Compte</strong> : permettre la gestion administrative
                d&apos;un club, d&apos;une équipe ou de la ligue (saisie des
                matchs, publication d&apos;actualités, désignations
                d&apos;arbitres).
              </>,
              <>
                <strong>Mesure d&apos;audience</strong> : comprendre ce que les
                visiteurs cherchent (matchs, classements, clubs) pour faire
                évoluer le site. Aucun usage marketing ou publicitaire.
              </>,
              <>
                <strong>Logs</strong> : sécurité (détection d&apos;intrusion),
                traçabilité administrative en cas de contestation sportive.
              </>,
            ]}
          />
        </Section>

        <Section title="4. Combien de temps sont-elles conservées ?">
          <Bullets
            items={[
              <>
                <strong>Compte actif</strong> : tant que ton rattachement
                fonctionnel existe (gestion d&apos;un club, statut
                d&apos;arbitre, etc.). Suppression sur demande à tout moment.
              </>,
              <>
                <strong>Cookie de consentement</strong> : 13 mois maximum
                (recommandation CNIL).
              </>,
              <>
                <strong>Logs d&apos;audit</strong> : 3 saisons sportives, soit
                ~3 ans, durée nécessaire pour traiter une contestation a
                posteriori.
              </>,
              <>
                <strong>Mesure d&apos;audience anonyme</strong> : 13 mois
                glissants (rétention Vercel Analytics).
              </>,
            ]}
          />
        </Section>

        <Section title="5. Qui peut y accéder ?">
          <p>
            Tes données sont accessibles uniquement aux administrateurs
            techniques de la ligue (compte ADMIN) dans le cadre strict de leur
            mission. Aucune donnée n&apos;est revendue, ni partagée à des tiers
            commerciaux.
          </p>
          <p>Sous-traitants techniques utilisés :</p>
          <Bullets
            items={[
              <>
                <strong>Neon (Postgres serverless)</strong> — hébergement de la
                base. Données en Europe.
              </>,
              <>
                <strong>Vercel</strong> — hébergement du site Next.js. Données
                de session et logs en Europe.
              </>,
              <>
                <strong>Cloudflare Images / Cloudinary</strong> — stockage des
                photos (joueurs, news, logos clubs).
              </>,
              <>
                <strong>Cloudflare Turnstile</strong> — anti-bot sur le
                formulaire de connexion (challenge non-cookie côté visiteur).
              </>,
              <>
                <strong>Resend</strong> — envoi des emails transactionnels
                (réinitialisation de mot de passe).
              </>,
              <>
                <strong>Sentry</strong> — collecte des erreurs JavaScript pour
                diagnostiquer les bugs. Les IP sont tronquées.
              </>,
            ]}
          />
        </Section>

        <Section title="6. Tes droits">
          <p>Conformément au RGPD, tu disposes des droits suivants :</p>
          <Bullets
            items={[
              "Droit d'accès : obtenir une copie des données te concernant",
              "Droit de rectification : corriger des données inexactes",
              "Droit à l'effacement : demander la suppression de ton compte",
              "Droit à la portabilité : recevoir tes données dans un format structuré",
              "Droit d'opposition au traitement à des fins de mesure d'audience",
              "Droit de retirer ton consentement à tout moment",
            ]}
          />
          <p style={{ marginTop: 14 }}>
            Pour exercer ces droits, contacte la ligue par email à{' '}
            <a href="mailto:contact@lrh.re" style={inlineLink}>contact@lrh.re</a>.
            Une réponse te sera apportée dans un délai d&apos;un mois.
          </p>
          <p>
            En cas de désaccord, tu peux saisir la CNIL :{' '}
            <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" style={inlineLink}>
              cnil.fr/fr/plaintes
            </a>
            .
          </p>
        </Section>

        <Section title="7. Cookies utilisés">
          <p>Liste exhaustive des cookies que ce site est susceptible de poser :</p>
          <Bullets
            items={[
              <>
                <code style={codeStyle}>authjs.session-token</code> — cookie de
                session NextAuth (essentiel, sans alternative).
              </>,
              <>
                <code style={codeStyle}>lrh.cookie-consent</code> —{' '}
                <em>localStorage</em>, mémorise ton choix sur le bandeau (13 mois).
              </>,
              <>
                <code style={codeStyle}>_vercel_*</code> — Vercel Analytics si
                consenti. Anonyme, agrégé.
              </>,
            ]}
          />
        </Section>

        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px dashed ' + LRH.hairStrong,
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            ...mono,
            fontSize: 10.5,
            color: LRH.mute,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          <Link href="/mentions-legales" style={{ color: LRH.navy, textDecoration: 'none' }}>
            ▸ Mentions légales
          </Link>
          <Link href="/" style={{ color: LRH.navy, textDecoration: 'none' }}>
            ▸ Accueil
          </Link>
        </div>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        style={{
          ...display,
          fontWeight: 700,
          fontSize: 'clamp(18px, 2.4vw, 22px)',
          color: LRH.navy,
          margin: '0 0 14px',
          letterSpacing: '-0.015em',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          ...body,
          fontSize: 14,
          color: LRH.ink2,
          lineHeight: 1.65,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ margin: '8px 0 8px 0', paddingLeft: 20 }}>
      {items.map((it, i) => (
        <li key={i} style={{ marginBottom: 8 }}>{it}</li>
      ))}
    </ul>
  );
}

const inlineLink: React.CSSProperties = {
  color: LRH.navy,
  textDecorationColor: LRH.gold,
  textUnderlineOffset: 3,
  fontWeight: 600,
};

const codeStyle: React.CSSProperties = {
  ...mono,
  fontSize: 12,
  background: LRH.paperWarm,
  padding: '1px 6px',
  border: '1px solid ' + LRH.hair,
  color: LRH.navy,
};
