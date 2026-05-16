# Journal de session

Trace des décisions et travaux effectués au fil des sessions. Ajouter les entrées en haut (ordre anti-chronologique).

---

## 2026-05-16 · Carte interactive /clubs + organigramme bureau

### Contexte

Avant de commit/push, le user a demandé deux ajouts visuels :
1. Une carte interactive sur `/clubs` à partir de `public/assets/La-Reunion-974-carte.svg` (qui traînait non tracké) avec les clubs disposés géographiquement.
2. Le bureau de la ligue sous forme d'organigramme (au lieu du grid de cards plat actuel).

### Décisions

- **Pas de schema change pour la carte.** Le mapping ville → coordonnées est hardcodé dans `lib/reunionCityCoords.ts` pour les communes principales de La Réunion (24 villes couvertes). Un club dont la `city` n'est pas mappée tombe dans une liste de fallback "Hors carte" affichée à côté. Quand on aura besoin de positions plus précises ou de villes manquantes, on ajoutera `Club.mapX` / `Club.mapY` plus tard.
- **Coordonnées en POURCENTAGES du viewBox** (0-100), pas en pixels — la carte reste responsive sans recalcul.
- **Cluster offset automatique** : si plusieurs clubs partagent la même ville (même `(x, y)`), ils sont dispersés en cercle autour du point pour rester lisibles.
- **Pas de schema change pour l'organigramme.** Le niveau hiérarchique est déduit du champ `role` (texte libre côté admin) par mots-clés : "Président" → niveau 0, "Vice-Président" → 1, "Secrétaire" ou "Trésorier" → 2, autres → 3. L'admin contrôle l'ordre dans chaque niveau via le champ `order` déjà existant. Si on veut un vrai org chart M:N plus tard, on ajoutera un `parentId`. Mais pour l'effectif réaliste d'un bureau LRH (~10-15 membres), 4 niveaux statiques suffisent.

### Travaux réalisés

**Helper coords** `lib/reunionCityCoords.ts` (NOUVEAU) :
- `getCityCoords(city)` : lookup tolérant (accents, casse, tirets normalisés) sur une table interne de 24 communes principales. Couverture : Saint-Denis, Saint-Paul, Le Tampon, Saint-Pierre, Saint-André, Saint-Benoît, La Possession, Le Port, Saint-Louis, Saint-Joseph, Saint-Leu, Bras-Panon, Sainte-Marie, Sainte-Suzanne, Sainte-Rose, Saint-Philippe, Petite-Île, Entre-Deux, Étang-Salé, Cilaos, Salazie, etc.
- Coords en % du viewBox SVG (`0 0 14413 13405`). Approximatives, dérivées visuellement — pas du géocodage strict.

**Section carte** `components/lrh/sections/ClubsMap.tsx` (NOUVEAU, ~370 lignes) :
- Layout grid 2 colonnes (1.6fr carte / 1fr panneau lecture) sur desktop, 1 colonne empilée sur mobile.
- **MapCanvas** : container `aspect-ratio: 14413 / 13405` qui rend le SVG via `<img src="/assets/...">` (objectFit contain). Filter `drop-shadow + saturate(0.9) brightness(0.96)` pour donner un fond visuel sans toucher au fichier SVG.
- **Markers** absolument positionnés (`left: x%; top: y%; transform: translate(-50%, -50%)`), couleur = `primaryColor` du club (red fallback), gold pour les ententes. Hover : scale 1.15 + shadow + halo pulse + tooltip navy avec nom + ville + crest.
- **Cluster offset** : si plusieurs clubs même ville, dispersion en cercle (rayon 2.4% du viewBox).
- **Panneau lecture** à droite : card navy avec stripe + légende (point red = club, point gold = entente), liste "Hors carte" pour clubs non mappés, footnote méthodologie.
- **Z-index** : marker hovered passe au-dessus pour que son tooltip ne soit pas caché par d'autres markers.

**Refonte BureauBoard** `components/lrh/sections/BureauBoard.tsx` (RÉÉCRITE, ~370 lignes) :
- Détection niveau via `levelOf(role)` (regex sur mots-clés français + tolérance accents).
- 4 niveaux : `Présidence`, `Vice-présidences`, `Direction administrative`, `Membres du bureau`. Chaque niveau a son accent (gold / red / navy / vert) et son kicker.
- **LevelRow** : titre kicker centré dans une pill `border + borderLeft 3px accent`, sous laquelle une rangée flex centered de `MemberCard`. Le card président est plus grand (avatar 120px, layout 2 cols photo+meta, padding généreux, badge "★ Présidence" en label sortie au-dessus du card, shadow gold 0.18).
- **LevelConnector** entre chaque niveau : trait pointillé vertical navy avec petits points gold/navy aux extrémités. Hauteur ~44px desktop / 28px mobile.
- Cards plus petits aux niveaux 1+ (avatar 76 → 64), nom + role + email + phone + startedAt inline. Bio uniquement sur le card président.
- Empty state cohérent (text + dashed border) si pas de membre.

**Barrel** `components/lrh/sections/index.ts` : ajout `ClubsMap`.

**Page client** `components/lrh/pages/ClubsPageClient.tsx` : insertion `<ClubsMap />` entre `<StatsRibbon />` et `<ClubsBoard />`. La liste éditoriale reste sous la carte — sert l'accessibilité (les markers SVG sont moins screen-reader friendly que les liens texte) et le SEO.

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : **0 erreur**.

### À tester côté user

1. `/clubs` → vérifier le rendu de la carte avec les clubs existants. Hover sur un marker → tooltip s'affiche, clic → ouvre `/clubs/<slug>`. Vérifier le mobile (la carte passe en colonne 1, le panneau lecture descend dessous).
2. Si un club a une ville non mappée (ex. "Cambuston", "Bois-de-Nèfles"…) → doit apparaître dans la liste "Hors carte" et non sur la map. Ajouter la ville à `lib/reunionCityCoords.ts` si besoin.
3. Si plusieurs clubs même ville (ex. tous à Saint-Paul) → vérifier qu'ils se dispersent en cercle au lieu de se superposer.
4. `/ligue` → vérifier l'organigramme. Avec le bureau actuel (s'il y a un Président + des VP + Secrétaire/Trésorier), les 4 niveaux devraient se composer naturellement. Si tout est "Membre" sans rôle parlant, tout tombe en niveau 3 (cas dégradé acceptable).
5. Éditer un membre côté `/dashboard/ligue/bureau` : changer le role en "Vice-Président adjoint" → doit basculer en niveau 1. Mettre "Président d'honneur" → niveau 0 (car contient "président" sans "vice"). Pour les cas borderline qu'on veut classer manuellement, mentionner explicitement le mot-clé dans le role.

### À reprendre plus tard

- **Édition admin de la position carte** : si on veut un contrôle précis (pas juste par ville), ajouter `Club.mapX / mapY: Int?` (% viewBox) + un picker côté `/dashboard/club/profile` (clic sur la carte pour poser le marqueur).
- **Carte zoomable** : si la liste de clubs grandit, ajouter pan/zoom (react-zoom-pan-pinch ou natif via wheel events). Pas urgent.
- **Org chart vrai M:N** : si la structure du bureau devient complexe (commissions imbriquées, élus territoriaux, etc.), passer à un modèle `BureauMember.parentId` + UI admin pour reliers les nodes. Pour l'instant la classification par mot-clé est plus simple à maintenir.
- **Connecteurs T en organigramme** : actuellement la "branche" entre niveaux est une seule ligne centrale. Pour un look encore plus org-chart, ajouter de petits stubs verticaux au-dessus de chaque card connectant à une horizontal shelf au niveau du parent. Demande du calcul de layout côté JS — bien plus complexe pour un gain visuel marginal.

---

## 2026-05-16 · Harmonisation /actualites et /clubs à la charte LRH

### Contexte

Suite de la stabilisation visuelle du site. Le user a constaté que `/actualites` (liste + slug) et `/clubs` (liste) étaient restés dans l'ancien style « SaaS générique » : headers `<header bg=navy borderBottom=red>` custom, cards `borderRadius: 16`, pas de mode toggle, pas de PageHero, pas de Footer. Pendant que `/competitions`, `/classements`, `/ligue`, `/clubs/[slug]` étaient déjà passés au design éditorial LRH. Objectif : harmoniser ces 3 pages avec le reste.

### Décisions

- **Pattern systématique** pour toutes les pages publiques : `app/<route>/page.tsx` (server, fetch Prisma) → `components/lrh/pages/<Name>PageClient.tsx` (client, mode + UI state) → assemblage `Header → PageHero → StatsRibbon → ...sections... → Footer`. Aligné avec la mémoire `feedback-modules-reutilisables`.
- **Mode toggle conservé** sur ces pages même s'il ne filtre pas les données (articles, clubs). Cohérence navigation : la barre `HeaderDesktop`/`HeaderMobile` requiert l'état mode pour la `SeasonToggle`. Aucun coût UX.
- **NewsCard refactorisé** pour matcher la charte (corners 0, `borderTop: 3px solid {category.bg}` en accent vertical sans-radius, plus de wrapper `Card` arrondi 16px). Cascade au home (NewsDesktop/Mobile) — apparence reste éditoriale, juste plus stricte sur les corners.
- **CategoryFilter chips éditorialisés** (corners 0, mono uppercase, fond category.bg quand actif au lieu du navy générique).
- **Sur `/actualites`** : featured = 1er article en grand, reste en grille auto-fill. Filtre catégorie sticky.
- **Sur `/actualites/[slug]`** : "hero éditorial" plein écran avec cover image en bg, overlay gradient sombre, kicker catégorie + date + reading time en mono uppercase, titre display 800 en blanc avec text-shadow. Pas de Header semi-transparent collé sur l'image — le Header LRH normal reste blanc opaque au-dessus, c'est la signature du site. Body article dans un wrapper blanc avec `borderTop: 3px navy`, encadré par un excerpt "Le résumé" gold et un footer auteur/club avec accent rouge.
- **Sur `/clubs`** : groupage par `kind` (Clubs affiliés / Ententes), chaque card a `borderLeft: 4px solid {primaryColor}` du club, logo si défini sinon ClubCrest, badge "◆ Entente" gold pour les ententes, mention des clubs constituants, stats (Licenciés / Compétitions). Le clic ouvre `/clubs/<slug>`.

### Travaux réalisés

**Refactor module existant** :
- `components/lrh/sections/News.tsx` :
  - `NewsCard` : suppression du wrapper `Card` (radius 16) → div direct avec `border + borderTop: 3px solid cat.bg`. Hover lift + shadow. Le badge catégorie perd son `borderRadius: 4` pour rester corners droits.
  - `NewsDesktop` / `NewsMobile` : empty state perd son `borderRadius: 16` / `12`.

**Nouveaux modules sections** :
- `components/lrh/sections/NewsBoard.tsx` (NOUVEAU, ~200 lignes) — page liste actualités :
  - Filtre catégorie sticky (chips mono uppercase, lien `href="/actualites?c=<cat>"` ou `/actualites` pour "Tous").
  - Featured "★ À la une" sur fond paperWarm avec separator kicker gold.
  - Grille "Toutes les publications · N" séparée par un kicker rouge, auto-fill minmax(320px).
  - Empty state avec message contextuel selon filtre actif.
- `components/lrh/sections/ClubsBoard.tsx` (NOUVEAU, ~270 lignes) — page liste clubs :
  - Grouping par kind avec kickers numérotés ("Clubs affiliés · N" en red / "Ententes · N" en gold).
  - `ClubCard` éditoriale : header logo + name + city/fondé, bloc dédié pour les ententes listant les `parentClubs` en chips mono, stats footer Licenciés/Compétitions, flèche d'accent à la couleur primaire.
  - Empty state cohérent.

**Nouveaux pages client** :
- `components/lrh/pages/ActualitesPageClient.tsx` — Header + PageHero ("04 · Le fil officiel" / "Les nouvelles du hockey péi.") + StatsRibbon (Total publié / Résultats / Événements / Communiqués) + NewsBoard + Footer.
- `components/lrh/pages/ArticlePageClient.tsx` — Header + ArticleHero custom (cover image en bg avec overlay sombre, OU fond navy + stripe si pas de cover) + body wrapper éditorial + author footer + Footer. Le `<script>` JSON-LD reste dans la page server.
- `components/lrh/pages/ClubsPageClient.tsx` — Header + PageHero ("05 · Affiliés à la Ligue" / "Les clubs de l'île.") + StatsRibbon (Clubs / Ententes / Communes / Licenciés) + ClubsBoard + Footer.

**Pages server refactorisées** :
- `app/actualites/page.tsx` — passe `articles` + `activeCategory` au client. Reste server pour SSR du filtre + SEO.
- `app/actualites/[slug]/page.tsx` — passe un payload `ArticlePayload` enrichi (avec `readingTime` pré-calculé) au client. `generateMetadata` + `generateStaticParams` + JSON-LD inchangés.
- `app/clubs/page.tsx` — utilise `getAllClubsForListPage()` (NOUVELLE query enrichie).

**Nouvelle query** (`lib/queries/club.ts`) :
- `getAllClubsForListPage()` charge `kind`, `primaryColor`, `logo`, `foundedYear`, `description`, `parentClubs` (ententes), `_count: { members, competitionEntries, standings }`. Type exporté : `ClubsListItem`.
- `getAllClubs()` (basique, 5 champs) conservée — toujours utilisée par le sélecteur club côté admin et autres consommateurs minimalistes.

**Barrel** `components/lrh/sections/index.ts` : ajout `NewsBoard`, `ClubsBoard`.

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : **0 erreur** (102 lignes filtrées dans le dossier sibling).

### À tester côté user

1. `/actualites` → vérifier hero éditorial, filtre catégorie chips (cliquer "Résultats" → URL passe `?c=RESULTAT`), featured + grille, mobile vs desktop.
2. `/actualites/<slug>` → vérifier hero plein écran avec cover image, badge catégorie + date + reading time, body dans wrapper éditorial, bloc auteur+club en footer. Sans cover image, doit afficher fond navy + stripe.
3. `/clubs` → vérifier StatsRibbon (Clubs / Ententes / Communes / Licenciés), groupage par kind, accent vertical primaryColor (configurer une couleur primaire sur un club côté `/dashboard/club/profile` puis revérifier), chips constituants pour les ententes.
4. Toggle Gazon/Salle dans le header de ces 3 pages → doit fonctionner mais ne change rien au contenu (par design — c'est juste de la cohérence nav).
5. Cliquer un club depuis `/clubs` → atterrit sur `/clubs/<slug>` (déjà refondue précédemment, doit toujours marcher).

### À reprendre plus tard

- **Filtre mode sur /actualites** : on pourrait filtrer les articles par mode si on tague chaque article avec `Mode?` (gazon / salle / les deux). Pas urgent, pas demandé.
- **Recherche fulltext** sur `/actualites` (Prisma full-text ou Algolia/Meilisearch) — quand la base d'articles deviendra grande.
- **Page `/clubs` filtre par mode** : afficher seulement les clubs engagés en Gazon ou en Salle selon le toggle. Faisable rapidement via `CompetitionEntry → competition.mode`.
- **Article : navigation prev/next** (article précédent / suivant par date) — manque un peu pour la complétude éditoriale. Trivial à ajouter.

---

## 2026-05-16 · Buteurs scope-compétition (intégrés dans Classements) + nav refresh

### Contexte

Itération directe après la mise en ligne de `/buteurs`. Le user a remonté trois ajustements + une question d'avis :

1. **Buteurs intégrés dans `/classements`**, pas une page séparée. Le buteur doit être contextuel à la compétition sélectionnée (D1 Gazon ≠ Coupe de la Ligue Gazon).
2. **Différenciation par compétition** explicite — il faut prévoir la **Coupe de la Ligue Salle + Gazon** qui arriveront en plus des D1.
3. **Bouton Accueil** dans la nav publique.
4. **Avis honnête** sur renommer "Compétitions" → "Calendrier".

### Décisions

- **Stats par compétition = saisie manuelle pour l'instant**, basculera vers les feuilles de match plus tard. Choix user explicite : "manuel pour le moment mais dépendra des feuilles de matchs dans le futur".
- **Nouveau modèle `MemberCompetitionStats(memberId, competitionId, matchesPlayed, goalsScored)`** unique `[memberId, competitionId]`. Cascade sur delete Member + Competition.
- **Suppression de `Member.matchesPlayed` / `Member.goalsScored`** (agrégés). Le total affiché sur la fiche publique du club est désormais la **somme** des `competitionStats` calculée à la lecture par `getPublicMembersForClub`. Pas de duplication, pas de cache à invalider.
- **Renommage "Compétitions" → "Calendrier" : OUI sur le label nav, NON sur la route.** Avis donné au user : pour le contenu actuel (timeline de matchs avec filtre par tournoi), "Calendrier" colle mieux. Mais on garde `/competitions` comme route — renommer l'URL casse bookmarks + SEO pour 0 gain, et la route reste utile sémantiquement pour les futures pages dédiées par tournoi (`/competitions/<slug>` palmarès, format, etc.).
- **Pas de page dédiée /buteurs** — supprimée. Le buteur est partie intégrante du contexte "Classements" puisque scope = compétition.
- **Filtre catégorie chips supprimé** dans ScorersBoard : la compétition implique déjà une catégorie unique, le filtre était redondant.

### Travaux réalisés

**Schéma Prisma** (`prisma/schema.prisma`) :
- Nouveau modèle `MemberCompetitionStats` avec unique `[memberId, competitionId]` + index `[competitionId, goalsScored]` (utilisé par la query top buteurs) + index `[memberId]`.
- Suppression de `Member.matchesPlayed` et `Member.goalsScored`.
- Ajout relation inverse `Competition.memberStats`.
- `prisma generate` + `prisma db push --accept-data-loss` exécutés.

**Actions** (`lib/actions/member.ts`) :
- `MemberSchema` allégé : retrait des 2 champs.
- `applyPlayerOnlyFields` simplifiée (ne gère plus que `isFeatured` + `featuredHeadline`).
- `MEMBER_SELECT` inclut désormais `competitionStats` avec relation `competition` (id/name/mode/season/category) pour permettre l'agrégat et l'affichage dans `TeamAdmin`.
- Nouvelles fonctions :
  - `listClubEligibleCompetitionsForStats(clubId)` — retourne les compétitions où le club est engagé (entries OU standings OU matches). Permet la rétro-saisie pour les compétitions créées avant la Phase B.
  - `setMemberCompetitionStats(memberId, list)` — replace semantics : upsert toutes les rangées fournies, delete celles absentes. Garde-fou : valide que chaque `competitionId` est éligible pour le club du joueur. Refus si kind ≠ PLAYER.

**Queries** :
- `lib/queries/scorers.ts` réécrit : `getTopScorersForCompetition(competitionId, limit = 30)` au lieu de `getTopScorersForMode(mode)`. Lit directement `MemberCompetitionStats` filtré par compétition, joint membre + club, retourne un shape stable (aplati) avec tri secondaire JS sur `lastName` (Prisma ne sait pas trier sur relation imbriquée).
- `lib/queries/club.ts` : `getPublicMembersForClub` charge `competitionStats` et calcule `matchesPlayed` / `goalsScored` par somme. Le shape exposé à `EffectifBoard` est inchangé.

**UI Dashboard `/dashboard/team`** :
- `TeamAdmin` form joueur : retrait des 2 inputs MJ/Buts globaux. La saisie passe maintenant par le panneau dédié (cf. ci-dessous).
- Nouveau composant `StatsPanel` (inline dans `TeamAdmin.tsx`) qui s'affiche **uniquement en mode édition d'un PLAYER**, sous le form principal :
  - Une ligne par compétition éligible du club (props `eligibleCompetitions`).
  - Inputs MJ + Buts par ligne, valeurs initiales = `competitionStats` existantes (ou 0/0 si absent).
  - Total agrégé MJ + Buts affiché en pill navy/red à droite du header — mis à jour en live.
  - Bouton "Sauvegarder les stats" séparé du Save member. Replace semantics : on n'envoie que les lignes non-nulles, le reste est supprimé en DB.
  - Empty state si le club n'est inscrit à aucune compétition (incitation à passer côté ligue).
- `MemberCard` (vignette dans la liste) : totaux affichés = somme des `competitionStats`. Indication "N compét·s" en bas de la card si le joueur a au moins une rangée stats.
- `page.tsx` server : ajout du fetch `listClubEligibleCompetitionsForStats(club.id)` en parallèle, prop passée à `TeamAdmin`.

**Intégration côté `/classements`** :
- `app/classements/page.tsx` : pour chaque compétition de chaque mode, fetch en parallèle des top 30 buteurs. Construit `scorersByCompetition: Record<competitionId, TopScorer[]>` par mode.
- `ClassementsPageClient` : ajout d'une section "03 · Meilleurs buteurs" sous le `StandingsBoard`, scope = compétition active. Toggle compétition met à jour automatiquement le leaderboard (state client).
- `buildStats` du StatsRibbon : la 4ᵉ cellule "Total matchs joués" est remplacée par "Meilleur buteur" (nom + buts) — beaucoup plus parlant.
- `ScorersBoard` simplifié : retrait du filtre catégorie sticky et de l'état React associé. Ajout d'une prop optionnelle `context?: string` affichée sous le kicker "★ Meilleurs buteurs · Top 3" dans le podium navy (ex. "D1 Gazon · 2025-2026").

**Suppression de `/buteurs`** :
- `app/buteurs/` (dossier complet) supprimé.
- `components/lrh/pages/ButeursPageClient.tsx` supprimé.
- NavLink "Buteurs" retiré du header.

**Navigation publique** (`components/lrh/sections/Header.tsx`) :
- Ajout `<NavLink href="/">Accueil</NavLink>` en première position.
- Renommage label `"Compétitions"` → `"Calendrier"` (route `/competitions` inchangée — la `CompetitionsPageClient` parle déjà de "Calendrier officiel" dans son kicker, c'est aligné).

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : **0 erreur** (102 lignes filtrées toutes dans le dossier sibling).

### À redémarrer côté user

⚠ Schéma modifié → **restart `npm run dev` obligatoire**. Les anciennes valeurs `Member.matchesPlayed` et `Member.goalsScored` sont perdues (`--accept-data-loss`). À ressaisir via le nouveau `StatsPanel` dans `/dashboard/team`, **par compétition cette fois**.

### À tester côté user

1. `/dashboard/team` (compte manager) → cliquer "Modifier" sur un PLAYER → le `StatsPanel` apparaît sous le form. Saisir MJ + Buts pour D1 Gazon par exemple, sauvegarder. Le total visible dans la card doit se mettre à jour.
2. `/classements` → sélectionner D1 Gazon → vérifier que le buteur saisi apparaît dans le podium "★ Meilleurs buteurs". Switcher vers une autre compétition → le leaderboard doit se mettre à jour (ou disparaître si aucune saisie).
3. Vérifier que le toggle Gazon ↔ Salle change bien le set des buteurs (Coupe de la Ligue à venir : créer la compétition côté ligue, l'inscrire à 2 clubs, saisir des buts pour des joueurs, vérifier qu'elle apparaît dans le filter chips de Classements + scope buteurs distinct des D1).
4. Vérifier que le bouton **"Accueil"** dans le nav ramène bien à `/`.
5. Vérifier qu'aucune page ne référence plus `/buteurs` (404 attendu si on y va direct).

### À reprendre plus tard

- **Coupes de la Ligue** : créer en DB les compétitions "Coupe de la Ligue Gazon" + "Coupe de la Ligue Salle" pour la saison en cours, inscrire les clubs concernés, vérifier que les buteurs sont bien scopés au tournoi.
- **Feuilles de match** : remplacer la saisie manuelle de `MemberCompetitionStats` par dérivation depuis `Goal` (à enrichir avec `scorerMemberId`) + une notion de "lineup" pour `matchesPlayed`. Le shape de `MemberCompetitionStats` reste compatible — seule la logique d'alimentation change.
- **Pages dédiées par compétition** (`/competitions/<slug>`) : si on veut un palmarès de Coupe ou un règlement, c'est l'endroit. La route est libre.
- **Optimisation `loadModeData`** : on fetch les buteurs pour TOUTES les compétitions d'un mode au server-side. OK tant que N reste petit (~5-10 compétitions × 30 buteurs). Si ça grossit, basculer sur une server action déclenchée au toggle.

---

## 2026-05-16 · Page publique /buteurs — classement ligue cross-clubs

### Contexte

Suite directe de l'itération précédente (affichage public de l'effectif). Le user a donné carte blanche pour prolonger le travail sur les cards joueurs. Décision : capitaliser sur `EffectifBoard` en construisant un classement des buteurs **transverse aux clubs** — c'est le contenu éditorial qui manquait pour donner vie à l'identité "ligue" (vs site de club). Scope : 1-2h, purement additif, pas de schema change.

### Décisions

- **Données = `Member.goalsScored` actuel (compteur agrégé manuel).** Pas mode-spécifique côté DB (un Member n'a qu'un seul compteur de buts, peu importe Gazon/Salle). Limitation assumée → docstring de méthodologie en bas de page. Quand les feuilles de match arriveront, la stat se décomposera par mode automatiquement.
- **Filtrage par mode = présence du club dans le mode.** Un joueur apparaît dans `/buteurs?mode=GAZON` si son club a au moins une CompetitionEntry / Standing / Match en GAZON. UX cohérente avec le toggle sans mentir sur la granularité des stats.
- **Tri primaire `goalsScored DESC`, secondaire `matchesPlayed ASC` (efficacité), puis nom.** Les joueurs avec 0 but sont exclus (`gt: 0`).
- **Filtre catégorie sticky** (Toutes / U11 / U14 / U17 / U19 / Sénior / Vétéran) — n'apparaît que si ≥2 catégories présentes. Les rangs sont **recalculés sur le set filtré** (sinon un U17 filtré apparaîtrait avec rang #12 alors qu'il est #1 dans sa catégorie).
- **Pas de page profil joueur dans cette itération** — cards non cliquables sur le joueur lui-même. Mais le club EST cliquable (logo + nom → `/clubs/<slug>`) car la navigation joueur → club a beaucoup de sens.

### Travaux réalisés

**Query** `lib/queries/scorers.ts` (NOUVEAU) :
- `getTopScorersForMode(mode, limit = 30)` — filtre Member kind=PLAYER, goalsScored>0, club avec présence dans le mode (OR sur competitionEntries / standings / homeMatches / awayMatches).
- Type `TopScorer` exporté via `ReturnType<typeof getTopScorersForMode>[number]`.

**Section** `components/lrh/sections/ScorersBoard.tsx` (NOUVEAU, ~600 lignes) :
- **`ScorersPodium`** : top 3 sur fond navy avec spotlight gold (réutilise le pattern visuel de `Podium.tsx` pour les classements équipes). Disposition desktop : #2 gauche, #1 centre surélevé +8px avec shadow gold, #3 droite. Mobile : 1 colonne verticale.
- **`PodiumScorerCard`** : card blanche avec photo grande (260px leader / 220px autres), pill rang #N top-left, badge "★ MEILLEUR BUTEUR" gold top-right pour #1. Nom display 800, club cliquable avec logo, gros chiffre buts (rouge 56px leader / 44px autres) + MJ + ratio buts/match.
- **`ScorerCard`** : grille pour rangs 4+. Photo 200px (160 mobile), pill rang navy top-left, logo club top-right, **pill rouge "X BUTS" bottom-left** (centré sur l'info clé), nom + club cliquable en footer, MJ en sub-stat.
- **Chips catégorie sticky** (`position: sticky; top: 0`) sur fond paper avec border-bottom, recalcul des rangs sur le set filtré.
- **Photo fallback** : initiales gold sur gradient navy + stripe pattern (cohérent avec EffectifBoard).
- **Empty state** propre quand aucun buteur (pas un crash, pas un blanc).

**Page** `app/buteurs/page.tsx` + `components/lrh/pages/ButeursPageClient.tsx` :
- Server fetch parallèle GAZON+SALLE (top 60 chacun).
- Client wrapper : Header → PageHero ("Qui plante les buts ?" avec kicker 03) → StatsRibbon (meilleur buteur, total buts, joueurs classés, clubs représentés) → ScorersBoard → bloc méthodologie → Footer.
- `revalidate = 60` pour rafraîchir quand un manager met à jour ses stats.

**Module ajouté au barrel** `components/lrh/sections/index.ts` : `ScorersBoard`, `TopScorer`.

**Nav header** `components/lrh/sections/Header.tsx` :
- Ajout `<NavLink href="/buteurs">Buteurs</NavLink>` entre Classements et Clubs.

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : **0 erreur**. (102 lignes filtrées toutes dans le dossier sibling non compilé.)

### À tester côté user

1. Visiter `/buteurs` directement → vérifier le rendu desktop + mobile.
2. Toggle Gazon ↔ Salle → le set de joueurs doit changer si les clubs ont des engagements différents par mode.
3. Filtre catégorie sticky → les rangs doivent se recalculer (un joueur U17 avec 8 buts peut être #1 du filtre U17 mais #5 dans "Toutes").
4. Cliquer sur un nom de club / logo → doit ouvrir `/clubs/<slug>`.
5. Vérifier qu'un club sans aucun joueur avec `goalsScored > 0` n'apparaît pas, mais reste accessible via `/clubs/<slug>`.

### À reprendre plus tard

- **Page profil joueur** (`/clubs/<slug>/joueurs/<id>` ou `/joueurs/<id>`) : si on ajoute un jour une fiche détaillée, rendre les cards cliquables sur le nom. Pour l'instant, seul le club est cliquable.
- **Feuilles de match** : c'est le gros chantier qui rendra le compteur `goalsScored` automatique. À ce moment-là, on pourra décomposer la stat par mode et le filtre du `/buteurs` deviendra honnête.
- **Stats agrégées par compétition** : "meilleur buteur de la D1 Gazon" vs "meilleur buteur Coupe" — nécessite la feuille de match d'abord.
- **Trophée fin de saison** : à la fin d'une saison Gazon ou Salle, "geler" le leader pour l'archiver (modèle `SeasonTopScorer` ?). Pas urgent.

---

## 2026-05-16 · Affichage public de l'effectif (cards modernes + featured player)

### Contexte

Suite des itérations sur l'espace club. Le user a demandé un affichage public moderne de l'effectif sur `/clubs/[slug]` avec : cards joueurs avec stats (matchs joués, buts marqués), poste, dossard, logo du club, et une **carte large "à la une"** mise en avant. Même style pour coachs/staff mais sans stats.

### Décisions

- **Stats joueurs = compteurs manuels** dans cette itération (`matchesPlayed`, `goalsScored` sur Member). Saisie via `/dashboard/team`. **Plus tard** : auto-incrément depuis les feuilles de match (lineup + buteurs) — le schéma actuel reste compatible, on basculera juste la logique d'alimentation.
- **Featured = joueurs uniquement.** `isFeatured` + `featuredHeadline` réservés à `kind = PLAYER`. Côté action, force `isFeatured=false` et stats à 0 si kind=COACH/STAFF (via `applyPlayerOnlyFields`). Tri public : featured d'abord (via `orderBy: { isFeatured: 'desc' }`).
- **Pas de page profil joueur** dans cette itération. Les cards sont visuelles seulement (hover lift), pas cliquables. À ouvrir si besoin.
- **Filtre catégorie sticky** uniquement quand le club a plusieurs catégories engagées (≥2). Sinon redondant.

### Travaux réalisés

**Schéma Prisma** (`prisma/schema.prisma`) :
- `Member` étendu : `isFeatured Boolean`, `featuredHeadline String?`, `matchesPlayed Int @default(0)`, `goalsScored Int @default(0)` + index `[clubId, isFeatured]`.
- `prisma generate` + `prisma db push --accept-data-loss` exécutés.

**Actions** :
- `lib/actions/member.ts` : `MemberSchema` accepte les 4 nouveaux champs. `applyPlayerOnlyFields(data)` centralise la règle "PLAYER only" → force featured/headline/stats à 0/false/null pour COACH/STAFF. Appliqué dans `createMember` et `updateMember`.
- `lib/queries/club.ts` : nouvelle query interne `getPublicMembersForClub(clubId)` ordonnée `isFeatured DESC → kind ASC → category ASC → jerseyNumber ASC → lastName ASC`. Intégrée dans `getClubPageDataByMode` (remplace l'ancien `prisma.member.count`). Le retour expose désormais `members: ClubPublicMember[]` + `memberCount: members.length` (conservé pour StatsRibbon).

**Module section** `components/lrh/sections/EffectifBoard.tsx` (NOUVEAU, ~600 lignes) :
- 3 variantes de card :
  - **PlayerCard** (standard) : photo carrée 220px (170 mobile), pill dossard gold en bas-gauche, logo club mini en top-right, nom + poste, footer avec 2 stats MJ (navy) / BUTS (red). Hover : `translateY(-2px)` + shadow navy léger.
  - **FeaturedPlayerCard** (large 2 colonnes) : photo gauche 100% height, panneau navy droite avec stripe diagonal (charte LRH), badge "● À la une" gold, nom display gros, poste · catégorie en accent (primaryColor du club), citation (`featuredHeadline`) en italique, 2 gros chiffres MJ blanc / BUTS gold. Hover : shadow gold.
  - **StaffCard** (compact horizontal) : photo 50-60px, nom + rôle, logo club. Pas de stats. Border-left selon kind (rouge pour COACH, vert pour STAFF).
- **Fallback photo** : si pas de `photo`, affiche les initiales en blanc/gold sur gradient navy avec stripe pattern — cohérent avec la charte au lieu d'un placeholder gris.
- **ClubBadge** : logo du club si défini, sinon `ClubCrest noLink` (utilise la prop opt-out qu'on a ajoutée pour éviter les nested `<a>`).
- **Chips catégorie sticky** : "Toutes" + chips par catégorie présente. Filtre live l'array `players`.
- **Sous-headings catégorie** affichés uniquement quand "Toutes" est actif et qu'il y a >1 catégorie.
- **primaryColor du club** utilisée comme accent (border-top des PlayerCard, color du poste sur featured). Fallback gold.
- **Empty state** propre si `members.length === 0`.

**Module ajouté au barrel** `components/lrh/sections/index.ts` (`EffectifMember`, `EffectifClubMeta` exportés aussi).

**UI dashboard** `/dashboard/team` (`TeamAdmin.tsx`) :
- Form étendu : pour kind=PLAYER, nouvelle ligne "Matchs joués / Buts marqués" puis bloc "À la une" (toggle + champ headline conditionnel). Le bloc featured a un styling visible (background gold tinté) pour qu'on voie tout de suite qu'il est actif.
- `emptyForm` et `memberToInput` étendus avec les 4 nouveaux champs.
- MemberCard de la liste : badge "● À la une" en top-right si `isFeatured`, border-left gold au lieu de l'accent kind. Footer stats MJ/BUTS visibles pour PLAYER (display 800 navy/red).

**Intégration fiche publique** :
- `app/clubs/[slug]/page.tsx` propage `members` à `ClubPageClient`.
- `components/lrh/pages/ClubPageClient.tsx` accepte `members: EffectifMember[]`, ajoute l'anchor "Effectif" si non vide, et insère `<EffectifBoard>` entre Classement et News.

### Vérification

`npx tsc --noEmit` : **0 erreur** hors `dashboard-hco/` (102 lignes filtrées, toutes dans le dossier sibling).

### À redémarrer côté user

⚠️ **Schéma modifié → restart `npm run dev` obligatoire**. Les anciens Members existants auront `isFeatured=false`, `matchesPlayed=0`, `goalsScored=0` par défaut — à mettre à jour via le form si besoin.

### À tester côté user

1. `/dashboard/team` → éditer un joueur, cocher "À la une" + ajouter une mention ("Capitaine", "Top scoreuse 2024"), saisir MJ et BUTS, sauvegarder.
2. Visiter `/clubs/<slug>` → vérifier la section Effectif : featured player en grand en tête, puis grille joueurs par catégorie, puis encadrement, puis staff.
3. Vérifier filtre catégorie (si club a U17 + Sénior par exemple).
4. Tester sans photo : initiales en gold/navy doivent apparaître proprement.
5. Tester avec primaryColor configurée sur le club (Profil → couleur principale) : doit être utilisée en accent dans EffectifBoard.

### À reprendre plus tard

- **Feuilles de match** : module à part qui automatisera `matchesPlayed` (via appearances) et `goalsScored` (lien Goal → Member). Quand on aura ça, le manager n'aura plus à saisir les stats à la main.
- **Page profil joueur** `/clubs/<slug>/joueurs/<id>` : si on veut une fiche détaillée (historique, stats par compétition, etc.).
- **Édition par catégorie** côté manager (vue tableau) au lieu du form 1-par-1 si l'effectif devient gros.

---

## 2026-05-16 · Itération post-test D1/D2 — score admin only + notes match + socials libres

### Contexte

Suite des tests utilisateur sur D1/D2. Deux remarques métier remontées :
1. Les réseaux sociaux étaient figés sur Instagram + Facebook — le user veut pouvoir ajouter n'importe quel réseau (TikTok, YouTube, LinkedIn, X, etc.) avec un nombre de liens libre.
2. La saisie de score par le manager (héritage de D4) pose un problème de fond : c'est la ligue qui valide les scores officiels. Le manager doit pouvoir signaler un désaccord ou un contexte mais pas écraser le score.

### Décisions

- **Score = admin ligue uniquement.** Retrait du QuickScorePanel et du bouton "Saisir score" côté manager. L'admin saisit via "Modifier" (form complet déjà en place). Cohérent avec le rôle officiel de la ligue.
- **Notes de match** : nouveau modèle `MatchNote(matchId, authorId, body)` — fil de remarques par match accessible aux 2 clubs concernés + à l'admin. Permet de signaler désaccord, contexte, blessure, etc. Pas exposé en public.
- **Auteurs des notes** : managers des 2 clubs du match OU admin. Lecture : identique. Suppression : l'auteur ou un admin.
- **Réseaux sociaux libres** via champ `Club.socials: Json?` (tableau `{label, url}[]`). Repeater dans le form profil avec reorder ↑↓, max 12 liens. Détection d'icône par domaine sur la fiche publique (Insta, FB, TikTok, YT, LinkedIn, X, Threads, Twitch, Discord, WhatsApp, Strava) + fallback `◉`.

### Travaux réalisés

**Schéma Prisma** :
- Nouveau modèle `MatchNote` (matchId/authorId/body) avec cascade sur delete du match + index `[matchId, createdAt]`.
- Relation inverse `User.matchNotes` + `Match.notes`.
- Retrait `Club.instagram` + `Club.facebook` → ajout `Club.socials Json?`.
- `prisma generate` + `prisma db push --accept-data-loss` exécutés.

**Actions** :
- `lib/actions/matchNote.ts` (NOUVEAU) : `listMatchNotes`, `createMatchNote`, `deleteMatchNote`. Auth = admin OU manager d'un des 2 clubs du match (via `requireMatchAccess`).
- `lib/actions/competition.ts` : `listMatchesAdmin` inclut désormais `_count: { notes: true }` pour afficher le badge "Notes (N)" sur la fiche match.
- `lib/actions/club.ts` : `ClubProfileSchema` accepte `socials: ClubSocialLink[]` (max 12) au lieu des champs Insta/FB. `updateClubProfile` normalise + persiste en Json.
- `lib/clubSocials.ts` (NOUVEAU) : module utilitaire (non-server) qui exporte `SocialLinkSchema`, `ClubSocialLink`, `parseSocials`. Indispensable car `'use server'` interdit les exports de fonctions non-async — donc `parseSocials` (sync) ne peut pas vivre dans `lib/actions/club.ts`. Pattern à réutiliser si on rencontre d'autres helpers sync à partager côté server+client.

**UI MatchesAdmin** (`app/dashboard/matches/MatchesAdmin.tsx`) :
- `QuickScorePanel` supprimé.
- `MatchRow` : bouton "Saisir score" remplacé par bouton "Notes" avec badge count, visible pour admin OU manager d'un des 2 clubs concernés. Le bouton "Modifier" reste admin only (déjà en place).
- Nouveau composant `NotesPanel` : chargement asynchrone des notes via `listMatchNotes`, formulaire d'ajout (textarea 2000 chars + bouton Publier), liste avec badge auteur (Ligue gold / club navy), nom, date, bouton Suppr. visible pour l'auteur ou l'admin.
- State `notesMatchId` (un panel ouvert à la fois). Prop `currentUserId` ajoutée pour le check delete côté UI.
- Helper text mis à jour côté `app/dashboard/matches/page.tsx` pour le manager.

**UI profil club** (`app/dashboard/club/profile/ClubProfileForm.tsx`) :
- Card "04 · Réseaux" : repeater de paires (label + url) avec inputs côte à côte, boutons ↑/↓ pour réordonner, "Retirer" par ligne, "+ Ajouter un lien" en bas (désactivé à 12 max).
- Compteur visible dans le bouton "+ Ajouter" ("(12 max)" quand limite atteinte).
- Soumission : filtrage des lignes complètement vides avant `updateClubProfile`.

**UI fiche publique** (`components/lrh/sections/ClubProfile.tsx`) :
- Helpers `instagramHref` / `facebookHref` supprimés.
- Nouvelles helpers `socialGlyph(url)` (table de correspondance domaine → caractère mono : ◇ ◆ ♪ ▶ in 𝕏 @ ▤ ⌬ ☏ ⌇) et `prettyHost(url)` (URL → "host/path" sans https:// ni trailing slash).
- Liste itère sur `socials` au lieu de 2 cas Insta/FB hardcodés.

**Bug fix annexe** : conflit de nom `body` (state local du textarea) vs `body` (token typography) dans `NotesPanel` — renommé en `draft` pour éviter le shadow qui faisait planter le spread `...body` dans style.

### Vérification

`npx tsc --noEmit` : **0 erreur** hors `dashboard-hco/`. Build Next pas testé en navigateur dans cette itération (l'erreur "Server Actions must be async" qu'on a corrigée à l'extraction de `parseSocials` était l'erreur de build attendue).

### À redémarrer côté user

⚠️ **Schéma modifié → restart `npm run dev` obligatoire**. Les anciens `Club.instagram` / `Club.facebook` sont **supprimés** (data-loss assumé via `--accept-data-loss`). Si des clubs avaient des valeurs, elles sont perdues — à ressaisir via le repeater socials.

### À tester côté user

1. `/dashboard/matches` (compte manager) → le bouton "Saisir score" doit avoir disparu. Le bouton "Notes" apparaît sur les matchs où son club est concerné. Saisir une note, vérifier visibilité.
2. Idem côté admin : voir les notes laissées par les clubs, en ajouter une "Ligue".
3. `/dashboard/club/profile` → section Réseaux : ajouter 3+ liens (Insta, TikTok, autre custom), réordonner, retirer. Sauvegarder.
4. `/clubs/<slug>` → vérifier que la liste des réseaux apparaît dans "Contacts & réseaux" avec les bonnes icônes.

### À reprendre plus tard

- Liaison entre notes et statut match : si une note signale un désaccord post-FINISHED, peut-être bloquer le passage à un état "validé ligue" ? Pas urgent.
- Notification email/in-app quand une nouvelle note est laissée (KISS pour l'instant — l'admin doit ouvrir les matchs pour voir).
- Affichage public de l'effectif (cf. note D2).

---

## 2026-05-16 · Phase D1 (profil club éditable) + D2 (effectif)

### Contexte

Suite de D4. Le user a demandé d'enchaîner D1 + D2 dans la foulée. D1 = profil club éditable par le manager. D2 = CRUD Effectif (la route `/dashboard/team` était déjà câblée dans la sidebar mais retournait 404).

### Décisions

- **D1 — champs Club éditables par le manager** : email, phone, website, address, instagram, facebook, description, primaryColor, logo, foundedYear. Action séparée `updateClubProfile` (≠ `updateClub` admin) accessible au manager du club OU à un admin. Champs structurels (kind, slug, shortCode, parentClubs, name, city) restent admin only.
- **`primaryColor` validée en #RRGGBB** et utilisée comme accent visuel sur la fiche publique `/clubs/[slug]` (border-top du card identité, ligne d'accent des contacts, kicker code court). Fallback gold si non défini → l'apparence d'origine reste si pas configurée.
- **Logo via `ImageUploader` Cloudflare** (déjà câblé sur News/Bureau/Commissions). Remplace le ClubCrest auto-généré sur la fiche publique quand présent, sinon ClubCrest conservé.
- **D2 — Member étendu** : `kind: PLAYER|COACH|STAFF`, `category: U11|U14|U17|U19|SENIOR|VETERAN`, `position`, `jerseyNumber` (Int 0-999), `photo` (Cloudflare), `birthdate`. Le `license` reste unique global (validation P2002 → message clair).
- **Catégories Joueurs uniquement** : Coach/Staff utilisent par défaut SENIOR (le champ existe mais n'est pas exposé dans le form pour COACH/STAFF). Le tri liste : kind → category → jerseyNumber → lastName.
- **CRUD member** accessible au manager du club OU à un admin (même pattern auth que `updateClubProfile` / `setClubHomeVenue`).
- **Pas de sous-CRUD admin** des effectifs côté ligue dans cette itération — l'admin doit basculer sur un compte affilié à un club si besoin (ou le faire en SQL). C'est cohérent avec le scope multi-tenant.

### Travaux réalisés

**Schéma Prisma** (`prisma/schema.prisma`) :
- `Club` étendu : email, phone, website, address, instagram, facebook, description, primaryColor, logo, foundedYear (tous optionnels).
- `Member` étendu : kind, position, jerseyNumber, category, photo, birthdate + 2 enums (`MemberKind`, `MemberCategory`) + index composites `[clubId, kind]` et `[clubId, category]`.
- `prisma generate` + `prisma db push --accept-data-loss` exécutés.

**Actions** :
- `lib/actions/club.ts` étendu : `getClubProfile(clubId)`, `updateClubProfile(clubId, input)` avec `requireClubMemberOrAdmin` local + validation Zod (hex color, URL, year range). Normalisation : strings vidées → null, color normalisée en `#RRGGBB` majuscules.
- `lib/actions/member.ts` (NOUVEAU) : `listMembersForClub`, `createMember`, `updateMember`, `deleteMember`. Gestion P2002 sur `license`. Revalide `/clubs/[slug]` après chaque mutation via lookup du slug.

**Pages dashboard** :
- `/dashboard/club/profile` (NOUVEAU) : `page.tsx` server fetch + `ClubProfileForm.tsx` client. Form découpé en 5 cards (Identité read-only / Image / Contacts / Réseaux / Présentation). Bouton "Voir la fiche publique ↗" pour aperçu.
- `/dashboard/team` (NOUVEAU, lève le 404) : `page.tsx` + `TeamAdmin.tsx`. Liste groupée par kind (Joueurs sous-groupés par catégorie U11/U14/.../Sénior/Vétéran, Encadrement, Staff), MemberCard avec photo + initiales fallback navy/gold, form inline pour create/edit. State unique `editingId | creating` pour ouvrir un seul form à la fois.

**Sidebar dashboard** (`components/lrh/DashboardDesktop.tsx`) :
- Ajout `profile` en 2e position de clubItems (icône `IconIdCard` déjà présente).
- Cas spécial dans `href` : `profile` → `/dashboard/club/profile` (les autres clubItems suivent le pattern `/dashboard/${id}`).
- Titres header dashboard étendus : `profile` → "Profil du club", `team` → "Effectif du club".

**Affichage public** (`components/lrh/sections/ClubProfile.tsx` + `pages/ClubPageClient.tsx`) :
- `ClubProfile` accepte les nouveaux champs : description (avec `white-space: pre-line` pour respecter les sauts de ligne saisis), logo (remplace ClubCrest si présent), primaryColor (accent border-top + couleur du kicker shortCode + bordure gauche des contact-lines).
- Tag "Fondé en {year}" ajouté à la liste des chips (City / Fondé / Affilié LRH / Affilié FFH).
- Nouvelle sous-section "Contacts & réseaux" : grille 2 cols (1 col mobile) de `ContactLine` avec email mailto / phone tel / website / address / instagram / facebook. URLs Instagram/Facebook normalisées (@username ou domaine accepté).
- `ClubPageClient` et `app/clubs/[slug]/page.tsx` propagent les nouveaux champs. Logo aussi affiché dans le PageHero right slot si présent (sinon ClubCrest).

### Vérification

`npx tsc --noEmit` (filtré dashboard-hco) : **aucune erreur** dans notre code (les 102 lignes d'erreurs sont toutes dans `dashboard-hco/` non compilé).

### À redémarrer côté user

⚠️ **Schéma Prisma modifié → redémarrer `npm run dev` obligatoire** (cf. CLAUDE.md section "Modif du schéma Prisma — séquence obligatoire"). Sinon `Member.kind` / `Club.email` etc. n'existent pas côté runtime.

### À tester côté user

1. `/dashboard/club/profile` → remplir contacts + description + couleur primaire + logo, sauvegarder, vérifier remontée sur `/clubs/<slug>`.
2. `/dashboard/team` → ajouter un joueur U17 avec dossard, un coach, un membre staff. Vérifier le groupage et le tri.
3. Test cross-tenant : depuis un compte manager du club A, vérifier qu'on ne peut pas modifier les members du club B (l'URL `/dashboard/team` du compte A ne montre que son club).

### À reprendre plus tard

- Affichage public de l'effectif sur `/clubs/[slug]` (section "Effectif" listant joueurs par catégorie + staff). Pour l'instant `memberCount` est juste un total agrégé.
- Self-service change password côté manager (mentionné dans D4).
- Magic-link d'invitation pour onboarding manager (mentionné dans D4).
- Audit log des actions critiques (delete member, change password admin).

---

## 2026-05-15 · Phase D4 + clarification du rôle manager (lecture + score uniquement)

### Décisions de scope (après test D4 par le user)

- **Retrait des items inutiles dans la sidebar club** : "Licenciés", "Documents", "Partenaires", "Trésorerie" sortent. Pas dans le périmètre du produit.
- **Effectif conservé** dans la sidebar (id `team`) — sera utilisé pour la vue landing/publique. Page elle-même à construire ultérieurement (D2).
- **Matchs côté manager = lecture + saisie de score uniquement.** Décision tranchée : c'est la ligue qui programme le calendrier officiel (date, équipes, lieu, arbitres). Laisser un club créer/modifier librement risque doublons et conflits d'horaires. Le manager voit ses matchs et peut renseigner le score post-match + passer en LIVE/FINISHED. Reste admin only : création, suppression, équipes, date, lieu, arbitres.
- **Terrains : statu quo Phase A** confirmé. Ligue maintient le registre central, club assigne depuis `/dashboard/venues`. Si vide, la ligue impose à la création du match. C'est le bon modèle.

### Travaux D4 (gestion des comptes)

**Action** `lib/actions/user.ts` (NOUVEAU) :
- `listUsersAdmin()` — liste avec club affilié, _count {articles, sessions}
- `createUser({ email, name, password, role, clubId })` — argon2.hash, vérif email unique
- `updateUser` — protection self-demotion
- `resetUserPassword` — argon2.hash + `prisma.session.deleteMany` pour forcer reconnexion
- `deleteUser` — protection self-delete, blocage si articles publiés

**Page admin** `/dashboard/ligue/users` (admin only) :
- Form de création avec toggle ADMIN/USER, picker club visible uniquement pour les rôles USER
- Bouton "Générer" pour un mot de passe alphanumérique sécurisé de 12 caractères via `window.crypto.getRandomValues`
- Bandeau `PasswordRevealedBanner` qui s'affiche après création OU réinit : email + mot de passe en gold avec bouton Copier dans le presse-papier
- Group par rôle (Administrateurs LRH en gold, Managers de club en navy). Chip "Vous" sur la rangée du current user
- Actions Modifier / Réinit. MDP / Suppr. Le bouton Suppr. est masqué pour le current user

### Travaux nettoyage UI manager (à la suite du test)

**Sidebar dashboard** (`components/lrh/DashboardDesktop.tsx`) :
- `clubItems` réduit à : Tableau de bord, Actualités, Matchs, Classements, Effectif, Mes terrains.
- Imports d'icônes nettoyés (IconIdCard, IconFolder, IconWallet retirés — IconHandshake conservé pour ligue-clubs).

**MatchesAdmin** (`app/dashboard/matches/MatchesAdmin.tsx`) :
- `canCreate = isAdmin` désormais (suppression du `|| Boolean(clubId)`). Le bouton "+ Nouveau match" est masqué pour les non-admin.
- `MatchRow` : pour non-admin propriétaire d'un des deux clubs du match, le bouton "Modifier" disparaît, remplacé par "Saisir score" (background navy).
- Nouveau composant inline `QuickScorePanel` : ouvre une rangée éditoriale sous la fiche match avec deux inputs scores + select status (SCHEDULED/LIVE/HALFTIME/FINISHED/POSTPONED/CANCELLED). Appelle `updateMatch` directement avec uniquement `homeScore`, `awayScore`, `status` — pas de risque de modifier accidentellement date/lieu/équipes/arbitres.
- State `quickScoreId: string | null` au niveau de `MatchesAdmin` — un seul mini-form ouvert à la fois.

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : **aucune erreur**.

### À reprendre dans D1/D2/D3

- **D1** — étendre `Club` (email, phone, website, address, instagram, facebook, description, primaryColor) + page `/dashboard/club/profile` éditable par le manager + remontée publique sur `/clubs/[slug]`.
- **D2** — étendre `Member` (kind PLAYER/COACH/STAFF, position, jerseyNumber, category, photo, birthdate) + CRUD UI `/dashboard/team`. La route est déjà câblée dans la sidebar (id `team` → `/dashboard/team`) mais retourne 404 tant que la page n'est pas créée.
- **D3** — retiré du scope (Sponsors UI). Le modèle reste en DB pour les usages internes/sponsors club mais pas d'UI.
- Plus tard : magic-link d'invitation, self-service change password côté manager.

---

## 2026-05-15 · Phase D4 — Gestion des comptes (multi-tenant débloqué — entrée originale)

### Contexte

Le user a remarqué qu'il ne pouvait pas vraiment tester l'espace club (terrains, news) faute de pouvoir créer des comptes manager. Décision : avant la Phase C (PDF), intercaler une Phase D "Espace club autonome" en 4 sous-blocs. D4 (gestion des comptes) attaque en premier car bloquant pour tout le reste de la Phase D.

### Décisions

- **Onboarding manuel par l'admin** pour cet itération : l'admin LRH crée le compte avec email + nom + mot de passe initial (saisi ou auto-généré), et transmet les identifiants au manager. Pas de magic-link / d'email automatique (à faire plus tard, nécessite un service mail).
- **Mot de passe affiché une fois** après création dans un bandeau navy/gold avec bouton "Copier". Après ça, seule une réinit par l'admin permet de retrouver un mot de passe.
- **Réinit MDP invalide les sessions actives** : la suppression de tous les `Session` du user force une reconnexion partout.
- **Pas de self-modification dangereuse** : un admin ne peut pas se rétrograder lui-même ni supprimer son propre compte (sinon il se coupe l'accès).
- **Suppression bloquée si articles publiés** : `News.authorId` est non-nullable, donc l'admin doit transférer/supprimer les articles avant de supprimer le compte.

### Travaux réalisés

**Action** `lib/actions/user.ts` (NOUVEAU) :
- `listUsersAdmin()` — liste avec club affilié, _count {articles, sessions}
- `createUser({ email, name, password, role, clubId })` — argon2.hash, vérif email unique, vérif club existant si role=USER
- `updateUser(id, { email, name, role, clubId })` — protection self-demotion, vérif email unique sur autres comptes
- `resetUserPassword(id, newPassword)` — argon2.hash + `prisma.session.deleteMany`
- `deleteUser(id)` — protection self-delete, garde articles

**Page admin** `/dashboard/ligue/users` (admin only) :
- Form de création avec toggle ADMIN/USER. Le picker de club s'affiche uniquement pour les rôles USER (un admin LRH n'est pas affilié à un club).
- Bouton "Générer" pour un mot de passe alphanumérique sécurisé de 12 caractères (via `window.crypto.getRandomValues`, no-ambigu).
- Bandeau `PasswordRevealedBanner` qui s'affiche après création OU réinit : email + mot de passe en gold avec bouton Copier dans le presse-papier.
- Group par rôle (Administrateurs LRH en gold, Managers de club en navy). Chip "Vous" sur la rangée du current user.
- Actions Modifier / Réinit. MDP / Suppr. Le bouton Suppr. est masqué pour le current user.

**Sidebar dashboard** : ajout "Comptes" (`ligue-users`, icône Users) en 2e position de Administration ligue, juste après "Clubs & ententes". Titre header ajouté pour cet activeTab.

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : **aucune erreur**.

### À reprendre dans D1/D2/D3

- **D1** — étendre `Club` (email, phone, website, address, instagram, facebook, description, primaryColor) + page `/dashboard/club/profile` éditable par le manager + remontée publique sur `/clubs/[slug]`.
- **D2** — étendre `Member` (kind PLAYER/COACH/STAFF, position, jerseyNumber, category U19/Sénior etc., photo, birthdate) + CRUD UI `/dashboard/team`.
- **D3** — CRUD UI Sponsors (`/dashboard/sponsors`, modèle déjà présent).
- Plus tard : magic-link d'invitation, self-service change password côté manager, audit log des actions admin.

### À tester côté user

1. `/dashboard/ligue/users` → créer un compte manager pour un club (laisser le toggle "Manager de club", choisir le club, générer un mdp)
2. Copier le mdp affiché, se déconnecter, se reconnecter avec les nouveaux identifiants
3. Vérifier qu'en tant que manager, on accède bien à /dashboard sans voir les sections "Administration ligue"
4. Tester "Réinit. MDP" depuis le compte admin → vérifier que l'ancienne session du manager est bien invalidée

---

## 2026-05-15 · Phase B — Ententes, CompetitionEntry, CRUD Clubs

### Contexte

Continuité du chantier. La Phase A a livré venues+arbitres mais le user a noté qu'on ne pouvait pas vraiment tester côté club car il n'existait pas d'UI pour créer des Clubs (multi-tenant). Phase B résout ça avec un CRUD Clubs et ajoute deux concepts métier essentiels :
- **Ententes** : un Club spécial qui regroupe 2+ clubs membres et joue comme une équipe unique en compétition.
- **CompetitionEntry** : déclaration explicite des clubs inscrits à une compétition. Borne les choix au create-match et permet d'initialiser les standings dès l'inscription.

### Décisions

- **Ententes via `Club.kind = ENTENTE` + self-relation M:N** plutôt qu'un modèle `Team` séparé. Une entente reste un `Club` du point de vue de `Match`/`Standing`/`Sponsor` — pas de refactor lourd. Trade-off accepté : l'entente partage le namespace slug/shortCode des clubs (cohérent avec la réalité fédérale).
- **Pas d'entente d'entente** : `parentClubs` ne peut contenir que des Clubs STANDALONE. Validation côté `createClub`/`updateClub`.
- **CompetitionEntry idempotent** : la création utilise le code P2002 (unique violation) en no-op si déjà inscrit. À l'inscription, un `Standing` est auto-créé à 0 partout — le classement existe dès le départ.
- **Désinscription bloquée** si le club a déjà joué un match dans la compétition (sécurité).
- **Filtre permissif** au create-match : si la compétition n'a aucune inscription déclarée, tous les clubs sont éligibles (rétrocompat avec les compétitions créées avant Phase B). Dès qu'au moins une inscription existe, le filtre est strict.

### Travaux réalisés

**Schéma Prisma** :
- `Club.kind: ClubKind { STANDALONE, ENTENTE }` (default STANDALONE)
- `Club.parentClubs: Club[] @relation("ClubEntenteMembers")` (self M:N) + `Club.ententes` (inverse)
- Nouveau model `CompetitionEntry(competitionId, clubId, registeredAt)` avec `@@unique([competitionId, clubId])` et cascade sur delete
- `Competition.entries: CompetitionEntry[]` (inverse)
- `prisma generate` + `prisma db push --accept-data-loss` exécutés.

**Actions** :
- `lib/actions/club.ts` (NOUVEAU) : `listClubsAdmin`, `createClub`, `updateClub`, `deleteClub` admin only. Validations : entente ≥ 2 membres, pas d'entente d'entente, pas de self-membership, deleteClub bloqué si users/members/matches/standings.
- `lib/actions/competition.ts` étendue :
  - `listCompetitionEntries(competitionId)`, `listAllCompetitionEntries()` retournant `Record<competitionId, clubId[]>` pour le form match
  - `addCompetitionEntry(competitionId, clubId)` idempotent + auto-init Standing
  - `removeCompetitionEntry` avec garde matches
  - `createMatch` valide que les deux clubs sont inscrits (si la compet a des inscriptions)
  - `listCompetitionsAdmin._count` inclut désormais `entries`

**Pages admin** :
- `/dashboard/ligue/clubs` (NOUVEAU) : CRUD clubs + ententes. Toggle STANDALONE/ENTENTE, picker multi-select des clubs membres pour les ententes (uniquement les STANDALONE éligibles, self exclus). Groupage de la liste par type (clubs vs ententes) avec accent navy/gold.
- `/dashboard/ligue/competitions` étendue : nouveau bouton "Inscrits" sur chaque ligne, qui ouvre un panel expandable avec 2 colonnes (engagés / disponibles) et boutons +Inscrire / Retirer.

**Form match** (`MatchesAdmin.tsx`) :
- Accepte `entriesByCompetition: Record<string, string[]>`
- Sélecteurs home/away filtrés sur `eligibleClubs` (= inscrits si la compet a des inscriptions, sinon tous)
- Si la compétition sélectionnée n'a aucune inscription, affichage d'un message d'avertissement gold suggérant d'aller déclarer les inscriptions

**Sidebar dashboard** : ajout "Clubs & ententes" (`ligue-clubs`, icône Handshake) en tête de la section Administration ligue. Titre header dashboard étendu pour cet activeTab.

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : **aucune erreur**.

### À redémarrer côté user

Schéma modifié → **redémarrer le dev server obligatoire** (`Ctrl+C` puis `npm run dev`). Sinon `prisma.competitionEntry` n'existe pas côté runtime et `Club.parentClubs` n'est pas exposé.

### À reprendre plus tard

- Tester en navigateur : créer 3 clubs standalone, créer 1 entente regroupant 2 d'entre eux, créer une compétition, inscrire 2 clubs + 1 entente, créer un match en vérifiant que seuls les inscrits apparaissent dans les selects.
- Affichage public des ententes sur `/clubs/[slug]` : `ClubProfile` pourrait afficher la liste des clubs membres pour une entente (et inversement, sur la fiche d'un club standalone, lister les ententes auxquelles il appartient). Pas urgent — la page accepte déjà n'importe quel Club.
- Affichage côté `/competitions/[slug]` de la liste des inscrits avant que les matchs ne soient programmés.
- **Phase C** : PDF du calendrier avec `@react-pdf/renderer`, route `/api/calendar/pdf?mode=...&competition=...`, intégrant venue + arbitres + ententes.

---

## 2026-05-15 · Phase A — Terrains (Venue) + Arbitres

### Contexte

Démarrage du chantier "venues + arbitres + ententes + PDF calendrier". Phase A = bases de données structurées pour les matchs : un registre central des terrains (créé par la ligue uniquement, décision user), des arbitres avec rôles (2 principaux max + 1 délégué optionnel, format FFH), et l'intégration dans le form de création de match.

### Décisions

- **Venue** : créé exclusivement par les admins ligue (`/dashboard/ligue/venues`). Les clubs sélectionnent leurs terrains domicile parmi le registre depuis `/dashboard/venues`. Si un club n'a pas de terrain, la ligue affecte un terrain à la création du match.
- **Surfaces** : champ booléen par mode (`supportsGazon`, `supportsSalle`) — un terrain peut être les deux (complexe sportif avec gazon extérieur + gymnase).
- **Arbitres** : `Referee` + jointure `MatchReferee` avec rôle `PRINCIPAL | DELEGUE`. Validation Zod : max 2 PRINCIPAL et 1 DELEGUE par match. Validation côté UI : doublons interdits, options déjà choisies désactivées.
- **`Match.venue: String?` conservé** en parallèle de `Match.venueId` — pas de migration destructive, les anciens matchs gardent leur venue texte affiché en fallback.
- **Auto-suggestion** du venue à la création de match : home venue du club domicile selon le mode de la compétition, surchargeable.

### Travaux réalisés

**Schéma Prisma** :
- `Venue(name, city, address, supportsGazon, supportsSalle, notes)` + relations `gazonHomeFor` / `salleHomeFor` vers Club.
- `Club.homeVenueGazonId` / `homeVenueSalleId` optionnels.
- `Match.venueId` (FK Venue) en plus de `venue: String?` (legacy).
- `Referee(fullName, license, email, phone, notes)` + jointure `MatchReferee(matchId, refereeId, role)` avec cascade.
- Enum `RefereeRole { PRINCIPAL, DELEGUE }`.
- `prisma generate` + `prisma db push --accept-data-loss` exécutés (pas de perte réelle, seulement ajouts).

**Queries** :
- `lib/queries/venue.ts` : `getAllVenues`, `getVenuesForMode(mode)`, `getClubVenuePreferences(clubId)`.
- `lib/queries/referee.ts` : `getAllReferees`, `getMatchReferees(matchId)`.

**Actions** :
- `lib/actions/venue.ts` : CRUD admin venues + `setClubHomeVenue(clubId, { mode, venueId })` (admin OU membre du club). Validation que le venue supporte bien la surface demandée.
- `lib/actions/referee.ts` : CRUD admin referees (admin only).
- `lib/actions/competition.ts` étendu : `MatchCreateSchema` et `MatchUpdateSchema` acceptent `venueId` et `referees[]` avec refine sur les limites de rôles. `updateMatch` remplace l'intégralité des arbitres si la prop est fournie (admin only). `listMatchesAdmin` inclut désormais `venueRef` et `referees`. `listClubsForAdmin` retourne `homeVenueGazonId` / `homeVenueSalleId`.

**Pages admin** :
- `/dashboard/ligue/venues` — registre central. Group par ville, badges Gazon/Salle. CRUD complet avec validation surfaces.
- `/dashboard/ligue/arbitres` — registre arbitres avec licence/email/téléphone. CRUD complet.
- `/dashboard/venues` — espace club. 2 cards (Gazon, Salle) avec select dans la liste des venues de la surface correspondante.

**Sidebar dashboard** (`components/lrh/DashboardDesktop.tsx`) :
- Ajout "Mes terrains" (`venues`, icône Pin) dans clubItems.
- Ajout "Terrains" (`ligue-venues`) et "Arbitres" (`ligue-arbitres`, icône Whistle) dans ligueItems.
- Titres header dashboard étendus pour les nouveaux activeTabs.
- 2 nouvelles icônes inline dans `components/lrh/Icons.tsx` (IconPin, IconWhistle).

**Form de création de match** (`MatchesAdmin.tsx`) :
- Champ texte `venue` remplacé par select `venueId` filtré par mode de la compétition sélectionnée.
- Pré-remplissage auto du venue avec le home venue du club domicile (suggestion réinjectable d'un clic si l'admin a fait autre chose).
- Section "Arbitres" (admin only) : liste éditable avec rôle, boutons "+ Arbitre principal" et "+ Délégué" désactivés à 2/1, doublons interdits.
- Fiche match (MatchRow) affiche venue + chips arbitres dans la zone meta.

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : **aucune erreur**.

### À redémarrer côté user

Modification du schéma Prisma → **redémarrer le dev server obligatoire** (cf. CLAUDE.md). Sinon `prisma.venue` / `prisma.referee` / `prisma.matchReferee` n'existeront pas côté runtime.

### À reprendre plus tard

- Tester en navigateur le flow complet : créer un venue + arbitre côté ligue, sélectionner les terrains côté club, créer un match qui hérite du terrain auto + assigne 2 arbitres + 1 délégué.
- **Phase B** suivante : Ententes (`Club.kind: STANDALONE | ENTENTE` + `ClubMembership`) et `CompetitionEntry` pour déclarer qui participe.
- Affichage venue + arbitres côté public : la fiche match `/competitions/[slug]` pourrait afficher l'arbitre principal et le terrain, à voir avec le PDF.

---

## 2026-05-15 · CRUD complet des matchs + choix de compétition

### Contexte

Le user a signalé qu'on ne pouvait pas supprimer les anciennes compétitions, ni créer/supprimer/modifier en profondeur les matchs, ni choisir la compétition lors de la création d'un match. Investigation : les actions backend (`createMatch`, `updateMatch`, `deleteMatch`, `createCompetition`, `updateCompetition`, `deleteCompetition`) existaient déjà dans `lib/actions/competition.ts`, mais :
- L'UI `/dashboard/matches` (ancien `MatchList.tsx`) ne permettait que d'éditer score + status d'un match existant. Pas de création, pas de suppression, pas de sélection de compétition.
- La suppression de compétition est volontairement bloquée si des matchs lui sont rattachés (sécurité). Comme l'UI ne permettait pas de supprimer les matchs, la compétition restait verrouillée par effet de chaîne.

### Travaux réalisés

**Backend** (`lib/actions/competition.ts`) :
- `MatchUpdateSchema` étendu : accepte désormais `homeClubId`, `awayClubId`, `matchday` en plus de score/status/venue/kickoffAt. Refine pour empêcher home === away.
- `updateMatch` :
  - Seuls les admins peuvent changer les équipes d'un match.
  - Recalcule les standings dans plus de cas : passage à FINISHED, sortie de FINISHED, ou édition des scores/équipes d'un match déjà FINISHED.
  - Appelle `revalidateMatch()` (qui inclut `/competitions`, `/classements`, etc.) au lieu de juste `/dashboard` et `/`.

**Nouveau composant** `app/dashboard/matches/MatchesAdmin.tsx` (~570 lignes) :
- Form de création/édition complet : compétition (select), home club, away club, kickoff datetime-local, lieu, journée, statut, scores. Aperçu live des badges mode/catégorie.
- La compétition est verrouillée en édition (cohérence des standings) — le user doit supprimer+recréer pour changer de compétition.
- Liste groupée par compétition + saison, avec `ModeBadge` / `CategoryBadge` / `StatusBadge` éditorial LRH.
- Boutons Modifier / Suppr. par ligne. Suppression uniquement pour les admins. Édition ouverte aux admins ou aux managers du club concerné (`canEdit`).
- Si aucune compétition n'existe, affichage d'un message guidant vers `/dashboard/ligue/competitions`.

**Page server** `app/dashboard/matches/page.tsx` :
- Réécrite pour fetch en parallèle `listMatchesAdmin`, `listCompetitionsAdmin`, `listClubsForAdmin`.
- Passe tout au nouveau `MatchesAdmin`.
- Pour les non-admins, filtre les matchs sur leur club uniquement.
- Sous-texte indique au manager non-admin que seuls les admins peuvent créer/supprimer.

**Suppression** `app/dashboard/matches/MatchList.tsx` (orphelin après remplacement).

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : **aucune erreur**.

### À reprendre plus tard

- Tester en navigateur : flow admin (créer compet → créer match → supprimer match → supprimer compet vide) + flow manager non-admin (édition de score uniquement).
- L'édition d'un match déjà FINISHED rejoue `updateStandings` — vérifier que les classements restent cohérents quand on corrige a posteriori un score.
- Possibilité future : changement de compétition d'un match avec recalcul des deux standings (rare, complexe — pas demandé).

---

## 2026-05-15 · Refonte /clubs/[slug] avec charte éditoriale LRH

### Contexte

La page club individuelle utilisait l'ancien style (cards arrondies, pas de modules réutilisables, pas de mobile/mode toggle). Le contenu était là (classements, matchs, news, sponsors) mais en dehors de la charte éditoriale LRH. Le journal listait cette page comme « à enrichir avec prochains matchs + classement » depuis deux sessions.

### Décisions

- **Réutiliser les modules existants** plutôt que créer du sur-mesure : `PageHero`, `StatsRibbon`, `CalendarBoard`, `StandingsBoard`, `NewsDesktop/Mobile`, `HeaderDesktop/Mobile`, `FooterDesktop/MobileTabBar`. Un seul nouveau module section nécessaire : `ClubProfile`.
- **Mode toggle GAZON/SALLE** comme sur les autres pages publiques. Le club peut être engagé dans plusieurs compétitions par mode — toutes affichées.
- **Highlight de la rangée du club** dans le `StandingsBoard` plutôt qu'un tableau dédié. Ajout d'une prop `highlightClubId?: string` rétro-compatible.
- **Données par mode** côté query : `getClubPageDataByMode(slug)` retourne `{ club, matchesByMode, standingsByMode, news, memberCount }` avec des shapes directement compatibles `AllModeMatch[]` / `CompetitionWithStandings[]`.

### Travaux réalisés

**Query** (`lib/queries/club.ts`) :
- Nouvelle fonction `getClubPageDataByMode(slug)` qui fetch en parallèle matchs+standings pour les deux modes via `Promise.all`.
- `getMatchesForClubInMode` retourne les matchs au format `clubMatchSelect` aligné sur `AllModeMatch`.
- `getStandingsContextForClubInMode` filtre les compétitions où le club est référencé via un Standing.
- Suppression de l'ancien `getClubPageData` (orphelin).

**Modules** :
- `components/lrh/sections/ClubProfile.tsx` — section présentation : narrative côté gauche, card navy (crest + stats) côté droit, strip sponsors avec accent gold en bas.
- `components/lrh/sections/StandingsBoard.tsx` — prop `highlightClubId?` qui surligne la rangée correspondante (background navy 6% + inset shadow navy).
- Ajout export `ClubProfile` au barrel `components/lrh/sections/index.ts`.

**Page client** (`components/lrh/pages/ClubPageClient.tsx`) :
- Wrapper assembly : Header → back-link → PageHero (avec crest dans rightSlot à côté du toggle) → StatsRibbon → AnchorRail → ClubProfile → Calendar → Standings (un bloc par compétition avec badge rang/total) → News → Footer.
- `computeClubStats` agrège matchs joués, victoires, diff buts, meilleur classement.
- `CompetitionStandingsBlock` affiche le contexte (saison + nom compétition + badge "rang/total · pts") avant chaque tableau.

**Page server** (`app/clubs/[slug]/page.tsx`) :
- Réécriture complète : server fetch via `getClubPageDataByMode` puis passe le payload à `ClubPageClient`.
- `generateStaticParams` et `revalidate = 60` conservés.

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : **aucune erreur**.

⚠️ Pas testé en navigateur — à valider sur `/clubs/<slug>` (vérifier les deux modes, mobile et desktop, club avec/sans standings).

### À reprendre plus tard

- Tester visuellement les états vides (club non engagé dans un mode donné).
- Page `/clubs` (liste) à dynamiser dans le même esprit éditorial.
- Si on ajoute `Club.foundedAt` ou `Club.description` plus tard, `ClubProfile` les prend déjà en compte via les props optionnelles `founded` / `description`.

---

## 2026-05-14 · Upload Cloudflare Images + mailto/tel cliquables

### Contexte

Tous les champs image (`News.coverImage`, `BureauMember.photo`, `CommissionMember.photo`) reposaient sur la saisie manuelle d'URL. Besoin d'un module unifié avec drag&drop, file picker et URL paste, branché sur Cloudflare Images. Par ailleurs, les emails/téléphones du bureau étaient affichés en texte brut sur `/ligue` — à rendre cliquables.

### Travaux réalisés

**API route** `app/api/upload/cloudflare/route.ts` :
- POST authentifié (`auth()` requis).
- Appelle `POST /accounts/{id}/images/v2/direct_upload` Cloudflare avec token Bearer.
- Renvoie `{ uploadURL, imageId, deliveryURL }`.
- Tague chaque image avec metadata `{ uploadedBy: userId }` pour traçabilité Cloudflare.
- Renvoie 503 propre si env vars manquantes — pas de crash.

**Module** `components/lrh/upload/ImageUploader.tsx` :
- Drag&drop sur zone éditoriale charte LRH (pattern diagonal, hover gold).
- File picker natif sur clic.
- Champ "ou URL" avec validation `http(s)://` + bouton "Utiliser".
- Preview de l'image courante (120×100) + boutons Remplacer / Retirer.
- States idle / uploading (spinner avec keyframe inline) / error.
- Validation client : taille max (default 10 Mo), type `image/*`.
- Fallback gracieux si Cloudflare non configuré — l'admin peut toujours coller une URL.
- Prop `variant` pour utiliser des variants Cloudflare custom (default `public`).
- Prop `height` pour ajuster la zone selon le contexte (avatar 140 vs cover article 200).

**Wiring** :
- `app/dashboard/ligue/bureau/BureauAdmin.tsx` — `<ImageUploader>` remplace le champ texte URL.
- `app/dashboard/ligue/commissions/CommissionsAdmin.tsx` — idem, `height=140` car avatar membre.
- `app/dashboard/news/new/NewsForm.tsx` — `<Controller>` react-hook-form wrap, `height=200`.

**Liens mailto / tel** dans `components/lrh/sections/BureauBoard.tsx` :
- `<a href="mailto:...">` et `<a href="tel:...">` (avec strip des espaces dans le numéro).
- Icône ✉ / ☎ en rouge LRH, texte navy bold, hover background subtil.
- Padding négatif compensé pour conserver la grille mono d'origine.

**Documentation** :
- `CLAUDE.md` — nouvelle section "Upload d'images — Cloudflare Images" : module, API, env vars, CSP, variants.
- Mémoire `image_storage_choice.md` mise à jour : status "implementation done", liste des champs câblés.

### Variables d'environnement à ajouter

Le user doit éditer son `.env` avec :
```
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_IMAGES_TOKEN=...
CLOUDFLARE_IMAGES_ACCOUNT_HASH=...
```

Sans ces variables, l'upload échoue avec un message clair et l'admin peut toujours coller une URL manuelle. L'app reste utilisable.

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : aucune erreur.

### À reprendre plus tard

- Cas avancé : suppression côté Cloudflare quand l'admin retire/remplace une image (pour ne pas garder des images orphelines). Pour l'instant on laisse — Cloudflare facture 5$/mois flat pour 100k images stockées, donc pas urgent.
- Variants spécifiques (thumbnail, cover hero, avatar) à configurer dans le dashboard Cloudflare quand on aura un cas d'usage concret.
- Migration des emails/phones cliquables à appliquer aussi sur les éventuelles pages clubs ou commissions s'ils finissent par afficher des contacts.

---

## 2026-05-14 · Page institutionnelle /ligue + admin dashboard

### Contexte

Suite de la dynamisation du site. Décision stratégique : la nav contenait "Équipes de la Réunion" (lien vide) et "La Ligue" (lien vide). On retire "Équipes de la Réunion" — pas de données réelles côté sélection régionale. On construit `/ligue` (bureau + commissions) entièrement administrable depuis le dashboard.

### Décisions

- **2 modèles séparés** plutôt qu'un modèle `LigueMember` unifié — bureau et commissions ont des cycles de vie distincts, deux CRUD admin indépendants.
- **Photo** = champ `String?` URL pour l'instant. Pas d'upload Cloudflare branché — l'admin colle l'URL. Avatar fallback éditorial (initiales gold sur navy + stripe).
- **Une seule page /ligue** avec ancres (présentation, bureau, commissions) + barre d'ancres sticky. SEO concentré, parcours fluide.
- **Admin = ADMIN seulement** dans la sidebar dashboard, conditionnel sur `user.role === 'ADMIN'`.

### Travaux réalisés

**Schéma Prisma** (`prisma/schema.prisma`) :
- `BureauMember` (fullName, role, order, photo, email, phone, bio, startedAt)
- `Commission` (slug unique, name, description, mission, order, relation 1-N members cascade)
- `CommissionMember` (fullName, role, order, photo, email, commissionId)
- `prisma db push --accept-data-loss` exécuté sur Neon.

**Queries** (`lib/queries/ligue.ts`) :
- `getBureau()`, `getCommissions()` (avec membres triés), `getCommissionBySlug(slug)`.
- Types exportés : `BureauMemberRow`, `CommissionRow`, `CommissionMemberRow`.

**Actions admin** (`lib/actions/ligue.ts`) :
- CRUD complet `BureauMember`, `Commission`, `CommissionMember`.
- `requireAdmin()` (vérif role=ADMIN, sinon throw) + `revalidatePath('/ligue', '/dashboard/ligue/...')` sur chaque mutation.
- Slug auto-généré à partir du nom si vide (slugify simple sans deps).

**Sections publiques** (3 nouveaux modules, charte LRH éditoriale) :
- `LiguePresentation` — narrative côté gauche + grille 2×2 stats côté droit (clubs, licenciés, compétitions, disciplines).
- `BureauBoard` — président en card mise en avant (gold border + bio), autres membres en grille 2 colonnes, accent navy.
- `CommissionsBoard` — accordéon de commissions, première commission ouverte par défaut, mission + composition des membres.

**Page publique** :
- `app/ligue/page.tsx` (server) + `components/lrh/pages/LiguePageClient.tsx` (client wrapper avec mode toggle + ancre rail sticky).

**Pages admin** :
- `app/dashboard/ligue/bureau/page.tsx` + `BureauAdmin.tsx` (CRUD inline avec formulaire complet).
- `app/dashboard/ligue/commissions/page.tsx` + `CommissionsAdmin.tsx` (CRUD commissions + sous-CRUD membres dans panel expandable).
- Vérification `user.role === 'ADMIN'` côté server (redirect login si non-auth, message "Accès restreint" si non-admin).

**Sidebar dashboard** (`components/lrh/DashboardDesktop.tsx`) :
- Ajout prop `isAdmin: boolean`.
- Nouvelle section "Administration ligue" (label gold) avec items "Bureau exécutif" / "Commissions" — visible uniquement si `isAdmin`.
- Style actif des items ligue : background gold + foreground navy (différencié des items club qui sont rouge/blanc).
- Titres dashboard étendus : `ligue-bureau`, `ligue-commissions`.

**Nav header** (`components/lrh/sections/Header.tsx`) :
- Retrait de "Équipes de la Réunion".
- "La Ligue" → `href="/ligue"`.

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : **aucune erreur**. Bonus : correction du bug pré-existant `app/dashboard/standings/page.tsx:48` (import `body` manquant) en passant.

### Mémoire écrite

- `memory/project_modele_ligue.md` (modélisation institutionnelle + CRUD admin)

### À reprendre plus tard

- Branchement Cloudflare Images pour upload photos bureau/commissions (champ URL en place, manque le widget upload).
- Page `/clubs/[slug]` à enrichir (prochains matchs + classement du club).
- Page `/clubs` à dynamiser comme on l'a fait pour competitions/classements.
- Section "Arbitrage" du header (lien actuellement vide) — à connecter à une future page.
- Footer : items hardcodés ("Bureau, Commissions, Arbitrage, Documents officiels", "Région Réunion, Crédit Peï…") à rendre administrables aussi, ou à câbler.

---

## 2026-05-14 · Modularisation Home + pages /competitions et /classements

### Contexte

Suite de la dynamisation de la landing page. La home (`HomeDesktop.tsx` 679 lignes, `HomeMobile.tsx` 341 lignes) était monolithique. Besoin d'étendre aux pages calendrier et classement avec un design éditorial cohérent.

### Travaux réalisés

**1. Refactor modules** — `components/lrh/sections/` créé. 7 modules partagés desktop+mobile :
- `SectionHeading.tsx` (titres de section avec kicker numéroté)
- `Header.tsx` (top bar + nav, SeasonToggle)
- `Hero.tsx` (hero accueil + MatchChocGlass)
- `Bento.tsx` (LastResultCard, StandingsTopCard, PlayerOfMonthCard)
- `Competitions.tsx` (UpcomingMatchCard, chips)
- `News.tsx` (NewsCard variantes desktop/mobile)
- `Footer.tsx` (FooterDesktop, MobileTabBar)
- `index.ts` (barrel)

Résultat : `HomeDesktop.tsx` et `HomeMobile.tsx` passent de 679 + 341 lignes à 32 + 32 lignes, purement assembly.

**2. Pages publiques /competitions et /classements** — nouvelles routes + nouveaux modules :
- `components/lrh/sections/PageHero.tsx` — bandeau navy avec stripe pattern + spotlight gold + kicker numéroté + tag.
- `components/lrh/sections/StatsRibbon.tsx` — 4 cellules de stats clés (kicker mono + value display).
- `components/lrh/sections/CompetitionFilter.tsx` — chips sticky horizontalement scrollables.
- `components/lrh/sections/CalendarBoard.tsx` — timeline matchs groupés mois/jour, MatchRichCard variantes past/live/upcoming.
- `components/lrh/sections/Podium.tsx` — top 3 asymétrique 2-1-3, gold spotlight, badge "LEADER".
- `components/lrh/sections/StandingsBoard.tsx` — tableau éditorial complet avec forme V/N/D, zones qualif (vert) / relégation (rouge), pills points navy/gold.

**3. Pages assemblées :**
- `app/competitions/page.tsx` (server) + `components/lrh/pages/CompetitionsPageClient.tsx` (client state).
- `app/classements/page.tsx` (server) + `components/lrh/pages/ClassementsPageClient.tsx` (client state).

**4. Queries étendues** — `lib/queries/competition.ts` :
- `getAllMatchesForMode(mode)` (avec goals).
- `getCompetitionsForMode(mode)` (liste pour filter chips).
- `getCompetitionsWithStandings(mode)` (compétitions + standings imbriqués).
- Types exportés : `AllModeMatch`, `CompetitionForMode`, `CompetitionWithStandings`.

### Décisions / conventions arrêtées

- **Pattern responsive** : chaque section accepte `mobileVariant: boolean` plutôt que d'avoir deux fichiers séparés. Variante visuelle gérée à l'intérieur du composant.
- **Mode toggle dual** : `'gazon' | 'salle'` côté UI client, `'GAZON' | 'SALLE'` côté Prisma. Conversion aux frontières.
- **PageHero** réutilisable pour toutes futures pages internes (kicker numéroté + display title + tag + right slot mode toggle).
- **Style éditorial** confirmé comme ligne de conduite pour toutes les pages futures — pas de Tailwind générique sur les composants publics LRH. Détaillé dans `CLAUDE.md` section "Charte graphique".

### Vérification

`npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` : aucune erreur introduite par ces changements. Une erreur pré-existante subsiste (`app/dashboard/standings/page.tsx` ligne 48 — `body` non importé, hors scope de cette session).

### Mémoire écrite

- `memory/feedback_design_editorial.md` (style à appliquer à toutes les pages)
- `memory/feedback_modules_reutilisables.md` (granularité ~80-200 lignes)
- `memory/project_lrh_site.md` (contexte ligue ≠ club)
- `memory/reference_dashboard_hco.md` (statut du dossier référence)

### À reprendre plus tard

- Page `/clubs/[slug]` à enrichir avec prochains matchs + classement de l'équipe (utilise les modules en place).
- Page club doit aussi exposer la composition (Members) si pertinent côté ligue.
- Bug pré-existant `app/dashboard/standings/page.tsx:48` à corriger (import `body` manquant).
- Le `dashboard-hco/` finira sans doute par être supprimé une fois la migration finie — pas urgent.

---

## 2026-05-13 · Choix Cloudflare Images pour News.coverImage

User a choisi Cloudflare Images (vs Cloudinary) pour le stockage des images d'articles. Voir `memory/image_storage_choice.md`. Le champ `News.coverImage` est un `String?` URL, pas encore branché — l'implémentation effective de l'upload reste à faire.
