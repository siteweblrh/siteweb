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
      "Résultats de match, communiqués officiels, événements, portraits — tout ce qui fait vivre la Ligue Régionale de Hockey, mis à jour au fil de la saison.",
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
  'hero.formation.subtitle': {
    default:
      "L'Académie fédérale et la Ligue forment ensemble les éducateurs, entraîneurs et formateurs du hockey réunionnais. Trois diplômes officiels (DF1, DF2, DF3), des sessions chaque saison, et un parcours de formateur ouvert aux titulaires d'un diplôme professionnel.",
    label: 'Sous-titre — page /formation',
    category: 'page-hero',
    multiline: true,
  },
  'hero.jeunes.subtitle': {
    default:
      "Du U11 au U19, le hockey peï se construit dès les plus jeunes catégories — compétitions officielles, détection régionale et formation continue des encadrants. Trouvez la catégorie de votre enfant et suivez la saison en direct.",
    label: 'Sous-titre — page /jeunes',
    category: 'page-hero',
    multiline: true,
  },
  'hero.pratique.subtitle': {
    default:
      "Le hockey ne se résume pas à la compétition. Loisir détendu, activité santé, sport adapté — la Ligue accompagne toutes les formes de pratique pour que chacun trouve sa place sur le terrain.",
    label: 'Sous-titre — page /pratique',
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
      "Suivez les matchs, classements et licences de la Ligue Régionale de Hockey en temps réel — gazon & salle, du Port au Tampon, partout dans l'île.",
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
  // Footer — réseaux sociaux LRH
  // ─────────────────────────────────────────────────────────────────
  'footer.social.instagram': {
    default: '',
    label: 'URL Instagram',
    category: 'footer',
    hint: 'URL complète (https://instagram.com/…). Vide = icône masquée.',
  },
  'footer.social.facebook': {
    default: '',
    label: 'URL Facebook',
    category: 'footer',
    hint: 'URL complète. Vide = icône masquée.',
  },
  'footer.social.youtube': {
    default: '',
    label: 'URL YouTube',
    category: 'footer',
    hint: 'URL complète. Vide = icône masquée.',
  },
  'footer.social.tiktok': {
    default: '',
    label: 'URL TikTok',
    category: 'footer',
    hint: 'URL complète. Vide = icône masquée.',
  },
  'footer.tagline': {
    default:
      'La ligue régionale de hockey sur gazon et en salle à La Réunion. Affiliée à la FFH.',
    label: 'Baseline footer',
    category: 'footer',
    multiline: true,
    hint: 'Petit texte sous le logo, max 2-3 lignes.',
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

  // ─────────────────────────────────────────────────────────────────
  // Page /formation — Formation fédérale
  // ─────────────────────────────────────────────────────────────────
  'formation.intro.title': {
    default: "L'Académie fédérale,\nrelai à La Réunion.",
    label: 'Titre principal — Formation',
    category: 'formation',
    multiline: true,
    hint: 'Saut de ligne avec Enter.',
  },
  'formation.intro.body': {
    default:
      "La Fédération Française de Hockey a structuré ses formations autour de trois diplômes fédéraux (DF1, DF2, DF3) pour harmoniser la formation des éducateurs d'un territoire à l'autre. La Ligue Régionale relaie ce dispositif sur l'île — sessions locales, formateurs habilités et accompagnement des candidats.",
    label: 'Texte d\'intro — Formation',
    category: 'formation',
    multiline: true,
  },

  'formation.obj1.tag': {
    default: 'Harmoniser',
    label: 'Objectif 1 — tag',
    category: 'formation',
  },
  'formation.obj1.text': {
    default:
      "Une formation cohérente d'un territoire à l'autre, alignée sur le projet sportif fédéral.",
    label: 'Objectif 1 — texte',
    category: 'formation',
    multiline: true,
  },
  'formation.obj2.tag': {
    default: 'Encadrer',
    label: 'Objectif 2 — tag',
    category: 'formation',
  },
  'formation.obj2.text': {
    default:
      "Élever le niveau d'encadrement dans les clubs — sécurité, pédagogie, projet de jeu.",
    label: 'Objectif 2 — texte',
    category: 'formation',
    multiline: true,
  },
  'formation.obj3.tag': {
    default: 'Performer',
    label: 'Objectif 3 — tag',
    category: 'formation',
  },
  'formation.obj3.text': {
    default:
      "Donner aux entraîneurs les outils pour mener une équipe en compétition — du gazon à la salle.",
    label: 'Objectif 3 — texte',
    category: 'formation',
    multiline: true,
  },

  'formation.df1.title': {
    default: 'Diplôme Fédéral 1 (DF1)',
    label: 'DF1 — titre',
    category: 'formation',
  },
  'formation.df1.public': {
    default: 'Animateur club, parent encadrant, jeune éducateur.',
    label: 'DF1 — public visé',
    category: 'formation',
    multiline: true,
  },
  'formation.df1.prereq': {
    default: 'Aucun prérequis — accessible dès la majorité (ou 16 ans avec accord parental).',
    label: 'DF1 — prérequis',
    category: 'formation',
    multiline: true,
  },
  'formation.df1.format': {
    default: "Session locale organisée par la Ligue, format week-end + travail à distance. Animation d'une séance de découverte hockey, sécurité, vocabulaire FIH.",
    label: 'DF1 — modalités',
    category: 'formation',
    multiline: true,
  },
  'formation.df1.validation': {
    default: 'Évaluation continue + mise en situation sur séance. Diplôme délivré par la FFH après validation du formateur référent.',
    label: 'DF1 — validation',
    category: 'formation',
    multiline: true,
  },

  'formation.df2.title': {
    default: 'Diplôme Fédéral 2 (DF2)',
    label: 'DF2 — titre',
    category: 'formation',
  },
  'formation.df2.public': {
    default: 'Éducateur confirmé, entraîneur d\'équipe jeune ou loisir.',
    label: 'DF2 — public visé',
    category: 'formation',
    multiline: true,
  },
  'formation.df2.prereq': {
    default: 'DF1 acquis + une saison effective d\'encadrement en club.',
    label: 'DF2 — prérequis',
    category: 'formation',
    multiline: true,
  },
  'formation.df2.format': {
    default: 'Stage régional de 4 jours (sessions Académie) + suivi en club. Projet de jeu, séances dirigées, gestion d\'équipe.',
    label: 'DF2 — modalités',
    category: 'formation',
    multiline: true,
  },
  'formation.df2.validation': {
    default: 'Évaluation théorique + pratique sur le terrain. Diplôme délivré par la FFH après validation par le formateur académie.',
    label: 'DF2 — validation',
    category: 'formation',
    multiline: true,
  },

  'formation.df3.title': {
    default: 'Diplôme Fédéral 3 (DF3)',
    label: 'DF3 — titre',
    category: 'formation',
  },
  'formation.df3.public': {
    default: 'Entraîneur de niveau compétition, candidat à la formation professionnelle (BPJEPS).',
    label: 'DF3 — public visé',
    category: 'formation',
    multiline: true,
  },
  'formation.df3.prereq': {
    default: 'DF2 acquis + expérience d\'encadrement confirmée. Dossier de candidature.',
    label: 'DF3 — prérequis',
    category: 'formation',
    multiline: true,
  },
  'formation.df3.format': {
    default: "Stage national piloté par l'Académie depuis 2021. Modules approfondis (préparation physique, analyse vidéo, projet sportif). Inscription ouverte chaque saison.",
    label: 'DF3 — modalités',
    category: 'formation',
    multiline: true,
  },
  'formation.df3.validation': {
    default: 'Examen final + rapport de stage. Diplôme FFH ouvrant l\'accès aux formations professionnelles spécialité hockey.',
    label: 'DF3 — validation',
    category: 'formation',
    multiline: true,
  },

  'formation.former.title': {
    default: 'Devenir\nformateur ligue.',
    label: 'Devenir formateur — titre',
    category: 'formation',
    multiline: true,
    hint: 'Saut de ligne avec Enter.',
  },
  'formation.former.intro': {
    default:
      "Pour les DF1 et DF2, l'Académie met en place des formations de formateurs afin d'imposer un cadre commun et garantir la qualité de l'enseignement. La Ligue Régionale recrute en continu des formateurs habilités pour porter ces sessions sur l'île.",
    label: 'Devenir formateur — intro',
    category: 'formation',
    multiline: true,
  },
  'formation.former.prereq1': {
    default: "Diplôme professionnel de niveau IV minimum avec spécialité hockey (BPJEPS, DEJEPS, DESJEPS, Licence STAPS + DF3, BEES 1 ou 2, BP + DF3).",
    label: 'Devenir formateur — prérequis 1',
    category: 'formation',
    multiline: true,
  },
  'formation.former.prereq2': {
    default: "Envoyer une lettre de motivation et un CV à la commission formation de la Ligue.",
    label: 'Devenir formateur — prérequis 2',
    category: 'formation',
    multiline: true,
  },
  'formation.former.prereq3': {
    default: "Validation après sélection par la direction de l'Académie fédérale.",
    label: 'Devenir formateur — prérequis 3',
    category: 'formation',
    multiline: true,
  },
  'formation.cta.title': {
    default: "Postuler ou se renseigner",
    label: 'CTA — titre',
    category: 'formation',
  },
  'formation.cta.note': {
    default: "Les inscriptions aux sessions DF1/DF2 sont ouvertes chaque début de saison sportive. Le calendrier précis est communiqué par la commission formation.",
    label: 'CTA — note',
    category: 'formation',
    multiline: true,
  },
  'formation.cta.email': {
    default: 'formation@hockey-reunion.re',
    label: 'CTA — email',
    category: 'formation',
    hint: 'Email cliquable affiché en bouton gold.',
  },

  // ─────────────────────────────────────────────────────────────────
  // Page /jeunes — Championnat Jeunes
  // ─────────────────────────────────────────────────────────────────
  'jeunes.intro.title': {
    default: 'Le hockey peï\nse joue dès U11.',
    label: 'Titre principal — Jeunes',
    category: 'jeunes',
    multiline: true,
    hint: 'Saut de ligne avec Enter.',
  },
  'jeunes.intro.body': {
    default:
      "Chaque catégorie d'âge a son championnat officiel, son calendrier et ses règles adaptées. La Ligue organise les rencontres, l'arbitrage et la détection régionale en lien avec les clubs formateurs.",
    label: 'Texte d\'intro — Jeunes',
    category: 'jeunes',
    multiline: true,
  },
  'jeunes.empty.text': {
    default:
      "Pas encore de compétition créée pour cette catégorie sur la saison en cours. Les calendriers sont publiés en début de saison sportive (septembre pour le gazon, janvier pour la salle).",
    label: 'Message si aucune compétition jeune programmée',
    category: 'jeunes',
    multiline: true,
  },

  'jeunes.encadr.title': {
    default: 'Encadrement & sécurité',
    label: 'Encadrement — titre',
    category: 'jeunes',
  },
  'jeunes.encadr.body': {
    default:
      "Tous les encadrants jeunes sont titulaires d'un diplôme fédéral (DF1 minimum). Les rencontres se déroulent en présence d'un délégué de la Ligue et d'un arbitre formé. Protocole de protection des mineurs en vigueur — signalement, déontologie, formation continue.",
    label: 'Encadrement — texte',
    category: 'jeunes',
    multiline: true,
  },

  'jeunes.detection.title': {
    default: 'Détection régionale',
    label: 'Détection — titre',
    category: 'jeunes',
  },
  'jeunes.detection.body': {
    default:
      "La commission technique organise chaque saison des stages de détection ouverts aux meilleurs joueurs U14 et U17. Objectif : préparer les sélections régionales et accompagner les profils prometteurs vers les pôles France.",
    label: 'Détection — texte',
    category: 'jeunes',
    multiline: true,
  },

  'jeunes.ethique.title': {
    default: 'Éthique & fair-play',
    label: 'Éthique — titre',
    category: 'jeunes',
  },
  'jeunes.ethique.body': {
    default:
      "Le championnat jeune privilégie l'apprentissage et le plaisir avant le résultat. Les clubs s'engagent à respecter la charte fair-play : mixité encouragée jusqu'en U14, rotation des postes, encadrement positif. Les sanctions disciplinaires sont gérées par la commission jeunesse.",
    label: 'Éthique — texte',
    category: 'jeunes',
    multiline: true,
  },

  'jeunes.cta.title': {
    default: "Contacter la commission jeunesse",
    label: 'CTA Jeunes — titre',
    category: 'jeunes',
  },
  'jeunes.cta.email': {
    default: 'jeunesse@hockey-reunion.re',
    label: 'CTA Jeunes — email',
    category: 'jeunes',
  },
  'jeunes.cta.note': {
    default: "Pour inscrire votre enfant, contactez directement un club de votre commune (page Clubs). Pour les questions de détection, de calendrier ou d'éthique, écrivez à la commission jeunesse.",
    label: 'CTA Jeunes — note',
    category: 'jeunes',
    multiline: true,
  },

  // ─────────────────────────────────────────────────────────────────
  // Page /pratique — hub Activités diverses
  // ─────────────────────────────────────────────────────────────────
  'pratique.intro.title': {
    default: 'Le hockey,\nautrement.',
    label: 'Titre principal — Pratique',
    category: 'pratique-hub',
    multiline: true,
    hint: 'Saut de ligne avec Enter.',
  },
  'pratique.intro.body': {
    default:
      "Au-delà de la compétition, plusieurs formes de pratique existent à La Réunion. Loisir entre amis, hockey-santé en lien avec un médecin du sport, sport adapté — chacune avec ses créneaux, ses encadrants et ses clubs référents.",
    label: 'Texte d\'intro — Pratique',
    category: 'pratique-hub',
    multiline: true,
  },

  'pratique.card.loisir.tag': {
    default: 'Pratique libre',
    label: 'Card Loisir — tag',
    category: 'pratique-hub',
  },
  'pratique.card.loisir.title': {
    default: 'Hockey Loisirs',
    label: 'Card Loisir — titre',
    category: 'pratique-hub',
  },
  'pratique.card.loisir.excerpt': {
    default: "Du hockey sans pression compétitive, ouvert à tous les niveaux. Créneaux conviviaux, ambiance club, tournois amicaux sur l'année.",
    label: 'Card Loisir — extrait',
    category: 'pratique-hub',
    multiline: true,
  },
  'pratique.card.sante.tag': {
    default: 'Sport-santé',
    label: 'Card Santé — tag',
    category: 'pratique-hub',
  },
  'pratique.card.sante.title': {
    default: 'Hockey Santé',
    label: 'Card Santé — titre',
    category: 'pratique-hub',
  },
  'pratique.card.sante.excerpt': {
    default: "Activité physique adaptée encadrée — programme intégré au parcours Sport-Santé sur prescription. Réhabilitation, prévention, bien-être.",
    label: 'Card Santé — extrait',
    category: 'pratique-hub',
    multiline: true,
  },

  // ─────────────────────────────────────────────────────────────────
  // Page /pratique/loisir
  // ─────────────────────────────────────────────────────────────────
  'pratique.loisir.intro.title': {
    default: 'Hockey Loisirs',
    label: 'Titre — Hockey Loisirs',
    category: 'pratique-loisir',
  },
  'pratique.loisir.intro.body': {
    default:
      "Le hockey loisirs s'adresse à toutes les personnes qui veulent pratiquer sans engagement compétitif — anciens joueurs, parents, débutants curieux. Les séances sont animées par les éducateurs des clubs, dans une ambiance détendue. Aucun classement, juste le plaisir du jeu.",
    label: 'Intro — Hockey Loisirs',
    category: 'pratique-loisir',
    multiline: true,
  },
  'pratique.loisir.who.title': {
    default: 'Pour qui ?',
    label: 'Pour qui — titre',
    category: 'pratique-loisir',
  },
  'pratique.loisir.who.body': {
    default:
      "Adultes de tous niveaux, hommes et femmes, à partir de 18 ans. Aucune expérience préalable requise — les éducateurs adaptent les exercices. Tenue de sport, chaussures de salle et eau suffisent ; le matériel (crosse, protections) est prêté pour la découverte.",
    label: 'Pour qui — texte',
    category: 'pratique-loisir',
    multiline: true,
  },
  'pratique.loisir.where.title': {
    default: 'Où & quand',
    label: 'Où & quand — titre',
    category: 'pratique-loisir',
  },
  'pratique.loisir.where.body': {
    default:
      "Les créneaux loisirs sont organisés par les clubs affiliés. La plupart proposent une séance hebdomadaire en soirée (mardi ou jeudi selon les communes). Consultez la page Clubs pour les contacts et horaires précis.",
    label: 'Où & quand — texte',
    category: 'pratique-loisir',
    multiline: true,
  },
  'pratique.loisir.how.title': {
    default: 'Comment participer',
    label: 'Comment participer — titre',
    category: 'pratique-loisir',
  },
  'pratique.loisir.how.body': {
    default:
      "Contactez directement un club de votre commune pour participer à une séance d'essai gratuite. Si vous souhaitez continuer, une licence loisirs FFH est requise (formule allégée, certificat médical obligatoire). Tarifs et modalités fixés par chaque club.",
    label: 'Comment participer — texte',
    category: 'pratique-loisir',
    multiline: true,
  },

  // ─────────────────────────────────────────────────────────────────
  // Page /pratique/sante
  // ─────────────────────────────────────────────────────────────────
  'pratique.sante.intro.title': {
    default: 'Hockey Santé',
    label: 'Titre — Hockey Santé',
    category: 'pratique-sante',
  },
  'pratique.sante.intro.body': {
    default:
      "Le hockey santé propose une pratique adaptée encadrée par des éducateurs formés à l'activité physique sur prescription médicale. Il s'inscrit dans le parcours Sport-Santé reconnu par le ministère de la Santé et la Maison Sport-Santé de La Réunion.",
    label: 'Intro — Hockey Santé',
    category: 'pratique-sante',
    multiline: true,
  },
  'pratique.sante.who.title': {
    default: 'Pour qui ?',
    label: 'Pour qui — titre',
    category: 'pratique-sante',
  },
  'pratique.sante.who.body': {
    default:
      "Personnes atteintes de pathologies chroniques (cardiovasculaires, métaboliques, ALD), en phase de réhabilitation ou souhaitant reprendre une activité physique sous accompagnement. Sur prescription médicale du médecin traitant ou du médecin du sport.",
    label: 'Pour qui — texte',
    category: 'pratique-sante',
    multiline: true,
  },
  'pratique.sante.where.title': {
    default: 'Encadrement & sécurité',
    label: 'Encadrement — titre',
    category: 'pratique-sante',
  },
  'pratique.sante.where.body': {
    default:
      "Séances animées par un éducateur formé Sport-Santé (qualification ANSES ou équivalent). Évaluation des capacités physiques en début de cycle, suivi individualisé, intensité progressive. Travail en lien avec le médecin prescripteur.",
    label: 'Encadrement — texte',
    category: 'pratique-sante',
    multiline: true,
  },
  'pratique.sante.how.title': {
    default: 'Comment s\'inscrire',
    label: 'Comment s\'inscrire — titre',
    category: 'pratique-sante',
  },
  'pratique.sante.how.body': {
    default:
      "Demandez une prescription Sport-Santé à votre médecin, puis contactez la commission développement de la Ligue qui vous oriente vers un club partenaire. Tarif modéré, prise en charge partielle possible selon mutuelle.",
    label: 'Comment s\'inscrire — texte',
    category: 'pratique-sante',
    multiline: true,
  },

  // ─────────────────────────────────────────────────────────────────
  // CTA partagé Pratique (footer des sous-pages)
  // ─────────────────────────────────────────────────────────────────
  'pratique.cta.email': {
    default: 'developpement@hockey-reunion.re',
    label: 'CTA Pratique — email contact',
    category: 'pratique-hub',
    hint: "Email affiché en CTA en bas de /pratique, /pratique/loisir et /pratique/sante.",
  },
  'pratique.cta.note': {
    default: "Une question, un projet, l'envie d'ouvrir un créneau dans votre commune ? La commission développement vous répond.",
    label: 'CTA Pratique — note',
    category: 'pratique-hub',
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
  'formation',
  'jeunes',
  'pratique-hub',
  'pratique-loisir',
  'pratique-sante',
  'footer',
] as const;

export const CONTENT_CATEGORY_LABEL: Record<string, string> = {
  'page-hero': 'Sous-titres des pages',
  'home-hero': 'Hero d’accueil',
  'licence': 'Page « Prendre une licence »',
  'arbitrage-path': 'Bloc « Devenir arbitre »',
  'formation': 'Page « Formation fédérale »',
  'jeunes': 'Page « Championnat Jeunes »',
  'pratique-hub': 'Hub « Activités diverses »',
  'pratique-loisir': 'Sous-page « Hockey Loisirs »',
  'pratique-sante': 'Sous-page « Hockey Santé »',
  'footer': 'Footer (réseaux sociaux, baseline)',
};

/** Phrase courte pour chaque catégorie — affichée dans les cards d'index admin. */
export const CONTENT_CATEGORY_DESCRIPTION: Record<string, string> = {
  'page-hero': "Phrase d'intro affichée sous le titre de chaque page publique (Actualités, Clubs, Compétitions, etc.).",
  'home-hero': "Titre, sous-titre et image de fond du grand bandeau d'accueil — différent en mode Gazon et Salle.",
  'licence': "Texte d'introduction au-dessus de l'annuaire des clubs sur la page « Prendre une licence ».",
  'arbitrage-path': "Bloc « Devenir arbitre officiel » : raisons d'y aller, étapes du parcours, CTA candidature.",
  'formation': "Présentation de l'Académie fédérale et des trois diplômes (DF1, DF2, DF3) + parcours formateur ligue.",
  'jeunes': "Bandeau d'intro, encadrement, détection régionale et éthique du championnat jeunes (U11→U19).",
  'pratique-hub': "Page d'entrée des activités diverses : intro et cards Loisirs / Sport-Santé + CTA partagé.",
  'pratique-loisir': "Détails de la pratique hockey loisirs : pour qui, où, comment participer.",
  'pratique-sante': "Détails du hockey-santé : public concerné, encadrement, inscription via prescription médicale.",
  'footer': "URLs des réseaux sociaux (Instagram, Facebook, YouTube, TikTok) et baseline du pied de page.",
};

/** URL de la page publique correspondante — affichée comme lien « Voir la page publique »
 *  dans l'éditeur. `null` signifie qu'il n'y a pas de page dédiée (ex: footer global). */
export const CONTENT_CATEGORY_PUBLIC_URL: Record<string, string | null> = {
  'page-hero': null,
  'home-hero': '/',
  'licence': '/licence',
  'arbitrage-path': '/arbitrage',
  'formation': '/formation',
  'jeunes': '/jeunes',
  'pratique-hub': '/pratique',
  'pratique-loisir': '/pratique/loisir',
  'pratique-sante': '/pratique/sante',
  'footer': null,
};
