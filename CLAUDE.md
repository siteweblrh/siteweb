@AGENTS.md

# Site Ligue Réunionnaise de Hockey — guide projet

## C'est une LIGUE, pas un club

Le projet `siteweb/` est le site officiel de la **Ligue Réunionnaise de Hockey (LRH)**. Pas le site d'un club. Conséquence : pas d'équipe favorite, pas de notion `isMyClub` dans l'UI. Si tu vois cette logique côté HCO (dans `dashboard-hco/`), ne la copie pas — la ligue traite toutes les équipes à égalité.

## Stack

- Next.js 16 (App Router) — **breaking changes vs ta connaissance d'entraînement**, lire `node_modules/next/dist/docs/` avant d'écrire.
- React 19, TypeScript strict.
- Prisma 5 + Neon Postgres. Schéma dans `prisma/schema.prisma`.
- NextAuth pour l'auth dashboard.
- TipTap pour l'éditeur d'articles.
- Tailwind v4 — **uniquement** dans `app/dashboard/*` et `app/globals.css`. Les composants publics LRH (`components/lrh/`) sont en **inline styles** avec les tokens.

## Charte graphique — ligne de conduite pour TOUTE nouvelle page publique

### Tokens (source : `components/lrh/tokens.tsx`)

- Couleurs : `LRH.navy (#002244)` · `LRH.gold (#F3BC1C)` · `LRH.red (#A8202F)` · `LRH.paper (#F8F9FA)` · `LRH.paperWarm` · `LRH.ink/ink2/mute`.
- Polices : `mono` (JetBrains Mono — kickers, tags, timecodes, microcopy), `display` (Poppins — titres, gros chiffres), `body` (Montserrat — texte courant).
- Patterns visuels : `repeating-linear-gradient` diagonal (~112°, 2-3% blanc) sur bandeaux navy ; `heroPlaceholderStyle({ tone })` pour hero gazon/salle.

### Signature visuelle

- **Kickers numérotés** : `01 · CALENDRIER OFFICIEL`, mono uppercase, letter-spacing 0.18-0.22em, couleur red ou gold.
- **Titres display** énormes (42-88px), `font-weight: 800`, `letter-spacing: -0.03em à -0.05em`, `line-height: 0.9-0.95`. Multi-ligne via `\n` + `white-space: pre-line`.
- **Bandeaux navy** : border-bottom 4px gold, spotlight radial gold en arrière-plan, stripe pattern diagonal.
- **Cards** : corners 0-4px (PAS 16-24px partout), accent vertical 3-4px sur le côté gauche (couleur dérivée de l'état), pas de shadow-md générique.
- **Pills numériques** : navy bg + #fff fg pour valeurs neutres ; gold bg + navy fg pour leader/winner.
- **Indicateurs colorés** : V (vert #1d6b3f) / N (gris LRH.mute) / D (rouge LRH.red), 22×22 carrés avec lettre display centrée.
- **Zones qualif/relégation** : strip vertical 4px à gauche des rangées (vert / rouge).
- **Dividers** : `border: 1px dashed LRH.hairStrong` pour les séparateurs "section" ; `1px solid LRH.hair` pour les séparateurs "row".

### À ÉVITER

- `rounded-xl shadow-md bg-slate-50` et autres patterns Tailwind "starter". On veut éditorial, pas SaaS générique.
- Lucide icons en décoration libre. OK pour fonctionnalités (search, close, etc.) ; pas OK pour remplir un espace vide.
- Gradients pastel (purple→pink) — la palette LRH est navy/gold/red, point.
- Coins arrondis systématiques. Mélanger corners droits (badges, pills, strips) et arrondis modérés (4-16px max pour cards).

## Architecture des composants

### Modules réutilisables — `components/lrh/sections/`

Chaque section est un fichier ~80-200 lignes qui exporte les variantes Desktop ET Mobile (via prop `mobileVariant: boolean` ou export `*Desktop` / `*Mobile`). Modules existants :

| Module | Exports | Usage |
|---|---|---|
| `SectionHeading` | `SectionHeading`, `MobileSectionLabel`, `MobileSectionTitle` | Titres de section avec kicker numéroté |
| `Header` | `HeaderDesktop`, `HeaderMobile`, `SeasonToggle`, `NavLink` | Top bar + nav |
| `Hero` | `HeroDesktop`, `HeroMobile`, `MatchChocGlass` | Hero accueil |
| `Bento` | `BentoDesktop`, `BentoMobile`, `LastResultCard`, `StandingsTopCard`, `PlayerOfMonthCard` | Grille résultat/classement/MVP |
| `Competitions` | `CompetitionsDesktop`, `CompetitionsMobile`, `UpcomingMatchCard` | Strip calendrier accueil |
| `News` | `NewsDesktop`, `NewsMobile`, `NewsCard` | Section actualités |
| `Footer` | `FooterDesktop`, `MobileTabBar` | Pied de page |
| `PageHero` | `PageHero` | Bandeau hero pour pages internes (kicker + title + tag + right slot) |
| `StatsRibbon` | `StatsRibbon`, `StatCell` | Bandeau 4 cellules de stats |
| `CompetitionFilter` | `CompetitionFilter`, `FilterOption` | Chips de filtre sticky |
| `CalendarBoard` | `CalendarBoard`, `MonthBand` | Timeline matchs groupés par mois/jour |
| `Podium` | `Podium`, `PodiumEntry` | Top 3 podium asymétrique |
| `StandingsBoard` | `StandingsBoard`, `computeForm`, `FormResult` | Tableau classement complet avec forme |

Importer depuis `'@/components/lrh/sections'` (barrel `index.ts`). Si tu crées un nouveau module, l'exporter là.

### Pages — `components/lrh/pages/` + `app/<route>/page.tsx`

Pattern à respecter pour toute nouvelle page publique :

1. `app/<route>/page.tsx` — **Server Component**. Fetch Prisma (souvent les deux modes GAZON+SALLE en parallèle via `Promise.all`). Passe le payload au client wrapper.
2. `components/lrh/pages/<Name>PageClient.tsx` — **Client Component**. Tient le state (mode, filtres). Détecte mobile via `useIsMobile()`. Assemble Header → PageHero → ...sections... → Footer.

Le client wrapper ne contient **aucun JSX visuel** au-delà du branchement state + composition de sections. Toute mise en forme reste dans les modules.

### Queries — `lib/queries/`

- `competition.ts` : toutes les lectures liées aux matchs/compétitions/classements. Type `Mode` = `'GAZON' | 'SALLE'` (enum Prisma).
- `home.ts` : agrège pour la page d'accueil.
- `club.ts` : pages clubs.

Les actions (CRUD admin) sont dans `lib/actions/*` avec `'use server'` + check de role.

## Convention Mode (gazon/salle)

- Couche **DB/queries** : enum Prisma `Mode = 'GAZON' | 'SALLE'`. Passé à `getAllMatchesForMode(mode)`, etc.
- Couche **UI client** : type local `Mode = 'gazon' | 'salle'` (dans `sections/Header.tsx`). Utilisé par le toggle.
- Aux frontières (server page → client wrapper), la prop `mode: 'gazon' | 'salle'` est convertie en majuscules pour les queries via `mode.toUpperCase() as 'GAZON' | 'SALLE'` ou un mapping explicite.

Pas de confusion à avoir : les deux types vivent dans des couches différentes.

## Dossier `dashboard-hco/`

C'est un dump du site HCO (Hockey Club de l'Ouest) gardé comme référence. **Non compilé.** Provoque ~50 erreurs `tsc` (modules absents). Pour filtrer :

```bash
npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"
```

Ne pas importer depuis `dashboard-hco/` dans les fichiers compilés. Le doc d'adaptation est `docs/CALENDRIER_MATCH_CLASSEMENT.md`.

## Quand on travaille sur l'app

- Toujours `npx tsc --noEmit 2>&1 | grep -v "^dashboard-hco/"` avant de dire "done".
- Pour les actions destructives (suppressions, migrations), demander confirmation avant.
- Le dev server se lance avec `npm run dev` (port 3000 par défaut). En cas de modif UI majeure, lancer + vérifier dans un navigateur.

### Modif du schéma Prisma — séquence obligatoire

À chaque édition de `prisma/schema.prisma` :

1. `npx prisma generate` — régénère le client typé.
2. `npx prisma db push --accept-data-loss` — pousse sur Neon. (`migrate dev` est non-interactif et ne marche pas dans ce setup.)
3. **Redémarrer le dev server** (`Ctrl+C` puis `npm run dev`). ⚠️ Étape facilement oubliée.

**Pourquoi redémarrer est obligatoire** : `lib/prisma.ts` cache l'instance `PrismaClient` sur `globalThis.prisma` pour éviter d'épuiser les connexions Neon pendant le HMR. Cette instance est créée **avant** que `prisma generate` ne mette à jour les types et le runtime. Le dev server continuera à appeler les anciens accesseurs (par ex. `prisma.bureauMember` n'existera pas → `TypeError: Cannot read properties of undefined (reading 'findMany')`) tant que le process n'est pas recréé.

Si tu vois ce genre d'erreur après une modif de schéma, c'est ça. Pas la peine de toucher au code — relance le dev server. Optionnel : `Remove-Item -Recurse -Force .next` avant le restart pour clear le cache Turbopack (ceinture + bretelles, rarement nécessaire).

## Upload d'images — Cloudflare Images

Tous les champs image du projet (`News.coverImage`, `BureauMember.photo`, `CommissionMember.photo`, futur `Sponsor.logo`) utilisent **Cloudflare Images** en mode "Direct Creator Upload" — le fichier va du navigateur directement à Cloudflare, sans transiter par nos serveurs (pas de body size limit Vercel, pas de coût de bande passante côté Next).

### Module à utiliser systématiquement

`components/lrh/upload/ImageUploader.tsx` — composant client unique qui combine :
- Drag & drop sur une zone éditoriale (pattern diagonal LRH, hover gold)
- Click pour ouvrir le file picker natif
- Champ "ou URL" en dessous pour coller un lien existant
- Preview de l'image courante avec boutons Remplacer / Retirer
- Gestion des états : idle / uploading / error
- Validation client : taille (default 10 Mo), type (image/*)
- Fallback gracieux quand Cloudflare n'est pas configuré (l'admin peut toujours coller une URL manuellement)

Usage typique (formulaire admin) :

```tsx
import { ImageUploader } from '@/components/lrh/upload/ImageUploader';

<ImageUploader
  label="Photo"
  value={form.photo}
  onChange={(url) => setForm({ ...form, photo: url ?? '' })}
  hint="Glissez une image, cliquez pour parcourir, ou collez une URL."
/>
```

Avec `react-hook-form`, l'envelopper dans un `<Controller>` (cf. `app/dashboard/news/new/NewsForm.tsx`).

### API route

`app/api/upload/cloudflare/route.ts` — POST authentifié. Demande à Cloudflare un `uploadURL` à usage unique, renvoie `{ uploadURL, imageId, deliveryURL }` au client. Le client uploade ensuite directement vers `uploadURL` puis utilise `deliveryURL` (format `https://imagedelivery.net/{accountHash}/{imageId}/public`) comme valeur stockée en DB.

### Variables d'environnement requises (`.env`)

```
CLOUDFLARE_ACCOUNT_ID=...           # dashboard Cloudflare > Workers & Pages > Account ID
CLOUDFLARE_IMAGES_TOKEN=...         # API token avec permission "Cloudflare Images: Edit"
CLOUDFLARE_IMAGES_ACCOUNT_HASH=...  # dashboard Cloudflare > Images > "Delivery URL" — la partie entre imagedelivery.net/ et /<image_id>
```

Sans ces variables, l'API renvoie 503 et le composant affiche un message clair. La saisie d'URL manuelle continue de fonctionner — donc l'app reste utilisable.

### CSP

L'en-tête `Content-Security-Policy` dans `next.config.ts` autorise déjà `img-src 'self' data: https:` — donc `imagedelivery.net` passe. Si on durcit la CSP à un jour, il faudra explicitement whitelister `https://imagedelivery.net`.

### Variants Cloudflare

Le module utilise par défaut le variant `public`. Pour des variants spécifiques (`thumbnail`, `cover`, etc.) à configurer dans le dashboard Cloudflare, passer la prop `variant="thumbnail"` au composant.

## Mémoire persistante

Voir `~/.claude/projects/C--Users-miker-Desktop-Projets-siteweb/memory/MEMORY.md` pour les préférences user, choix techniques durables (Cloudflare Images, etc.) et conventions tacites.
