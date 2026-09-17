import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // `dashboard-hco/` est un dump du site HCO gardé comme référence : jamais
    // compilé, jamais importé (cf. CLAUDE.md). Le linter n'a rien à en dire.
    "dashboard-hco/**",
    // `public/lrh-website/` est la maquette JSX d'origine, servie telle quelle
    // comme fichier statique et jamais exécutée. Même raison.
    "public/**",
  ]),
  {
    rules: {
      // Le danger réel que vise cette règle, c'est un `>` ou un `}` égaré dans
      // du JSX : ça se compile mais ça affiche n'importe quoi. L'apostrophe,
      // elle, est inoffensive — et le site est intégralement rédigé en
      // français, où elle apparaît dans une phrase sur deux. Escaper 83
      // « l&apos;ouvrir » rendrait le texte source illisible sans changer un
      // pixel du rendu. On garde donc la règle, sur les deux caractères qui
      // méritent une alerte.
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],

      // Le préfixe `_` déclare une valeur volontairement ignorée — typiquement
      // un champ qu'on retire d'un objet par déstructuration
      // (`{ competitionStats: _ignored, ...reste }`). Sans ça, la seule façon
      // d'exprimer l'intention était de subir un avertissement.
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],

      // ⚠️ Dégradé en `warn` DÉLIBÉRÉMENT, ce n'est pas un correctif.
      //
      // Cette règle (React Compiler, eslint-plugin-react-hooks v7) signale
      // 19 endroits, de deux natures :
      //
      //  1. Des effets qui sont à leur place et qu'on ne touchera pas : lecture
      //     de `localStorage` au montage volontairement différée pour éviter un
      //     flash au SSR (CookieConsent, AnalyticsGated), démarrage de timers
      //     (IdleTimer), chargement de données (MatchesAdmin, TirageForm),
      //     fermeture d'un menu au changement de route (Header,
      //     DashboardDesktop — dont l'état pilote aussi le scroll du body).
      //
      //  2. Des remises à zéro d'état quand une clé change (page → 1, filtre →
      //     « toutes »). Celles-là gagneraient à être dérivées pendant le
      //     render, mais chacune demande une vérification à l'écran : une
      //     tentative de ce genre a déjà été annulée dans
      //     `draft/AddCompetitionForm.tsx` parce qu'elle changeait un cas
      //     limite (cf. le commentaire qui y est resté). Sur un site en
      //     production et sans test d'interface, on ne réécrit pas neuf
      //     composants d'un coup pour satisfaire un linter — règle n°1.
      //
      // Les trois cas où la dérivation était prouvablement équivalente ont,
      // eux, été corrigés (page de login, ClassementsPageClient,
      // `useActiveCompetitionId`). Le reste reste visible en warning.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // Les affiches réseaux sociaux ne sont pas rendues dans un navigateur mais
    // par Satori (`ImageResponse` de next/og), qui ne connaît que quelques
    // balises et certainement pas `next/image`. `<img>` y est la seule option.
    files: ["components/social/**"],
    rules: { "@next/next/no-img-element": "off" },
  },
]);

export default eslintConfig;
