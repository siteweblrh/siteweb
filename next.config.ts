/** @type {import('next').NextConfig} */

// CSP construite par tokens pour rester lisible. Sources whitelistées :
// - 'self' = même origine
// - data: pour les SVG inline et images base64
// - challenges.cloudflare.com pour le widget Turnstile (login)
// - imagedelivery.net pour Cloudflare Images (à terme Cloudinary)
// - res.cloudinary.com pour Cloudinary (préparation migration)
// - vercel.live, *.vercel-scripts.com pour les analytics Vercel
// - Google Fonts (au cas où, harmless)
//
// 'unsafe-inline' / 'unsafe-eval' nécessaires pour Next.js (HMR dev, RSC).
// À durcir avec nonces dans une itération future si on veut un AA strict.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "connect-src 'self' https://challenges.cloudflare.com https://*.vercel-scripts.com https://vercel.live https://*.neon.tech wss://*.neon.tech",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig = {
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

export default nextConfig;
