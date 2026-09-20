# Saisie rapide de journée — cadrage

**Date :** 2026-09-20 · **État :** cadré, non implémenté · **Demandeur :** la ligue

Ce document cadre un écran d'administration qui transforme un bloc de texte
collé — la transcription d'une feuille de match FFH — en lignes `Match`,
`Goal`, `MatchCard` et `MatchInjury`, avec un aperçu avant écriture.

Il s'appuie sur un cas réel : la saisie de la **J02 du Championnat de la
Réunion Salle 2026-2027**, le 2026-09-20. Tous les exemples et tous les
garde-fous ci-dessous viennent de cette session, pas d'une hypothèse.

---

## 1. Le problème, mesuré

La J02 représentait **4 matchs, 47 buts, 5 cartons, 1 blessure, 3 joueurs
absents de la base**. Deux chemins existaient, aucun satisfaisant :

- **Au dashboard** (`/dashboard/matches/<id>`) : chaque but s'ouvre en modale,
  demande le club marqueur puis le buteur, et se valide. À raison de 4 actions
  par but, la journée coûte de l'ordre de **200 interactions**. L'écran est
  correct pour corriger un but ; il n'est pas dimensionné pour saisir une
  journée entière.
- **Par script** (`scripts/salle-2026-j02.mjs`) : rapide, mais il faut un
  développeur, un accès à `.env.neon` et quatre allers-retours de conversation.
  Ce n'est pas un processus, c'est un dépannage.

La donnée d'entrée, elle, arrive déjà sous forme de texte structuré. C'est ce
texte qu'il faut rendre exploitable.

## 2. Ce qu'on ne fait pas, et pourquoi

- **Pas d'OCR, pas d'import PDF.** Un service tiers d'OCR sort du gratuit
  (contrainte permanente du projet) et déplace le problème : il faudrait
  quand même relire et corriger la sortie.
- **Pas d'API fédérale.** Il n'y en a pas de branchée sur ce projet. Si elle
  existait un jour, elle remplacerait l'étape 1 du pipeline (le parsing) sans
  rien changer aux étapes 2 et 3 — l'architecture ci-dessous le permet.
- **Pas de devinette.** C'est la règle centrale, développée en §5.

## 3. Périmètre

**Dans le périmètre :** un écran admin, une compétition, une journée. Coller du
texte → voir un plan → valider → écrire. Score, statut, buteurs, cartons,
blessures, et création des joueurs manquants.

**Hors périmètre :** les gardiens (`Match.homeGoalkeeperId` /
`awayGoalkeeperId`) tant que les feuilles FFH salle ne les portent pas — au
2026-09-20, **aucun** des 8 matchs du championnat n'a de gardien renseigné et
le classement des gardiens est donc vide. À rouvrir quand la donnée existera.

## 4. Le format d'entrée

La grammaire est calquée sur ce que la ligue produit déjà. Extrait réel :

```
### HCP (Domicile) 10 – 4 Entente SDHC/HHS/Zarlors (Visiteurs)

* **Score final :** 10 - 4

* **Buteurs HCP (10 buts) :**
* **Mathieu Ledoux** (#18) : **3 buts**
* **Jean Yves Filo** (#22) : **2 buts**

* **Buteurs Entente SDHC/HHS/Zarlors (4 buts) :**
* **Alexandre Orange** (#17) : **3 buts**

* **Sanctions enregistrées (Entente) :**
* **Alexandre Orange** (#17) : Carton vert

* **Blessure signalée (USPG) :**
* **Bertrand Vidot** (#10) : Choc balle orteil droit
```

Principes de tolérance :

- **La décoration Markdown est ignorée** (`#`, `*`, `**`, puces, espaces
  multiples). On normalise avant de reconnaître.
- **Les tirets** `-`, `–`, `—` sont équivalents dans un score.
- **Les accents et la casse** sont ignorés pour reconnaître les mots-clés
  (`Buteurs`, `Sanctions`, `Blessure`, `Score final`, `Aucun buteur`).
- **Le numéro de maillot est facultatif** et n'identifie jamais personne (§5.3).
- **`Adversaire : Aucun buteur`** est une information valide : zéro but pour ce
  camp, à vérifier contre le score.

Les cartons se lisent `Carton vert|jaune|rouge` → `CardKind` `GREEN|YELLOW|RED`.
La minute n'est jamais attendue : `Goal.minute`, `MatchCard.minute` et
`MatchInjury.minute` sont nullables précisément parce que ces feuilles ne
portent pas le chrono.

## 5. Les garde-fous — le cœur du sujet

Un import qui devine publie un classement faux sans que rien ne le signale.
Les six règles ci-dessous viennent toutes d'un cas rencontré le 2026-09-20.

### 5.1 Buts listés ≠ score → **bloquant**

Contrôle par camp, pas seulement sur le total. C'est le garde-fou déjà en
place dans `scripts/salle-2026-j02.mjs`, et celui qui a attrapé le cas suivant.

### 5.2 Ligne de buteur en trop → **bloquant**

Sur HCP 10-4, la feuille portait une ligne `n° 4 Kenny Iva` alors que les cinq
buteurs nommés totalisaient déjà 10 buts. Onzième but (donc score faux) ou
ligne d'effectif ? L'écran doit poser la question, pas trancher. Rien n'a été
saisi ce jour-là, et c'était la bonne décision.

### 5.3 Numéro de maillot contredisant la base → **avertissement, jamais d'écriture**

Trois cas sur une seule journée : VIDOT `#10` contre `81` en base, ORANGE
`#17` contre `11`, SAMINADIN Julien `#6` contre `13`. Le dernier est le
piège : **le 6 appartient à Cedric SALINDIER en base.** Attribuer au numéro
aurait crédité le mauvais joueur.

Donc : **on résout sur le NOM, jamais sur le numéro.** Le numéro sert
uniquement à lever une ambiguïté entre deux homonymes du même club, et une
divergence est signalée à l'écran sans modifier `Member.jerseyNumber`.

### 5.4 Joueur absent de la base → **bloquant, avec création explicite**

Trois joueurs manquaient (RIVIERE, DUCHEMAN, BEGUE). L'écran propose de les
créer, club et numéro pré-remplis, mais **l'admin coche**. `Member.license`
étant `@unique` et non nullable, une création sans licence pose une licence
provisoire `PROV-<CLUB>-<NOM>-<INITIALE>` — convention déjà en place, à
remplacer ensuite dans `/dashboard/team`.

### 5.5 Correspondance partielle de nom → **bloquant**

« Jerry Celestin » sur la feuille, « Quentin Celestin » en base. Même nom de
famille, prénom différent. Trois interprétations possibles (même joueur mal
noté, joueur différent, faute de frappe) et aucune n'est déductible. L'écran
propose : rattacher à Quentin · créer Jerry · enregistrer au nom libre.

Le dernier choix est légitime et déjà supporté par le schéma :
`Goal.scorerName` et `MatchCard.memberName` existent pour ça. Contrepartie à
afficher clairement : **sans `scorerMemberId`, le joueur n'entre pas au
classement des buteurs.** C'est le compromis retenu pour Fabrice POYER, dont
on ignorait lequel des trois clubs de l'entente avait délivré la licence.

### 5.6 Match déjà saisi → **diff avant écrasement**

L'import est rejouable : il purge puis réécrit les événements du match visé.
Avant d'écrire, l'écran montre ce qui disparaît. Un match déjà saisi à la main
ne doit pas être effacé par surprise.

### 5.7 Statut

Un match avec un score mais resté `SCHEDULED` est **invisible pour
`updateStandings()`** et sort du classement sans lever d'erreur. L'import pose
donc `status: 'FINISHED'` explicitement, comme le fait le script.

## 6. Modèle de données : aucune migration

Tout existe déjà : `Goal` (avec `scorerName` de repli), `MatchCard` (avec
`memberName`), `MatchInjury`, `Member`, et les minutes nullables. **Pas de
nouvelle table, pas de champ à ajouter.**

La traçabilité passe par `AuditLog`, déjà prévu pour ça : une entrée
`IMPORT_MATCHDAY` par match, avec en `metadata` le texte source et le résumé
des lignes créées. C'est ce qui permettra de répondre à « d'où vient ce but ? »
trois mois plus tard.

## 7. Architecture

Trois étapes strictement séparées. C'est ce qui rend le tout testable et
remplaçable si une API fédérale arrive un jour.

| Fichier | Rôle | Nature |
|---|---|---|
| `lib/matchsheet/parse.ts` | texte → structure | **fonction pure, zéro I/O** |
| `lib/matchsheet/parse.test.ts` | cas réels de J01 et J02 | `npm test` |
| `lib/matchsheet/types.ts` | types partagés parse ↔ UI | neutre, importable côté client |
| `lib/actions/matchsheet.ts` | résolution + contrôles → plan, puis application | `'use server'`, `requireAdmin` |
| `app/dashboard/matches/journee/saisie/page.tsx` | Server Component, `getDashboardContext()` | admin |
| `app/dashboard/matches/journee/saisie/ImportClient.tsx` | zone de collage + rendu du plan | `'use client'` |
| `app/dashboard/matches/journee/saisie/PlanReview.tsx` | un bloc par match : diff, alertes, choix | `'use client'` |

L'étape de parsing ne touche ni la base ni le réseau : elle prend une chaîne et
rend une structure. Les cas tordus de ce soir deviennent des tests unitaires,
pas des régressions à re-découvrir.

`lib/matchsheet/types.ts` reste **neutre** — ni `'use server'` ni
`'use client'`, aucun import Prisma — puisqu'il est importé des deux côtés.

Deux actions serveur distinctes :

- `planMatchdayImport(competitionId, matchday, rawText)` → lecture seule,
  renvoie le plan et les alertes. **N'écrit rien.**
- `applyMatchdayImport(plan)` → écrit dans une transaction, recalcule le
  classement via `updateStandings()`, puis `revalidatePublic(CACHE_TAGS.competitions)`.

## 8. Coût (règle n°2)

- **Portée** : un écran d'administration. Aucune page publique ne l'appelle.
- **Fréquence** : quelques appels par journée de championnat, soit deux ou
  trois fois par mois. Le parsing ne touche pas la base ; seules la résolution
  et l'application le font, dans une fenêtre d'éveil déjà ouverte par la
  navigation dans le dashboard.
- **Défaillance** : un contrôle qui échoue **bloque et s'affiche**. Pas de
  `try/catch` muet, pas d'écriture partielle — l'application passe par une
  transaction unique.

## 9. Sécurité

`requireAdmin()` sur les deux actions. Validation Zod du plan à l'entrée de
`applyMatchdayImport` : le plan qui revient du client est une donnée
utilisateur, pas une structure de confiance — on revalide les identifiants de
match et de club contre la compétition ciblée avant d'écrire. Taille du texte
collé plafonnée (64 Ko suffisent très largement pour une journée). Aucune
évaluation dynamique : le parseur est à base d'expressions régulières sur des
lignes normalisées.

## 10. Checklist d'implémentation applicable

Extraite de la checklist permanente du projet, restreinte à ce qui concerne un
écran d'administration :

- `getDashboardContext()` sur la page, `loading.tsx`, `useTransition` pendant
  le calcul du plan.
- Touch targets ≥ 48 px et gap ≥ 24 px sur les boutons de choix (rattacher /
  créer / nom libre) : ils sont nombreux et serrés, c'est le piège de cet écran.
- `<label htmlFor>` sur la zone de collage ; `aria-label` sur les boutons
  icône ; hiérarchie de titres sans saut ; focus visible conservé.
- Responsive 360 / 720 / 1024 — le plan est un tableau dense, il faut
  `ResponsiveTableScroll` et une variante empilée en dessous de 720.
- Pas de Tailwind générique : styles inline avec les tokens LRH, corners 0-4 px,
  accent vertical sur les blocs d'alerte (rouge bloquant / or avertissement).
- `errorMessage()` dans tout nouveau `catch`. `tsc --noEmit` propre.

## 11. Découpage proposé

1. **Lot 1 — le parseur seul.** `parse.ts` + tests sur les textes réels de J01
   et J02. Livrable vérifiable sans UI ni base. C'est là que vit la difficulté.
2. **Lot 2 — le plan en lecture seule.** L'écran affiche ce qu'il ferait, sans
   bouton d'écriture. Permet de confronter l'outil à une vraie feuille sans
   aucun risque pour la prod.
3. **Lot 3 — l'application.** Transaction, classement, purge du cache, audit.
4. **Lot 4 (optionnel) — création des joueurs manquants** depuis l'écran, si le
   lot 2 montre que c'est fréquent.

Les lots 1 et 2 ne peuvent rien casser : règle n°1, on met en ligne quelque
chose d'inoffensif avant quelque chose qui écrit.

## 12. Ce qui restera manuel après

La transcription de la feuille papier, et les arbitrages de §5. C'est
volontaire : ces cas-là demandent de savoir qui a joué, pas de savoir lire.

---

Voir aussi : `scripts/salle-2026-j02.mjs` (l'implémentation jetable dont ce
cadrage est la généralisation), `lib/actions/matchEvents.ts` (le CRUD unitaire
existant), `lib/cache/public.ts` et `app/api/revalidate/route.ts` (la
fraîcheur des pages publiques).
