// Textes éditoriaux éditables depuis /dashboard/ligue/contenu.
//
// Ce fichier est **client-safe** (pas d'import prisma). Les helpers de lecture
// DB (getContent, getAllContent) sont dans lib/queries/siteContent.ts.
//
// Principe : chaque clé a une valeur par défaut hard-codée (DEFAULTS) qui est
// utilisée tant qu'aucune surcharge n'est en DB. L'admin peut écraser la valeur
// ou « restaurer l'original » (supprimer la rangée) à tout moment.
//
// Pour ajouter un texte éditable :
//   1. Déclarer la clé dans CONTENT_DEFS (slug, default, label, category).
//   2. Côté page server : lire via getContent(key) (await).
//   3. Passer la valeur en prop au composant client.

export type ContentMeta = {
  default: string;
  label: string;
  category: string;
  multiline?: boolean;
  hint?: string;
  /** 'image' bascule l'éditeur admin sur ImageUploader. La valeur reste un
   *  string (URL Cloudflare ou vide). Default 'text'. */
  type?: 'text' | 'image';
};

export const CONTENT_DEFS = {
  // ─────────────────────────────────────────────────────────────────
  // Sous-titres des PageHero (pages publiques)
  // ─────────────────────────────────────────────────────────────────
  'hero.actualites.subtitle': {
    default:
      "Résultats de match, communiqués officiels, événements, portraits — tout ce qui fait vivre la Ligue Réunionnaise de Hockey, mis à jour au fil de la saison.",
    label: 'Sous-titre — page /actualites',
    category: 'page-hero',
    multiline: true,
  },
  'hero.clubs.subtitle': {
    default:
      'Saint-Denis au Tampon, du Port à la Possession — toutes les structures qui font vivre le hockey à La Réunion, gazon et salle confondus.',
    label: 'Sous-titre — page /clubs',
    category: 'page-hero',
    multiline: true,
  },
  'hero.competitions.subtitle': {
    default:
      "Du gazon au parquet, suivez chaque journée — résultats, lieux et horaires actualisés en temps réel.",
    label: 'Sous-titre — page /competitions',
    category: 'page-hero',
    multiline: true,
  },
  'hero.classements.subtitle': {
    default:
      "Points, différence de buts, forme récente et meilleurs buteurs — le tableau officiel mis à jour après chaque journée.",
    label: 'Sous-titre — page /classements',
    category: 'page-hero',
    multiline: true,
  },
  'hero.arbitrage.subtitle': {
    default:
      "Le corps arbitral de la Ligue — effectif officiel, désignations sur les matchs gazon et salle, parcours de formation et commission dédiée.",
    label: 'Sous-titre — page /arbitrage',
    category: 'page-hero',
    multiline: true,
  },
  'hero.ligue.subtitle': {
    default:
      "Bureau exécutif, commissions thématiques et organes de fonctionnement — l'institution qui structure le hockey à La Réunion.",
    label: 'Sous-titre — page /ligue',
    category: 'page-hero',
    multiline: true,
  },
  'hero.licence.subtitle': {
    default:
      "Trouvez le club le plus proche de chez vous — la licence se prend directement auprès du club, qui gère votre inscription, vos entraînements et vos engagements en compétition.",
    label: 'Sous-titre — page /licence',
    category: 'page-hero',
    multiline: true,
  },

  // ─────────────────────────────────────────────────────────────────
  // Hero d'accueil
  // ─────────────────────────────────────────────────────────────────
  'home.hero.headline.gazon': {
    default: 'LE HOCKEY PEÏ,\nNIVEAU SUPÉRIEUR.',
    label: 'Titre Hero accueil — mode Gazon',
    category: 'home-hero',
    multiline: true,
    hint: 'Saut de ligne avec un retour chariot (Enter).',
  },
  'home.hero.headline.salle': {
    default: 'LA SALLE\nÉLECTRIQUE.',
    label: 'Titre Hero accueil — mode Salle',
    category: 'home-hero',
    multiline: true,
    hint: 'Saut de ligne avec un retour chariot (Enter).',
  },
  'home.hero.subtitle': {
    default:
      "Suivez les matchs, classements et licences de la Ligue Réunionnaise de Hockey en temps réel — gazon & salle, du Port au Tampon, partout dans l'île.",
    label: 'Sous-titre Hero accueil',
    category: 'home-hero',
    multiline: true,
  },
  'home.hero.background.gazon': {
    default: '',
    label: 'Image de fond Hero — Gazon',
    category: 'home-hero',
    type: 'image',
    hint: 'Image affichée en fond du Hero quand le mode Gazon est actif. Vide = gradient procédural par défaut. Un overlay sombre est appliqué automatiquement pour la lisibilité du titre.',
  },
  'home.hero.background.salle': {
    default: '',
    label: 'Image de fond Hero — Salle',
    category: 'home-hero',
    type: 'image',
    hint: 'Image affichée en fond du Hero quand le mode Salle est actif. Vide = gradient procédural par défaut.',
  },

  // ─────────────────────────────────────────────────────────────────
  // Bloc Devenir arbitre
  // ─────────────────────────────────────────────────────────────────
  'arbitrage.path.title': {
    default: 'Devenir\narbitre officiel.',
    label: 'Titre principal — bloc Devenir arbitre',
    category: 'arbitrage-path',
    multiline: true,
    hint: 'Saut de ligne avec Enter pour le titre sur 2 lignes.',
  },
  'arbitrage.path.intro': {
    default:
      "La Ligue forme chaque saison de nouveaux arbitres — sur gazon comme en salle. Aucun niveau de jeu requis. Le programme combine théorie (règlement, gestuelle), terrain (doublures, débriefs) et accompagnement jusqu'à validation par la FFH.",
    label: 'Intro — bloc Devenir arbitre',
    category: 'arbitrage-path',
    multiline: true,
  },

  'arbitrage.path.why1.tag': {
    default: 'Rester dans le jeu',
    label: 'Raison 1 — tag',
    category: 'arbitrage-path',
  },
  'arbitrage.path.why1.text': {
    default:
      "Continuer à pratiquer après une carrière de joueur, ou découvrir le hockey sous un autre angle.",
    label: 'Raison 1 — texte',
    category: 'arbitrage-path',
    multiline: true,
  },
  'arbitrage.path.why2.tag': {
    default: 'Reconnaissance',
    label: 'Raison 2 — tag',
    category: 'arbitrage-path',
  },
  'arbitrage.path.why2.text': {
    default:
      "Indemnités de match, statut officiel FFH, accès aux stages fédéraux.",
    label: 'Raison 2 — texte',
    category: 'arbitrage-path',
    multiline: true,
  },
  'arbitrage.path.why3.tag': {
    default: 'Communauté',
    label: 'Raison 3 — tag',
    category: 'arbitrage-path',
  },
  'arbitrage.path.why3.text': {
    default:
      "Un corps arbitral resserré sur l'île — formation continue, débriefs collectifs, esprit de camaraderie.",
    label: 'Raison 3 — texte',
    category: 'arbitrage-path',
    multiline: true,
  },

  'arbitrage.path.step1.title': {
    default: 'Candidat',
    label: 'Étape 1 — titre',
    category: 'arbitrage-path',
  },
  'arbitrage.path.step1.desc': {
    default:
      "Inscription auprès de la commission d'arbitrage. Pas de prérequis technique — juste l'envie de comprendre le jeu depuis l'autre côté du sifflet.",
    label: 'Étape 1 — description',
    category: 'arbitrage-path',
    multiline: true,
  },
  'arbitrage.path.step2.title': {
    default: 'Jeune arbitre',
    label: 'Étape 2 — titre',
    category: 'arbitrage-path',
  },
  'arbitrage.path.step2.desc': {
    default:
      'Formation initiale (règlement, gestuelle, positionnement) puis premiers matchs en doublure. Statut JA1 → JA2 → JA3 selon expérience.',
    label: 'Étape 2 — description',
    category: 'arbitrage-path',
    multiline: true,
  },
  'arbitrage.path.step3.title': {
    default: 'Régional',
    label: 'Étape 3 — titre',
    category: 'arbitrage-path',
  },
  'arbitrage.path.step3.desc': {
    default:
      'Validation après deux saisons effectives. Désignation sur D1 et coupes. Examen théorique + évaluation terrain.',
    label: 'Étape 3 — description',
    category: 'arbitrage-path',
    multiline: true,
  },
  'arbitrage.path.step4.title': {
    default: 'National / Fédéral',
    label: 'Étape 4 — titre',
    category: 'arbitrage-path',
  },
  'arbitrage.path.step4.desc': {
    default:
      'Stage fédéral, examen FFH, sifflets en métropole sur invitation. Plus haut niveau accessible depuis La Réunion.',
    label: 'Étape 4 — description',
    category: 'arbitrage-path',
    multiline: true,
  },

  'arbitrage.path.cta.title': {
    default: "Envoyez votre candidature à la commission d'arbitrage.",
    label: 'CTA — titre',
    category: 'arbitrage-path',
    multiline: true,
  },
  'arbitrage.path.cta.note': {
    default:
      'Une session de formation initiale est ouverte chaque début de saison (septembre pour le gazon, janvier pour la salle).',
    label: 'CTA — note',
    category: 'arbitrage-path',
    multiline: true,
  },
  'arbitrage.path.cta.email': {
    default: 'arbitrage@hockey-reunion.re',
    label: 'CTA — email de contact',
    category: 'arbitrage-path',
    hint: 'Email cliquable affiché en bouton gold.',
  },

  // ─────────────────────────────────────────────────────────────────
  // Page /licence — annuaire des clubs
  // ─────────────────────────────────────────────────────────────────
  'licence.intro.text': {
    default:
      "À La Réunion, la licence de hockey se prend auprès d'un club affilié à la Ligue. Le club gère votre dossier (inscription, certificat médical, engagements en compétition) et organise vos entraînements. Choisissez celui qui vous convient — proximité du lieu d'habitation, du travail, ou simplement affinités. La saison gazon court de septembre à juin, la salle de janvier à juin.",
    label: 'Intro — page /licence',
    category: 'licence',
    multiline: true,
  },
} as const satisfies Record<string, ContentMeta>;

export type ContentKey = keyof typeof CONTENT_DEFS;

export function isContentKey(s: string): s is ContentKey {
  return s in CONTENT_DEFS;
}

/** Catégories ordonnées pour l'affichage admin. */
export const CONTENT_CATEGORY_ORDER = [
  'page-hero',
  'home-hero',
  'licence',
  'arbitrage-path',
] as const;

export const CONTENT_CATEGORY_LABEL: Record<string, string> = {
  'page-hero': 'Sous-titres des pages',
  'home-hero': 'Hero d’accueil',
  'licence': 'Page « Prendre une licence »',
  'arbitrage-path': 'Bloc « Devenir arbitre »',
};
