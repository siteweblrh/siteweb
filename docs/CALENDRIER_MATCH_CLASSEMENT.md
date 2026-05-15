# Module Calendrier / Matchs / Classement — Guide de réutilisation

Ce document extrait toute la logique métier des sections **Calendrier**, **Matchs** et **Classement** du site HCO pour être réutilisée dans un autre projet (ex. site de la Ligue Réunionnaise de Hockey sur Gazon et Salle).

L'idée : tu peux copier/coller les fichiers listés ici dans un nouveau projet Next.js + Prisma et avoir toute la chaîne (DB → Server Actions → UI publique → Admin) fonctionnelle.

---

## 1. Stack & dépendances requises

```
- Next.js 15+/16 (App Router, Server Actions, unstable_cache)
- React 19
- TypeScript
- Tailwind CSS (v3 ou v4)
- Prisma 5 + PostgreSQL (Neon recommandé)
- NextAuth (pour l'admin)
- lucide-react (icônes)
- next/image
```

Variables CSS Tailwind utilisées dans les composants (à adapter) :
- `bg-hco-dark`, `text-hco-primary`, `gradient-primary`, `gradient-text`, `section-dark`
→ remplace `hco` par le préfixe de ton projet (ex. `ligue-`).

---

## 2. Modèle de données (Prisma)

Voici **uniquement** les tables nécessaires au module. Tu peux les copier telles quelles dans `prisma/schema.prisma`.

```prisma
enum CompetitionType {
  CHAMPIONSHIP_FIELD   // Championnat Gazon
  CHAMPIONSHIP_INDOOR  // Championnat Salle
  CUP_INDOOR           // Coupe Salle
  CUP_FIELD            // Coupe Gazon
  LOISIR               // Rencontres Loisir
  PLAYOFF_INDOOR       // Phase Finale Salle (3e place, Finale)
}

model Team {
  id           String  @id @default(cuid())
  name         String
  logoUrl      String?
  isMyClub     Boolean @default(false) // true pour le club "host" du site
  city         String?
  indoorVenue  String? // Gymnase
  outdoorVenue String? // Terrain

  // Entente (alliance entre clubs)
  isEntente        Boolean @default(false)
  secondaryLogoUrl String?

  homeMatches         Match[] @relation("HomeTeam")
  awayMatches         Match[] @relation("AwayTeam")
  eventParticipations CompetitionEventParticipant[]
}

model Competition {
  id        String          @id @default(cuid())
  name      String          // Ex: "Championnat Réunion Salle 2026"
  type      CompetitionType
  isIndoor  Boolean         @default(true) // utile pour LOISIR sans discipline explicite
  season    String          // "2025/2026"
  matches   Match[]
  events    CompetitionEvent[]
  createdAt DateTime        @default(now())
}

model Match {
  id            String      @id @default(cuid())
  date          DateTime
  location      String?
  played        Boolean     @default(false)
  matchLabel    String?     // "Finale", "Demi 1", etc. (phase finale)

  homeTeamId    String
  homeTeam      Team        @relation("HomeTeam", fields: [homeTeamId], references: [id])
  homeScore     Int?

  awayTeamId    String
  awayTeam      Team        @relation("AwayTeam", fields: [awayTeamId], references: [id])
  awayScore     Int?

  competitionId String
  competition   Competition @relation(fields: [competitionId], references: [id])

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

// Évènement de compétition (tournoi un jour J, plusieurs équipes au même endroit)
model CompetitionEvent {
  id            String      @id @default(cuid())
  date          DateTime
  location      String?
  description   String?     // "Phase finale", "1er tour"
  competitionId String
  competition   Competition @relation(fields: [competitionId], references: [id], onDelete: Cascade)
  participants  CompetitionEventParticipant[]
  createdAt     DateTime    @default(now())
}

model CompetitionEventParticipant {
  id      String           @id @default(cuid())
  eventId String
  event   CompetitionEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  teamId  String
  team    Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([eventId, teamId])
}
```

> Note : si tu veux aussi gérer les **buteurs**, ajoute le modèle `Goal` (matchId + playerId + minute) et un modèle `Player`. Pas indispensable pour le module calendrier/classement minimal.

Commande de sync (utilisée sur HCO car `migrate dev` ne marche pas en mode non-interactif sous Neon) :
```bash
npx prisma db push --accept-data-loss
```

---

## 3. Architecture des fichiers

```
lib/
  business/
    standings.ts          # Calcul pur (3pts/1pt/0pt) — AUCUNE dépendance DB
  prisma.ts               # Instance Prisma singleton

actions/
  season.actions.ts       # Lectures publiques (avec unstable_cache)
  admin.actions.ts        # CRUD admin (requireAdmin + revalidatePath)

components/
  season/
    StandingsTable.tsx    # Tableau de classement (server component possible)
    CalendarSection.tsx   # UI complète calendrier (Salle/Gazon + À venir/Résultats)
    CalendarCard.tsx      # Carte d'un match (compact ou "next match")
    CalendarEventCard.tsx # Carte d'un évènement multi-équipes
    MatchCard.tsx         # Carte standalone d'un match (réutilisable)
    MatchList.tsx         # Liste simple de matchs (résultats + à venir)
    SeasonDashboard.tsx   # Dashboard avec onglets Salle/Gazon × Champ/Coupe × Régulier/Playoff
    SeasonTabs.tsx        # Sélecteurs onglets
    TopScorers.tsx        # (optionnel) si tu gardes Goals/Players

app/
  (public)/
    saison/
      page.tsx            # Dashboard (classement + résultats + à venir)
      calendrier/
        page.tsx          # Calendrier complet + JSON-LD SportsEvent
    match/[id]/
      page.tsx            # Page match (sert au partage OG)

  (admin)/dashboard/sport/
    standings/page.tsx    # Vue admin du classement (refresh cache)
    matches/...           # CRUD matchs
    competitions/...      # CRUD compétitions
    teams/...             # CRUD équipes
```

---

## 4. Logique pure : calcul du classement

**Fichier : `lib/business/standings.ts`**

Règles : **Victoire = 3 pts**, **Nul = 1 pt**, **Défaite = 0 pt**.
Tri : **Points** > **Différence de buts** > **Buts marqués**.

```ts
export type MatchResult = {
  id: string;
  played: boolean;
  homeTeamId: string;
  homeTeam: { id: string; name: string; logoUrl: string | null; isMyClub: boolean; isEntente: boolean; secondaryLogoUrl: string | null };
  homeScore: number | null;
  awayTeamId: string;
  awayTeam: { id: string; name: string; logoUrl: string | null; isMyClub: boolean; isEntente: boolean; secondaryLogoUrl: string | null };
  awayScore: number | null;
};

export type TeamStanding = {
  teamId: string;
  teamName: string;
  name: string;          // alias pour compat. composants TeamLogoData
  logoUrl: string | null;
  isMyClub: boolean;
  isEntente: boolean;
  secondaryLogoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

export function calculateStandings(matches: MatchResult[]): TeamStanding[] {
  const map = new Map<string, TeamStanding>();
  const playedMatches = matches.filter(
    (m) => m.played && m.homeScore !== null && m.awayScore !== null
  );

  for (const match of playedMatches) {
    const homeScore = match.homeScore!;
    const awayScore = match.awayScore!;

    if (!map.has(match.homeTeamId)) map.set(match.homeTeamId, empty(match.homeTeam));
    if (!map.has(match.awayTeamId)) map.set(match.awayTeamId, empty(match.awayTeam));

    const h = map.get(match.homeTeamId)!;
    const a = map.get(match.awayTeamId)!;

    h.played++; a.played++;
    h.goalsFor += homeScore;       h.goalsAgainst += awayScore;
    a.goalsFor += awayScore;       a.goalsAgainst += homeScore;

    if (homeScore > awayScore)       { h.won++;  h.points += 3; a.lost++; }
    else if (homeScore < awayScore)  { a.won++;  a.points += 3; h.lost++; }
    else                              { h.drawn++; a.drawn++; h.points++; a.points++; }
  }

  for (const s of map.values()) s.goalDiff = s.goalsFor - s.goalsAgainst;

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });
}

function empty(team: { id: string; name: string; logoUrl: string | null; isMyClub: boolean; isEntente: boolean; secondaryLogoUrl: string | null }): TeamStanding {
  return {
    teamId: team.id, teamName: team.name, name: team.name,
    logoUrl: team.logoUrl, isMyClub: team.isMyClub,
    isEntente: team.isEntente, secondaryLogoUrl: team.secondaryLogoUrl,
    played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
  };
}

export function formatGoalDiff(diff: number): string {
  return diff > 0 ? `+${diff}` : diff.toString();
}
```

**Avantage** : 100 % testable unitairement, aucun couplage à Prisma.

---

## 5. Server Actions (lectures publiques)

**Fichier : `actions/season.actions.ts`**

Toutes les lectures sont **mises en cache** via `unstable_cache` (60 s). Le cache est invalidé par `revalidatePath` dans les actions admin.

### 5.1 Types exportés

```ts
export type TeamInfo = {
  id: string; name: string; logoUrl: string | null;
  isMyClub: boolean; isEntente: boolean; secondaryLogoUrl: string | null;
};

export type MatchWithTeams = {
  id: string; date: Date; location: string | null;
  played: boolean; matchLabel: string | null;
  homeScore: number | null; awayScore: number | null;
  homeTeam: TeamInfo; awayTeam: TeamInfo;
};

export type CompetitionWithMatches = {
  id: string; name: string; type: CompetitionType;
  season: string; matches: MatchWithTeams[];
};

export type CalendarMatch = MatchWithTeams & {
  competitionName: string;
  competitionType: CompetitionType;
  competitionIsIndoor: boolean;
};

export type CalendarEvent = {
  id: string; date: Date; location: string | null;
  description: string | null;
  competitionName: string;
  competitionType: CompetitionType;
  competitionIsIndoor: boolean;
  participants: TeamInfo[];
};

export type NextMatchInfo = {
  id: string; date: Date; location: string | null;
  competitionName: string;
  homeTeam: TeamInfo; awayTeam: TeamInfo;
} | null;
```

### 5.2 Helpers patterns

Tous suivent ce schéma :
1. Une fonction privée `_getX(...)` qui interroge Prisma.
2. Une export `getX = unstable_cache(_getX, ["cache-key"], { revalidate: 60 })`.

**Fonctions à exporter** :

| Fonction | Rôle |
|---|---|
| `getCompetitionsByType(discipline)` | Liste les compétitions FIELD ou INDOOR avec leurs matchs |
| `getCompetitionById(id)` | Une compétition + ses matchs |
| `getStandings(competitionId)` | Classement calculé d'une compétition |
| `getRecentResults(competitionId, limit=5)` | Derniers résultats joués |
| `getUpcomingMatches(competitionId, limit=5)` | Prochains matchs |
| `getSeasonData(discipline)` | `{ championship, cup, playoff }` (playoff seulement INDOOR) |
| `getCalendarMatches(discipline)` | **Tous** les matchs (championnat + coupe + loisir + playoff) pour le calendrier |
| `getCalendarEvents(discipline)` | Tous les évènements (coupe, playoff, loisir) |
| `getNextMatch()` | Prochain match du club host (toutes compétitions) — pour la home |
| `getMatchById(id)` | Match unique (pour pages OG / partage) |
| `getTopScorers(competitionId, limit=10)` | Top buteurs (si tu gardes `Goal`) |

### 5.3 Pattern de discrimination Salle / Gazon

```ts
const types: CompetitionType[] =
  discipline === "FIELD"
    ? [CompetitionType.CHAMPIONSHIP_FIELD, CompetitionType.CUP_FIELD]
    : [CompetitionType.CHAMPIONSHIP_INDOOR, CompetitionType.CUP_INDOOR, CompetitionType.PLAYOFF_INDOOR];

const isIndoor = discipline === "INDOOR";

const matches = await prisma.match.findMany({
  where: {
    OR: [
      { competition: { type: { in: types } } },        // Types explicites
      { competition: { type: "LOISIR", isIndoor } },   // LOISIR matché par flag
    ],
  },
  include: {
    homeTeam: { select: { id: true, name: true, logoUrl: true, isMyClub: true, isEntente: true, secondaryLogoUrl: true } },
    awayTeam: { select: { id: true, name: true, logoUrl: true, isMyClub: true, isEntente: true, secondaryLogoUrl: true } },
    competition: { select: { name: true, type: true, isIndoor: true } },
  },
  orderBy: { date: "asc" },
});
```

> **Important** : toujours `select` les mêmes champs sur `homeTeam`/`awayTeam` pour garder une signature `TeamInfo` cohérente.

---

## 6. Server Actions (admin / CRUD)

**Fichier : `actions/admin.actions.ts`** — toutes les fonctions commencent par `await requireAdmin()` et finissent par `revalidatePath(...)` sur les routes concernées.

```ts
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Non autorisé");
  return session;
}
```

### Endpoints minimaux à exposer

```ts
// TEAMS
createTeam(data)          updateTeam(id, data)        deleteTeam(id)
getVenues()               // récupère les gymnases/terrains pour l'autocomplétion

// COMPETITIONS
getCompetitions()         getCompetition(id)
createCompetition(data)   updateCompetition(id, data) deleteCompetition(id)

// MATCHES
getMatches({ competitionId, page, limit })
getAllMatches(competitionId?)
getMatch(id)
createMatch({ date, location, homeTeamId, awayTeamId, competitionId })
updateMatch(matchId, partialData)
updateMatchResult(matchId, { homeScore, awayScore, goals[], players[] })
deleteMatch(id)

// COMPETITION EVENTS
getCompetitionEvents()    getCompetitionEvent(id)
createCompetitionEvent({ date, location, description, competitionId, participantTeamIds })
updateCompetitionEvent(id, data)
deleteCompetitionEvent(id)
```

### Pattern createMatch (référence)

```ts
export async function createMatch(data: {
  date: Date;
  location?: string | null;
  homeTeamId: string;
  awayTeamId: string;
  competitionId: string;
}) {
  await requireAdmin();
  const match = await prisma.match.create({ data });

  revalidatePath("/dashboard/sport/matches");
  revalidatePath("/saison");
  revalidatePath("/saison/calendrier");
  revalidatePath("/");

  return match;
}
```

### Pattern updateMatch (avec relations)

> **Piège Prisma** : pour mettre à jour une relation, **ne pas** passer juste `homeTeamId`. Utiliser `homeTeam: { connect: { id: ... } }`.

```ts
const updateData: Prisma.MatchUpdateInput = {
  date: data.date, location: data.location, matchLabel: data.matchLabel,
  homeScore: data.homeScore, awayScore: data.awayScore, played: data.played,
};
if (data.homeTeamId)     updateData.homeTeam     = { connect: { id: data.homeTeamId } };
if (data.awayTeamId)     updateData.awayTeam     = { connect: { id: data.awayTeamId } };
if (data.competitionId)  updateData.competition  = { connect: { id: data.competitionId } };

return prisma.match.update({ where: { id: matchId }, data: updateData });
```

### Pattern updateMatchResult (saisie score + buteurs)

```ts
// 1) Update score + played
await prisma.match.update({
  where: { id: matchId },
  data: { homeScore, awayScore, played: true },
});
// 2) Reset puis recrée les Goals
await prisma.goal.deleteMany({ where: { matchId } });
if (goals.length) await prisma.goal.createMany({ data: goals.map((g) => ({ matchId, playerId: g.playerId, minute: g.minute })) });
// 3) Idem pour la feuille de match (MatchPlayer)
// 4) revalidatePath sur toutes les routes affectées
```

---

## 7. UI publique

### 7.1 `<StandingsTable />` — tableau de classement

Props : `standings: TeamStanding[]`. Server component, **pas de state**.

Caractéristiques :
- Header bandeau sombre + icône Trophy.
- Colonnes : `#`, `Équipe`, `Pts`, `J`, `G`, `N`, `P`, `BP`, `BC`, `+/-`.
- Colonnes `G/N/P` cachées sous `sm`, `BP/BC` cachées sous `md`.
- Rang 1 → médaille or, 2 → argent, 3 → bronze.
- Ligne du club host (`isMyClub`) surlignée + badge.
- Empty state avec icône Trophy.
- Légende mobile en bas.

### 7.2 `<CalendarSection />` — bloc calendrier complet

Client component. State :
```ts
const [discipline, setDiscipline] = useState<"INDOOR"|"FIELD">("INDOOR");
const [view, setView] = useState<"upcoming"|"results">("upcoming");
```

Logique :
1. `useEffect` sur `discipline` → `Promise.all([getCalendarMatches, getCalendarEvents])`.
2. Sépare matchs `played` vs `!played`.
3. **Next Match Hero** : premier match non-joué affiché en grand au-dessus.
4. Combine matchs + évènements en `CalendarItem[]`, trie chronologique (à venir) ou anti-chrono (résultats).
5. **Groupage par mois** via `toLocaleDateString("fr-FR", { month: "long", year: "numeric" })`.
6. Stats `V / N / D` calculées côté client à partir de `homeTeam.isMyClub`.

```ts
const totalWins = pastMatches.filter((m) => {
  const isHcoHome = m.homeTeam.isMyClub;
  const hcoScore = isHcoHome ? m.homeScore : m.awayScore;
  const oppScore = isHcoHome ? m.awayScore : m.homeScore;
  return hcoScore !== null && oppScore !== null && hcoScore > oppScore;
}).length;
```

### 7.3 `<CalendarCard />` — carte match

Deux modes :
- `isNextMatch={true}` : hero card sombre avec gradient + logos grands.
- Mode standard : barre verticale colorée selon le résultat (V vert / D rouge / N gris), score dans pastille colorée.

**Badge compétition** dérivé de `competitionType` :
```ts
PLAYOFF_INDOOR  → "Phase Finale" (purple)
CHAMPIONSHIP_*  → "Championnat"  (blue)
LOISIR          → "Loisir Salle/Gazon" (orange)
default         → "Coupe"        (amber)
```

**Effet visuel "AUJOURD'HUI"** : compare `matchDate.toDateString()` à `new Date().toDateString()` → ring + pulse.

### 7.4 `<MatchCard />` — carte standalone

Plus simple que `CalendarCard`, utile pour des listes ad-hoc. Propose juste un score à gauche, équipes à droite, label de match optionnel ("Finale", "1/2 finale", etc.).

### 7.5 Page `/saison/calendrier`

Server component qui :
1. Fetch `getCalendarMatches("INDOOR")` + `getCalendarMatches("FIELD")` en parallèle.
2. Génère un **JSON-LD `SportsEvent`** pour chaque match à venir (SEO).
3. Rend `<CalendarSection />`.

```tsx
const sportsEventsJsonLd = allUpcoming.map((m) => ({
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  name: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
  startDate: new Date(m.date).toISOString(),
  location: m.location && { "@type": "Place", name: m.location, address: {...} },
  homeTeam: { "@type": "SportsTeam", name: m.homeTeam.name },
  awayTeam: { "@type": "SportsTeam", name: m.awayTeam.name },
  sport: m.competitionIsIndoor ? "Hockey en salle" : "Hockey sur gazon",
  eventStatus: "https://schema.org/EventScheduled",
}));
```

### 7.6 `<SeasonDashboard />` — vue d'ensemble

Tabs imbriqués :
1. **Discipline** : Salle / Gazon.
2. **Compétition** : Championnat / Coupe.
3. **Phase** (uniquement Indoor + Championnat) : Régulière / Phase finale.

Logique de chargement :
```ts
const shouldLoadStandings =
  (competition === "CHAMPIONSHIP" && phase === "REGULAR") ||
  (competition === "CUP" && discipline === "INDOOR");
```

Le classement n'est calculé **que** pour le championnat en phase régulière, ou pour la coupe Indoor (qui se joue en poules au début).

---

## 8. UI admin

### 8.1 Page classement admin `/dashboard/sport/standings`

Server component qui :
1. Récupère toutes les compétitions de type `CHAMPIONSHIP_*`.
2. Pour chacune, appelle `getStandings(comp.id)`.
3. Affiche un tableau par championnat.
4. Bouton "Rafraîchir" qui appelle une server action `revalidatePath("/saison")`.

### 8.2 CRUD Matchs

Formulaire `<MatchForm />` :
- Sélecteur compétition → recharge les équipes possibles.
- Sélecteurs `homeTeam` / `awayTeam` (interdit même équipe des deux côtés).
- DatePicker → `<input type="datetime-local">`, conversion en `Date` avant `createMatch`.
- Autocomplétion location via `getVenues()`.

Formulaire `<MatchResultForm />` :
- Inputs scores numériques.
- Sélecteur joueurs buteurs (multi-select) + minute optionnelle.
- Feuille de match (lineup) optionnelle.

---

## 9. Cache & invalidation

Toutes les routes publiques utilisent `unstable_cache`. Quand l'admin modifie :

| Action | revalidatePath() |
|---|---|
| createTeam / updateTeam | `/dashboard/sport/teams`, `/saison` |
| createMatch / updateMatch / updateMatchResult / deleteMatch | `/dashboard/sport/matches`, `/saison`, `/saison/calendrier`, `/` |
| createCompetition / updateCompetition / deleteCompetition | `/dashboard/sport/competitions`, `/dashboard/sport/matches`, `/saison`, `/saison/calendrier` |
| createCompetitionEvent / update / delete | `/dashboard/sport/matches`, `/saison`, `/saison/calendrier` |

> Garder cette table synchro est critique : un oubli laisse des données rances pour 60 s.

---

## 10. Checklist d'intégration dans un nouveau projet

1. [ ] Installer dépendances : `next`, `react`, `prisma`, `@prisma/client`, `next-auth`, `bcryptjs`, `lucide-react`, `tailwindcss`.
2. [ ] Copier les enums + modèles `Team`, `Competition`, `Match`, `CompetitionEvent`, `CompetitionEventParticipant` dans `prisma/schema.prisma`.
3. [ ] `prisma generate` + `prisma db push --accept-data-loss`.
4. [ ] Copier `lib/business/standings.ts` tel quel.
5. [ ] Copier `actions/season.actions.ts` et `actions/admin.actions.ts` — remplacer `auth` par ton import NextAuth.
6. [ ] Copier les composants `season/*.tsx` — remplacer les classes `hco-*` par tes classes projet.
7. [ ] Copier les pages `(public)/saison/page.tsx`, `(public)/saison/calendrier/page.tsx`, `(public)/match/[id]/page.tsx`.
8. [ ] Copier les pages admin `(admin)/dashboard/sport/{matches,teams,competitions,standings}/...`.
9. [ ] Adapter `metadata.title` / `description` / `baseUrl` / JSON-LD au nouveau site (ex. `addressLocality: "Saint-Denis"`, `organizer: "Ligue Réunionnaise..."`).
10. [ ] Décider la sémantique de `isMyClub` :
    - Pour un site de **club** : exactement une équipe avec `isMyClub = true`.
    - Pour un site de **ligue** : **toutes** les équipes en `isMyClub = false` (sinon une équipe sera surlignée partout). Tu peux soit retirer la colonne, soit garder le champ et le laisser à `false`.

---

## 11. Adaptation conseillée pour un site de Ligue

Différences par rapport à un site de club :

1. **`isMyClub` devient inutile** : la ligue n'a pas d'équipe favorite. Deux choix :
   - **Recommandé** : garder le champ pour ne pas casser les types, le forcer à `false`, retirer toute la mise en évidence dans `StandingsTable`, `CalendarCard`, etc. (chercher `isMyClub` et nettoyer).
   - Le supprimer du schéma → impacte beaucoup de fichiers, plus de travail.

2. **Stats "V / N / D"** dans `<CalendarSection />` : ces stats ne font pas sens pour une ligue (pas d'équipe focus). À supprimer ou remplacer par "Total matchs : X".

3. **`getNextMatch()` + `<NextMatchSection />`** côté home : non pertinent pour une ligue. Soit retirer, soit remplacer par "Prochain weekend" = X matchs Salle, Y matchs Gazon.

4. **Multi-divisions** : si la ligue a plusieurs divisions, ajouter un champ `division: String?` sur `Competition` (ex. "Honneur", "Promotion d'Honneur") et un select dans `<SeasonDashboard />`.

5. **Multi-catégories** (U14, U17, Seniors…) : ajouter `category: String?` sur `Competition` et un sélecteur supplémentaire.

6. **JSON-LD** : organisateur = "Ligue Réunionnaise de Hockey", `addressRegion: "La Réunion"`, `addressCountry: "RE"` ou `"FR"`.

7. **Plusieurs gymnases / terrains** : la ligue ne possède pas les venues — il faut soit un modèle `Venue` séparé, soit garder le champ `location` libre.

---

## 12. Bonus : Embeds blog

Le projet HCO expose ces 4 composants pour insérer des données live dans un article :

| Composant | Données |
|---|---|
| `<StandingsEmbed competitionId="..." />` | Tableau de classement |
| `<NextMatchEmbed />` | Prochain match |
| `<CalendarEmbed discipline="INDOOR" />` | Mini calendrier |
| `<MatchLineupEmbed matchId="..." />` | Feuille de match |

Implémentés comme des Server Components qui appellent les actions ci-dessus. Réutilisables tel quel si tu utilises TipTap (extensions custom) ou Markdown (mdx-components).

---

## 13. Tests rapides à faire après installation

1. Créer 4 équipes via admin (`isMyClub = false` partout).
2. Créer 1 compétition `CHAMPIONSHIP_INDOOR` "Championnat Réunion Salle 2026".
3. Créer 6 matchs entre ces 4 équipes, dates étalées sur 2 mois.
4. Saisir 2 résultats → vérifier que :
   - Le classement se calcule (`/saison`).
   - Le calendrier affiche bien "Résultats" + "À venir" (`/saison/calendrier`).
   - Le badge "Championnat" s'affiche.
   - La carte "Prochain match" apparaît en haut.
5. Toggle Salle/Gazon → la liste change correctement.
6. Modifier un match → le cache se rafraîchit immédiatement.
