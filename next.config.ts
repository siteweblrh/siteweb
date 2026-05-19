/** @type {import('next').NextConfig} */

// CSP construite par tokens pour rester lisible. Sources whitelistées :
// - 'self' = même origine
// - data:, blob: pour les SVG inline / images base64 / blobs upload
// - challenges.cloudflare.com pour le widget Turnstile (login)
// - api.cloudinary.com pour l'upload direct image
// - res.cloudinary.com pour la delivery image (couvert par img-src https:)
// - vercel.live, *.vercel-scripts.com pour les analytics Vercel
// - Google Fonts (au cas où, harmless)
//
// 'unsafe-inline' / 'unsafe-eval' nécessaires pour Next.js (HMR dev, RSC).
// À durcir avec nonces dans une itération future si on veut un AA strict.
import { withSentryConfig } from '@sentry/nextjs';

// CSP : on whitelist aussi *.sentry.io (ingest des erreurs) et *.ingest.sentry.io.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "connect-src 'self' https://challenges.cloudflare.com https://api.cloudinary.com https://*.vercel-scripts.com https://vercel.live https://*.neon.tech wss://*.neon.tech https://*.sentry.io https://*.ingest.sentry.io",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig = {
  // CSS inlinée dans <head> (expérimental Next 16). Élimine le render-blocking
  // sur le CSS Tailwind (~7.5 KiB) en l'embarquant directement dans le HTML
  // initial. Idéal pour atomic CSS (Tailwind) sur un site avec beaucoup de
  // first-time visitors (info publique LRH). Le trade-off : les visiteurs
  // récurrents perdent le cache CSS, mais le bundle reste très petit.
  experimental: {
    inlineCss: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Anti-clickjacking. frame-ancestors dans CSP fait la même chose,
          // mais on garde X-Frame-Options pour les navigateurs anciens.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Empêche le navigateur de "deviner" le type MIME (anti-sniffing).
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // N'envoyer le referer qu'à même origine, et juste l'origine en cross.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Force HTTPS pendant 1 an, inclus sous-domaines, eligible preload.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Désactive les APIs sensibles que la LRH n'utilise pas.
          // Geolocation reste 'self' car la page /licence l'utilise.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          { key: 'Content-Security-Policy', value: csp },
          // Force le navigateur à respecter les Cross-Origin policies par défaut.
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

// Wrap avec Sentry pour upload des source maps en prod. Si SENTRY_AUTH_TOKEN
// n'est pas fourni, l'upload est skipped silencieusement — l'app fonctionne
// quand même, mais les stacks Sentry seront minifiées.
//
// Env vars requises (à set dans Vercel) :
//   SENTRY_DSN              côté serveur (instrumentation.ts)
//   NEXT_PUBLIC_SENTRY_DSN  côté client (sentry.client.config.ts)
//   SENTRY_ORG              org Sentry (ex: lrh)
//   SENTRY_PROJECT          slug du projet (ex: lrh-website)
//   SENTRY_AUTH_TOKEN       token avec scope project:releases (upload source maps)
export default withSentryConfig(nextConfig, {
  // Skip silencieux en local / si pas configuré
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Cache les routes /monitoring vers Sentry pour bypass ad-blockers.
  tunnelRoute: '/monitoring',
  // Upload source maps en build (Sentry les supprime côté serveur après upload
  // pour ne pas exposer le code source via les .js.map publics).
  widenClientFileUpload: true,
  sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
  disableLogger: true,
  // Ne pas faire échouer le build si l'upload Sentry échoue (réseau, token absent, etc.)
  errorHandler: (err) => {
    console.warn('[sentry] sourcemap upload failed (non-blocking):', err.message);
  },
});
