# Journal de session

Trace des décisions et travaux effectués au fil des sessions. Ajouter les entrées en haut (ordre anti-chronologique).

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
