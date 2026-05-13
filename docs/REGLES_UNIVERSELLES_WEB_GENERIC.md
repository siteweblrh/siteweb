# Regles Universelles - Developpement Web Moderne (Version Generique)

> Guide de reference extrait de +50 sessions de developpement en production.
> **Version generique** : applicable a tout projet web, quel que soit le framework ou la stack technique.
> Aucune dependance a un framework, ORM, ou hebergeur specifique.
> Version 1.0 — 24/03/2026

---

## Table des matieres

1. [Securite](#1-securite)
2. [RGPD & Conformite](#2-rgpd--conformite)
3. [Responsivite & Mobile](#3-responsivite--mobile)
4. [UX / UI](#4-ux--ui)
5. [Accessibilite (a11y)](#5-accessibilite-a11y)
6. [Performance](#6-performance)
7. [CSS & Styling](#7-css--styling)
8. [Formulaires & Inputs](#8-formulaires--inputs)
9. [Navigation](#9-navigation)
10. [Gestion des Erreurs](#10-gestion-des-erreurs)
11. [Integrite des Donnees](#11-integrite-des-donnees)
12. [Architecture & Scalabilite](#12-architecture--scalabilite)
13. [Maintenabilite & DX](#13-maintenabilite--dx)
14. [Internationalisation (i18n)](#14-internationalisation-i18n)
15. [Observabilite & Monitoring](#15-observabilite--monitoring)
16. [SEO & Meta](#16-seo--meta)
17. [Tests & Qualite](#17-tests--qualite)
18. [Deploiement & DevOps](#18-deploiement--devops)
19. [Incident Response](#19-incident-response)
20. [Checklist Pre-Production](#20-checklist-pre-production)

---

## 1. Securite

### 1.1 Authentification

- **Hashage des mots de passe** : Argon2id avec PEPPER externe (variable d'environnement, jamais en base)
  - En environnement serverless (fonctions cloud a memoire limitee) : `memoryCost: 2^14` (16 MB), `timeCost: 3`, `parallelism: 1`
  - Sur serveur dedie : `memoryCost: 2^16` (64 MB), `parallelism: 4`
  - **Piege vecu** : 64 MB de memoire cause des OOM (Out of Memory) sur les conteneurs serverless limites a 128 MB
- **Protection brute-force** : compteur `loginAttempts` + verrouillage temporaire (`lockUntil`)
  - Regle recommandee : 5 echecs = 15 min de blocage
- **CAPTCHA** : Cloudflare Turnstile ou hCaptcha. Bypass automatique en mode developpement
- **Secret JWT/Session** : minimum 32 caracteres, genere avec `openssl rand -base64 32`
- **MFA (Multi-Factor Authentication)** : prevoir l'integration TOTP (Google Authenticator, Authy) pour les comptes admin et les operations sensibles (suppression de donnees, export massif)
- **Session management** :
  - Invalider les sessions cote serveur lors du changement de mot de passe
  - Expiration des sessions inactives (30 min recommande pour les apps sensibles)
  - Limiter le nombre de sessions simultanees par utilisateur

### 1.2 En-tetes HTTP de Securite (OBLIGATOIRES)

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.*.com; frame-ancestors 'none';
X-DNS-Prefetch-Control: off
X-Permitted-Cross-Domain-Policies: none
```

**CSP avancee** :

- Utiliser des nonces (`'nonce-{random}'`) plutot que `'unsafe-inline'` pour les scripts
- Ajouter `report-uri` ou `report-to` pour monitorer les violations CSP
- Commencer en mode `Content-Security-Policy-Report-Only` puis passer en mode bloquant

### 1.3 Validation des Entrees

- **Validation schema (Zod, Yup, Joi, ou equivalent) sur TOUTES les entrees** cote client ET serveur
- Ne jamais faire confiance aux donnees du client
- Patterns recommandes :
  - Texte : `.trim()`, longueur min/max
  - Montants : positif, max raisonnable (999 999 999)
  - Dates : regex ou parseur strict
  - IDs : UUID ou format attendu
  - HTML/Rich text : sanitiser avec DOMPurify ou sanitize-html avant stockage
  - URLs : valider le protocole (`https://` uniquement), interdire `javascript:`, `data:`

### 1.4 Upload de Fichiers

- **Whitelist MIME** : `['image/jpeg', 'image/png', 'image/webp', 'application/pdf']`
- **Verification double** : verifier le MIME ET les magic bytes (le MIME seul est falsifiable)
- **Prevention path traversal** : sanitiser le nom de fichier (supprimer `../`, `/`, `\`, caracteres speciaux)
- **Taille max** : definir une limite explicite (ex: 5 MB)
- **Chemin de stockage** : inclure un identifiant unique (timestamp, UUID)
- **Scan antivirus** : sur les fichiers uploadables par des utilisateurs externes (ClamAV ou service cloud)
- **Ne jamais servir les uploads depuis le meme domaine** que l'application (utiliser un sous-domaine ou CDN)

### 1.5 Rate Limiting

- Implementer sur toutes les routes POST/PUT/DELETE
- Recommandation : 100 req/min par IP pour les routes normales
- Routes sensibles (login, reset password, signup) : 5-10 req/min par IP
- Stack : Redis distribue ou equivalent avec fallback in-memory
- Retourner les headers standard : `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`

### 1.6 CORS (Cross-Origin Resource Sharing)

```javascript
// Configuration serveur ou middleware
const allowedOrigins = [
  'https://monapp.com',
  'https://admin.monapp.com',
  process.env.NODE_ENV === 'development' && 'http://localhost:3000',
].filter(Boolean)

// INTERDIT : Access-Control-Allow-Origin: *  (sauf pour les API publiques sans auth)
// OBLIGATOIRE : whitelist explicite des origines autorisees
```

- **Jamais `*`** sur les routes authentifiees
- Configurer `Access-Control-Allow-Methods` au strict minimum
- Configurer `Access-Control-Allow-Headers` : n'autoriser que les headers necessaires
- `Access-Control-Max-Age: 86400` pour cacher les preflight requests

### 1.7 CSRF (Cross-Site Request Forgery)

- **Frameworks modernes** : beaucoup incluent une protection CSRF native (verifier la documentation de votre framework)
- **API Routes sans protection native** : implementer une protection manuelle :
  - Double Submit Cookie pattern OU
  - Synchronizer Token pattern OU
  - Verifier le header `Origin`/`Referer`
- **SameSite cookies** : `SameSite=Lax` minimum, `SameSite=Strict` pour les operations sensibles

```javascript
// Pattern de verification CSRF pour API Routes
function verifyCsrf(req) {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const allowed = process.env.APP_URL
  return origin === allowed || referer?.startsWith(allowed + '/') || false
}
```

### 1.8 Sanitisation XSS

- **Toute donnee affichee provenant de la base doit etre echappee** (la plupart des frameworks modernes le font par defaut dans les templates)
- **Insertion de HTML brut** (`innerHTML`, `v-html`, `dangerouslySetInnerHTML`, etc.) : INTERDIRE sauf avec sanitisation prealable
- **Contenu riche (WYSIWYG, Markdown)** : sanitiser a l'entree ET a la sortie

```javascript
import DOMPurify from 'isomorphic-dompurify'

// Sanitiser AVANT stockage en base
const cleanHtml = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target'],
})
```

### 1.9 Rotation & Gestion des Secrets

- **Rotation des secrets** : planifier une rotation tous les 90 jours pour les secrets critiques (JWT secret, API keys)
- **Procedure de rotation** :
  1. Generer le nouveau secret
  2. Deployer avec support du nouveau ET de l'ancien (grace period)
  3. Basculer les clients vers le nouveau
  4. Supprimer l'ancien apres 24h
- **Secrets differents par environnement** : dev, staging, production — JAMAIS les memes
- **Vault** : pour les projets critiques, utiliser un gestionnaire de secrets (Doppler, HashiCorp Vault, AWS Secrets Manager)

### 1.10 Audit des Dependances

```bash
# A chaque PR ou en CI/CD
npm audit --audit-level=high
# OU
npx auditjs ossi  # pour les vulns connues

# Automatisation
# - Dependabot (GitHub) : PRs automatiques pour les vulns
# - Snyk : scan profond des dependances transitives
# - Socket.dev : detection des supply chain attacks
```

- **Ne JAMAIS ignorer** un audit avec des vulns `high` ou `critical`
- **Lockfile** : toujours commiter le fichier de verrouillage des dependances (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `Gemfile.lock`, `poetry.lock`, etc.)
- **Verifier les licenses** : pas de licence GPL dans un projet commercial SaaS
- **Subresource Integrity (SRI)** : pour tout script charge depuis un CDN externe

```html
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8w"
  crossorigin="anonymous"
></script>
```

### 1.11 Protection des Donnees (basique)

- Fichiers sensibles (medical, bancaire) dans un bucket PRIVE
- Ne JAMAIS logger de donnees sensibles dans les logs d'audit
- Liste de champs sensibles a redacter automatiquement : `['password', 'rib', 'iban', 'medicalInfo', 'token', 'secret', 'creditCard', 'ssn']`

```javascript
// Pattern de redaction automatique pour les logs
const SENSITIVE_FIELDS = ['password', 'rib', 'iban', 'medicalInfo', 'token', 'secret', 'creditCard', 'ssn']

function redactSensitive(obj) {
  const redacted = { ...obj }
  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      redacted[key] = '[REDACTED]'
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitive(redacted[key])
    }
  }
  return redacted
}
```

### 1.12 Minimisation des Donnees API (OWASP)

- **Ne JAMAIS retourner l'objet complet de la base au client** : toujours selectionner explicitement les colonnes retournees (`SELECT col1, col2` plutot que `SELECT *`)
- Les requetes de liste doivent etre PLUS restrictives que les requetes de detail
- Exclure les champs lourds (JSON, blobs) et les relations inutiles
- **Enumeration prevention** : ne pas reveler si un email existe deja (message generique "Si ce compte existe, un email a ete envoye")

### 1.13 Variables d'Environnement

- `.env` doit etre encode en UTF-8 (UTF-16 cause des erreurs silencieuses)
- Les fichiers `.env.local` ont priorite : attention aux valeurs obsoletes
- Ne JAMAIS commiter de fichiers contenant des secrets
- Verifier la coherence des secrets entre local et production
- **Validation au demarrage** : verifier que toutes les variables requises sont presentes

```javascript
// Valider les variables d'environnement au demarrage de l'application
const requiredEnvVars = ['DATABASE_URL', 'AUTH_SECRET', 'APP_URL']

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variable d'environnement manquante : ${envVar}`)
  }
}

// Avec un schema de validation (Zod, Joi, etc.) pour plus de rigueur :
// const envSchema = z.object({
//   DATABASE_URL: z.string().url(),
//   AUTH_SECRET: z.string().min(32),
//   APP_URL: z.string().url(),
// })
// envSchema.parse(process.env)
```

### 1.14 Cookies & Sessions

- Limiter la taille du JWT : ne pas stocker d'images base64 ou de gros objets
- Cookies sur domaine wildcard uniquement en production
- **Piege vecu** : un `user.image` en base64 dans le JWT cause "Request Header Too Large" (431)
- **Flags obligatoires** : `HttpOnly`, `Secure`, `SameSite=Lax` (ou `Strict`)
- **Prefixe** : utiliser `__Host-` pour les cookies critiques (force HTTPS + meme domaine)

---

## 2. RGPD & Conformite

> **Cette section est OBLIGATOIRE pour tout projet deploye dans l'UE ou traitant des donnees de residents UE.**

### 2.1 Principes Fondamentaux

| Principe RGPD                   | Implementation technique                                    |
| ------------------------------- | ----------------------------------------------------------- |
| **Liceite**                     | Base legale documentee pour chaque traitement               |
| **Minimisation**                | Selection explicite des colonnes, pas de collecte excessive |
| **Limitation de finalite**      | Donnees utilisees uniquement pour l'objectif declare        |
| **Exactitude**                  | Permettre la modification par l'utilisateur                 |
| **Limitation de conservation**  | TTL defini pour chaque type de donnee                       |
| **Integrite & confidentialite** | Chiffrement, acces restreint, audit trail                   |

### 2.2 Bases Legales par Traitement

Documenter pour CHAQUE feature qui collecte des donnees :

| Traitement                  | Base legale       | Justification                                    |
| --------------------------- | ----------------- | ------------------------------------------------ |
| Inscription / compte        | Contrat           | Necessaire pour fournir le service               |
| Facturation                 | Obligation legale | Conservation comptable obligatoire               |
| Newsletter                  | Consentement      | Opt-in explicite requis                          |
| Analytics                   | Interet legitime  | Amelioration du service (anonymiser si possible) |
| Cookies fonctionnels        | Contrat           | Necessaires au fonctionnement                    |
| Cookies analytics/marketing | Consentement      | Bandeau obligatoire                              |
| Logs de securite            | Interet legitime  | Protection contre la fraude                      |

### 2.3 Bandeau de Consentement Cookies

```javascript
// Regles du bandeau de consentement
const cookieConsentRules = {
  // Cookies STRICTEMENT necessaires : pas de consentement requis
  necessary: ['session_id', 'csrf_token', 'locale'],

  // Cookies analytics : consentement REQUIS AVANT depot
  analytics: ['_ga', '_gid', '_gat'],

  // Cookies marketing : consentement REQUIS AVANT depot
  marketing: ['_fbp', '_gcl_aw'],
}
```

- **INTERDIRE** le depot de cookies analytics/marketing AVANT consentement explicite
- Le refus doit etre aussi simple que l'acceptation (pas de dark patterns)
- Stocker le choix de l'utilisateur (cookie de preference, 13 mois max)
- Permettre la modification du choix a tout moment
- **Piege** : GTM charge souvent des trackers avant le consentement — configurer le "Consent Mode"

### 2.4 Durees de Conservation

| Type de donnee              | Duree max                     | Base legale                                   |
| --------------------------- | ----------------------------- | --------------------------------------------- |
| Compte utilisateur actif    | Duree du contrat              | Contrat                                       |
| Compte inactif              | 3 ans apres derniere activite | Interet legitime                              |
| Donnees de facturation      | 10 ans                        | Obligation legale (Code de commerce)          |
| Logs de connexion           | 1 an                          | Obligation legale (LCEN)                      |
| Logs d'audit applicatif     | 6 mois - 1 an                 | Interet legitime                              |
| Donnees de paiement (CB)    | Ne JAMAIS stocker             | PCI-DSS — deleguer au prestataire de paiement |
| Cookies de consentement     | 13 mois                       | Recommandation CNIL                           |
| Donnees de contact prospect | 3 ans apres dernier contact   | Interet legitime                              |
| Backup de base de donnees   | 90 jours glissants            | Interet legitime                              |

### 2.5 Droits des Personnes (Implementation)

#### Droit d'acces (Article 15)

```javascript
// Endpoint : GET /api/user/data-export
// Delai legal : 30 jours max
// Format : JSON + CSV lisible
async function exportUserData(userId) {
  const userData = await db.query('SELECT * FROM users WHERE id = $1', [userId])
  // Inclure egalement toutes les tables liees (commandes, preferences, etc.)
  // Retourner en JSON structure + CSV telechargeables
  return { json: userData, csv: convertToCsv(userData) }
}
```

#### Droit a l'effacement (Article 17)

- **Soft delete INSUFFISANT** : prevoir une procedure de suppression reelle
- **Procedure en 3 etapes** :
  1. Anonymisation immediate des donnees personnelles (remplacer par `[SUPPRIME]`)
  2. Conservation des donnees financieres/legales (obligations comptables)
  3. Purge complete apres expiration de la duree legale
- **Cascade** : supprimer/anonymiser dans TOUTES les tables liees
- **Backups** : les backups seront ecrases par la rotation naturelle (90 jours)

```sql
-- Exemple d'anonymisation en SQL
BEGIN;

-- Anonymiser le profil
UPDATE users SET
  email = CONCAT('deleted-', id, '@anonymized.local'),
  name = '[SUPPRIME]',
  phone = NULL,
  avatar = NULL
WHERE id = :userId;

-- Supprimer les donnees non-requises legalement
DELETE FROM user_preferences WHERE user_id = :userId;
DELETE FROM notifications WHERE user_id = :userId;

-- Log de la suppression (sans donnees personnelles)
INSERT INTO audit_log (action, entity_id, entity_type)
VALUES ('GDPR_ERASURE', :userId, 'USER');

COMMIT;
```

#### Droit a la portabilite (Article 20)

- Export en format JSON structure + CSV lisible
- Inclure TOUTES les donnees fournies par l'utilisateur
- Exclure les donnees derivees/calculees et les donnees d'autres utilisateurs

#### Droit d'opposition (Article 21)

- Lien de desinscription dans CHAQUE email marketing
- Mecanisme d'opt-out pour les communications non-essentielles
- Respecter les listes d'opposition (Bloctel pour la France)

### 2.6 Privacy by Design

- **Minimisation a la conception** : ne collecter que ce qui est strictement necessaire pour la feature
- **Pseudonymisation** : utiliser des UUIDs plutot que des identifiants naturels (email, nom)
- **Chiffrement au repos** : pour les donnees sensibles (medicales, bancaires) — AES-256
- **Chiffrement en transit** : HTTPS obligatoire (TLS 1.2 minimum, TLS 1.3 recommande)
- **Separation des donnees** : les donnees sensibles dans des tables/buckets separes avec acces restreint
- **Anonymisation des donnees de dev** : ne JAMAIS utiliser de vraies donnees en dev/staging

### 2.7 Notification de Breach (Article 33-34)

**Procedure obligatoire :**

1. **Detection** : alerting automatise (voir section Observabilite)
2. **Evaluation** : determiner la gravite (donnees concernees, nombre de personnes)
3. **Notification CNIL** : dans les **72 heures** si risque pour les droits des personnes
4. **Notification utilisateurs** : sans delai excessif si risque eleve
5. **Documentation** : registre des violations (obligatoire meme sans notification)

**Template de notification CNIL :**

- Nature de la violation
- Categories et nombre approximatif de personnes concernees
- Consequences probables
- Mesures prises ou envisagees

### 2.8 Sous-traitants (Article 28)

- **DPA (Data Processing Agreement)** obligatoire avec chaque sous-traitant :

| Sous-traitant        | Type de donnees            | Localisation       | DPA                 |
| -------------------- | -------------------------- | ------------------ | ------------------- |
| Hebergeur            | Donnees applicatives, logs | EU si possible     | A verifier          |
| Provider DB          | Donnees applicatives       | EU si configure    | A verifier          |
| Prestataire paiement | Paiements                  | US + EU            | Inclus dans les CGU |
| Error tracking       | Stack traces, user context | Verifier la region | A verifier          |
| Service email        | Emails, adresses           | Verifier la region | A verifier          |
| CDN / WAF            | Trafic, IP                 | Global             | A verifier          |

- **Clause de localisation** : privilegier les regions EU pour le stockage
- **Transferts hors UE** : necessitent des Clauses Contractuelles Types (CCT) ou une decision d'adequation

### 2.9 Registre des Traitements (Article 30)

Maintenir un fichier `REGISTRE_TRAITEMENTS.md` ou equivalent :

```markdown
| #   | Traitement  | Finalite              | Base legale       | Donnees            | Duree         | Sous-traitant          |
| --- | ----------- | --------------------- | ----------------- | ------------------ | ------------- | ---------------------- |
| 1   | Inscription | Fourniture du service | Contrat           | email, nom, mdp    | Duree contrat | DB provider, hebergeur |
| 2   | Facturation | Obligation comptable  | Obligation legale | factures, montants | 10 ans        | Prestataire paiement   |
| 3   | Analytics   | Amelioration service  | Interet legitime  | pages vues, duree  | 26 mois       | Service analytics      |
```

### 2.10 Mentions Legales & Politique de Confidentialite

Pages OBLIGATOIRES :

- **Mentions legales** : identite, hebergeur, directeur de publication
- **Politique de confidentialite** : traitements, droits, contact DPO
- **CGU/CGV** : conditions d'utilisation et de vente
- **Politique cookies** : detail des cookies, finalites, durees

---

## 3. Responsivite & Mobile

### 3.1 Regles Fondamentales

- **Mobile-first** : commencer par un layout en colonne puis passer en rangee/grille sur les ecrans plus larges
- **Tous les inputs en largeur 100%** sur mobile
- **ZERO scroll horizontal** : jamais, nulle part, sous aucun pretexte
- Modaux : `overflow-y: auto; overflow-x: hidden;` sur le corps, `max-height: 85vh` ou `max-height: 95vh`

### 3.2 Prevention du Zoom iOS (CRITIQUE)

> C'est le bug mobile #1 le plus frequent et le plus insidieux.

- **TOUS les `<input>`, `<select>`, `<textarea>` doivent avoir une taille de police de 16px minimum**
- Une police inferieure a 16px (ex: 14px) declenche un auto-zoom sur iOS Safari au focus
- Ce zoom cree un scroll horizontal permanent meme apres defocus
- **Solution** : audit systematique de tous les composants de formulaire
- Aussi ajouter `min-height: 44px` sur tous les inputs

```css
/* INTERDIT */
input {
  font-size: 14px;
}

/* OBLIGATOIRE */
input {
  font-size: 16px;
}
```

### 3.3 Touch Targets (Apple HIG)

- **Minimum 44x44px** pour TOUS les elements interactifs (boutons, liens, icones cliquables)
- CSS : `min-height: 44px; min-width: 44px; padding: 12px;`
- Inputs : `min-height: 44px` ou `padding: 10px 12px` minimum

### 3.4 Clavier Mobile Optimise

| Type de champ | Attributs HTML                                          |
| ------------- | ------------------------------------------------------- |
| Montant       | `type="number" inputMode="decimal" step="0.01" min="0"` |
| Telephone     | `type="tel" inputMode="tel"`                            |
| Email         | `type="email" inputMode="email"`                        |
| Recherche     | `type="search" inputMode="search"`                      |
| URL           | `type="url" inputMode="url"`                            |

### 3.5 Carrousels & Cards Swipables

- **Largeur minimale card : 320px** (`flex: 0 0 320px`)
- Padding interne : `padding: 20px` minimum
- Taille des icones : 24px+ pour la lisibilite
- Valeurs principales : `font-size: 24px` minimum (idealement 30px)
- Gap entre items : `gap: 16px`

### 3.6 Date/Time Pickers sur Mobile

- **NE PAS utiliser `showPicker()`** : non fiable sur iOS/Android
- **Solution prouvee** : input natif transparent (`opacity: 0`) superpose sur toute la zone du bouton (`position: absolute; inset: 0`)
- Le tap mobile touche directement l'input natif et ouvre le picker systeme
- **Parsing de dates** : utiliser une librairie de dates (date-fns, dayjs, luxon) et NON `new Date("YYYY-MM-DD")` qui parse en UTC et cause des erreurs de jour (off-by-one)

### 3.7 Modaux sur Mobile

```css
/* Wrapper du modal */
.modal-wrapper {
  overflow: hidden; /* empeche le scroll horizontal page */
}

/* Corps du modal */
.modal-body {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 85vh;
}

/* Zone de preview interne */
.preview-zone {
  overflow-y: auto;
  min-height: 0;
}

/* Boutons d'action : sticky ou dans le header (jamais caches par le scroll) */
```

### 3.8 Compteurs & Stats

- Les rangees de compteurs (Total A / Total B / Solde) doivent passer en colonne sur mobile
- Ne jamais forcer une rangee horizontale de 3+ elements sur petit ecran

### 3.9 Direction des Dropdowns

- Les dropdowns proches du bas de page doivent s'ouvrir vers le haut
- Ajouter `max-height: 200px; overflow-y: auto` pour les longues listes

### 3.10 Navigation Mobile

- Menu burger pour les sections secondaires (admin, parametres)
- Cacher les colonnes secondaires des tableaux sur mobile
- Prevoir un bouton "voir details" (icone oeil) ouvrant un modal
- FAB (Floating Action Button) pour les actions principales

### 3.11 Breakpoints & Strategie Responsive

| Breakpoint | Usage                                          |
| ---------- | ---------------------------------------------- |
| < 640px    | Mobile — layout colonne, navigation simplifiee |
| 640px      | Grand mobile / petit tablet — grids 2 colonnes |
| 768px      | Tablet — sidebar visible, grids 2-3 colonnes   |
| 1024px     | Desktop — layout complet, sidebar fixe         |
| 1280px     | Grand ecran — espacement genereux              |
| 1536px     | Ultra-large — largeur max du contenu           |

- **Tester sur** : iPhone SE (375px), iPhone 14 (390px), Galaxy S8 (360px), iPad (768px), Desktop (1440px)
- **Largeur max du contenu** : `max-width: 1280px` pour eviter les lignes trop longues

### 3.12 Container Queries (CSS moderne)

```css
/* Plus pertinent que les media queries pour les composants reutilisables */
.card-wrapper {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
}
```

- Utiliser les container queries pour les composants qui peuvent etre places dans des contextes de largeur differente (sidebar, modal, page pleine)

### 3.13 Tableaux Responsifs

| Strategie                                  | Quand l'utiliser                                   |
| ------------------------------------------ | -------------------------------------------------- |
| **Scroll horizontal** (`overflow-x: auto`) | Tableaux de donnees denses (comptabilite, exports) |
| **Card view sur mobile**                   | Listes d'entites (membres, evenements)             |
| **Colonnes cachees** + bouton detail       | Tableaux mixtes (garder 2-3 colonnes cles)         |
| **Accordeon**                              | Tableau avec details expandables par ligne         |

```html
<!-- Pattern card view mobile -->
<div class="table-desktop"><!-- Tableau desktop, masque sur mobile --></div>
<div class="cards-mobile"><!-- Cards mobile, masque sur desktop --></div>

<style>
  @media (max-width: 767px) {
    .table-desktop {
      display: none;
    }
  }
  @media (min-width: 768px) {
    .cards-mobile {
      display: none;
    }
  }
</style>
```

### 3.14 Images Responsives

```html
<!-- Formats modernes avec fallback -->
<picture>
  <source srcset="/img/hero.avif" type="image/avif" />
  <source srcset="/img/hero.webp" type="image/webp" />
  <img
    src="/img/hero.jpg"
    alt="..."
    loading="lazy"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    srcset="/img/hero-400.jpg 400w, /img/hero-800.jpg 800w, /img/hero-1200.jpg 1200w"
  />
</picture>
```

- **Formats** : AVIF > WebP > JPEG (par ordre de preference)
- **Lazy loading** : `loading="lazy"` sur toutes les images below-the-fold
- **`sizes`** : TOUJOURS specifier pour eviter le chargement de tailles inutiles

### 3.15 Print Stylesheet

```css
@media print {
  /* Masquer les elements non-imprimables */
  nav,
  .sidebar,
  .fab,
  .toast,
  button,
  .no-print {
    display: none !important;
  }

  /* Optimiser pour l'impression */
  body {
    font-size: 12pt;
    color: #000;
    background: #fff;
  }
  a {
    text-decoration: underline;
  }
  a[href]::after {
    content: ' (' attr(href) ')';
    font-size: 0.8em;
  }

  /* Eviter les coupures malheureuses */
  h1,
  h2,
  h3 {
    page-break-after: avoid;
  }
  table,
  figure {
    page-break-inside: avoid;
  }
}
```

- Indispensable pour : factures, recus, rapports, fiches membres
- Tester l'apercu d'impression (`Ctrl+P`) sur les pages critiques

---

## 4. UX / UI

### 4.1 Aide Contextuelle (OBLIGATOIRE pour chaque fonctionnalite)

Chaque nouvelle fonctionnalite DOIT inclure :

1. **Tooltips** sur les termes techniques ou non-evidents
2. **Etat vide (Empty State)** si la page peut etre vide : icone + message descriptif + CTA
3. **Onboarding checklist** si c'est une action cle pour le nouvel utilisateur
4. **Tour guide** si c'est une fonctionnalite majeure du dashboard

### 4.2 Etats Vides

- Utiliser un composant reutilisable `EmptyState` (pas des divs ad-hoc)
- Inclure : icone contextuelle, message descriptif, CTA adapte (creation vs reset de filtre)
- Chaque page listant des donnees doit gerer l'etat vide

### 4.3 Onboarding & Premier Usage

- **Wizard de configuration** : modal non-fermable pour les etapes critiques de setup
- **Checklist de progression** : widget dashboard montrant l'avancement
- **Tour guide** : spotlight + tooltips pour le premier acces
- **Modal d'aide** : FAQ accordion accessible via un bouton "?"

### 4.4 Persistance des Preferences (localStorage)

- Sauvegarder les preferences UX : tour complete, checklist masquee, derniere selection utilisee
- Nommer les cles avec un prefixe unique au projet : `monprojet_tour_completed`
- **Ne JAMAIS stocker de donnees sensibles dans localStorage** (accessible par XSS)

### 4.5 Mot de passe

- Icone oeil pour afficher/masquer le mot de passe sur TOUS les champs password
- Indicateur de force du mot de passe sur les formulaires de creation

### 4.6 Suggestions & Predictions

- Indicateur visuel clair quand une valeur est suggeree vs saisie manuellement
- Couleur differente (vert) + icone check pour la suggestion selectionnee
- Bouton "Masquer les suggestions" pour les utilisateurs avances
- Message de confirmation si l'utilisateur override une suggestion

### 4.7 Strategie CTA (Funnel)

- Header + Hero : CTA vers la page de tarifs/offre (l'utilisateur doit d'abord comprendre)
- Bas de page : CTA vers l'inscription (l'utilisateur est informe apres le scroll)
- Page d'inscription peut rediriger vers les tarifs si necessaire

### 4.8 Design Tokens & Systeme de Design

```css
/* Variables CSS centralisees — source unique de verite */
:root {
  /* Couleurs */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-bg: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;

  /* Spacing scale (base 4px) */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}
```

- Utiliser les design tokens pour TOUTES les valeurs visuelles (couleurs, spacing, radius)
- Permet le theming (dark mode, white-label) sans toucher aux composants

### 4.9 Dark Mode

```css
/* Variables dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f172a;
    --color-bg-secondary: #1e293b;
    --color-text: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-border: #334155;
  }
}

/* OU via classe (toggle manuel) */
.dark {
  --color-bg: #0f172a;
  /* ... */
}
```

- **Strategie recommandee** : respecter `prefers-color-scheme` par defaut + toggle manuel stocke en localStorage
- **Pieges** :
  - Les images/icones doivent avoir des variantes dark (ou utiliser `filter: invert()` pour les icones simples)
  - Les ombres sont invisibles sur fond sombre — utiliser des bordures ou des fonds legerement plus clairs
  - Les graphiques/charts doivent adapter leurs couleurs
  - Tester le contraste en dark mode (les regles WCAG s'appliquent aussi)

### 4.10 Skeleton Loaders & Etats de Chargement

```html
<!-- Pattern de skeleton loader reutilisable -->
<style>
  .skeleton {
    background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>

<div class="card-skeleton">
  <div class="skeleton" style="height: 24px; width: 75%;"></div>
  <div class="skeleton" style="height: 16px; width: 50%; margin-top: 12px;"></div>
  <div class="skeleton" style="height: 40px; width: 100%; margin-top: 12px;"></div>
</div>
```

| Etat                   | Pattern                                              |
| ---------------------- | ---------------------------------------------------- |
| **Chargement initial** | Skeleton loader (jamais un spinner plein ecran)      |
| **Action en cours**    | Spinner inline sur le bouton + `disabled`            |
| **Succes**             | Toast vert + animation subtile                       |
| **Erreur**             | Toast rouge + message actionnable                    |
| **Optimistic update**  | Mettre a jour l'UI immediatement, rollback si erreur |

### 4.11 Micro-interactions & Feedback

- **Toast notifications** : succes (vert, 3s), erreur (rouge, persistant jusqu'a dismiss), info (bleu, 5s)
- **Optimistic updates** : pour les actions frequentes (like, toggle, reorder)
- **Transitions de page** : fade ou slide subtil (150-250ms, pas plus)
- **Confirmation destructive** : modale avec re-saisie du nom pour les suppressions irreversibles
- **Debounce** : 300ms sur les recherches, 500ms sur les auto-saves

---

## 5. Accessibilite (a11y)

### 5.1 Contrastes (WCAG AA minimum)

- Texte orange sur fond blanc : utiliser une teinte foncee (ratio 4.9:1 minimum), pas de orange clair (3.7:1)
- Texte gris sur fond colore : utiliser un gris suffisamment fonce
- Liens : couleur suffisamment contrastee + soulignement au hover
- **Regle** : ratio minimum 4.5:1 pour le texte normal, 3:1 pour le texte large (18px+)
- **Outils de verification** : axe DevTools, Lighthouse, WebAIM Contrast Checker

### 5.2 Langue de la Page

```html
<!-- OBLIGATOIRE — Niveau WCAG A -->
<html lang="fr">
  <!-- Changement de langue inline -->
  <span lang="en">Terms of Service</span>
</html>
```

### 5.3 Skip Links

```html
<!-- Premier element du body — invisible sauf au focus clavier -->
<a href="#main-content" class="skip-link"> Aller au contenu principal </a>

<!-- ... navigation ... -->

<main id="main-content" tabindex="-1">
  <!-- contenu -->
</main>

<style>
  .skip-link {
    position: absolute;
    left: -9999px;
    z-index: 999;
    padding: 16px;
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .skip-link:focus {
    left: 16px;
    top: 16px;
  }
</style>
```

### 5.4 ARIA & Labels

- Tous les boutons icone-only doivent avoir `aria-label`
- Tous les inputs doivent avoir un `<label>` lie par `for`/`id`
- Inputs sans label visible : `aria-label` obligatoire
- **`aria-describedby`** pour les messages d'aide et d'erreur sous les inputs
- **`aria-required="true"`** sur les champs obligatoires
- **`aria-invalid="true"`** sur les champs en erreur

### 5.5 Live Regions (Notifications Dynamiques)

```html
<!-- Pour les toasts/notifications -->
<div role="status" aria-live="polite" aria-atomic="true">
  <!-- Le contenu insere ici sera lu par le lecteur d'ecran -->
</div>

<!-- Pour les erreurs urgentes -->
<div role="alert" aria-live="assertive">
  <!-- Message d'erreur insere dynamiquement -->
</div>
```

| Type                 | `aria-live` | `role`   | Usage                       |
| -------------------- | ----------- | -------- | --------------------------- |
| Notification succes  | `polite`    | `status` | Toast de confirmation       |
| Erreur de formulaire | `assertive` | `alert`  | Message d'erreur            |
| Compteur mis a jour  | `polite`    | `status` | Nombre de resultats, panier |
| Chargement           | `polite`    | `status` | "Chargement en cours..."    |

### 5.6 Gestion du Focus

```javascript
// Apres ouverture d'une modale : focus sur le premier element interactif
function onModalOpen(modalElement) {
  const firstFocusable = modalElement.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  if (firstFocusable) firstFocusable.focus()
}

// Apres fermeture : restaurer le focus sur l'element declencheur
function onModalClose(triggerElement) {
  if (triggerElement) triggerElement.focus()
}
```

- **Focus trap** dans les modales : Tab/Shift+Tab circule uniquement dans la modale
- **Apres soumission de formulaire en erreur** : focus sur le premier champ en erreur
- **Apres suppression d'un element dans une liste** : focus sur l'element precedent ou suivant

### 5.7 Mouvement Reduit

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 5.8 Navigation au Clavier

- Tous les elements interactifs doivent etre focusables (`tabindex`, `role="button"`)
- Ordre de tabulation logique (pas de `tabindex` > 0)
- Indicateur de focus visible (jamais `outline: none` sans remplacement)
- Palette de commandes (`Ctrl/Cmd + K`) pour navigation rapide
- **Echap** : ferme toujours le dernier overlay (modale, dropdown, drawer)
- **Entree/Espace** : active le bouton/lien focuse

### 5.9 Lecteurs d'Ecran

- Structure semantique : `<main>`, `<nav>`, `<header>`, `<footer>`, `<section>`
- Titres hierarchiques : h1 > h2 > h3 (pas de saut de niveau)
- Un seul `<h1>` par page
- Images decoratives : `alt=""` ou `aria-hidden="true"`
- Images informatives : `alt` descriptif
- **Icones** : `aria-hidden="true"` sur l'icone + texte accessible a cote, OU `aria-label` sur le conteneur
- **Tableaux de donnees** : `<th scope="col">` et `<th scope="row">` obligatoires

### 5.10 Alternatives pour Graphiques & Charts

```html
<!-- Toujours fournir une alternative textuelle -->
<figure role="img" aria-label="Evolution du chiffre d'affaires 2024-2026">
  <div class="chart-container"><!-- Librairie de graphiques --></div>
  <details>
    <summary>Voir les donnees en tableau</summary>
    <table>
      <thead>
        <tr>
          <th>Mois</th>
          <th>Montant</th>
        </tr>
      </thead>
      <tbody>
        <!-- donnees -->
      </tbody>
    </table>
  </details>
</figure>
```

### 5.11 Contraste Eleve & Forced Colors

```css
/* Support du mode contraste eleve (Windows) */
@media (forced-colors: active) {
  .btn {
    border: 2px solid ButtonText;
  }
  .card {
    border: 1px solid CanvasText;
  }
  /* Les couleurs custom sont ignorees — utiliser les system colors */
}
```

### 5.12 Checklist Accessibilite par Composant

| Composant | Requis                                                                       |
| --------- | ---------------------------------------------------------------------------- |
| Bouton    | `aria-label` si icone-only, focus visible, disabled state                    |
| Input     | `<label>` lie, `aria-describedby` pour l'aide, `aria-invalid` si erreur      |
| Modale    | Focus trap, Echap ferme, focus restore, `role="dialog"`, `aria-modal="true"` |
| Toast     | `role="status"` ou `role="alert"`, `aria-live`                               |
| Dropdown  | `role="listbox"`, fleches haut/bas, Echap ferme                              |
| Tableau   | `<th scope>`, `<caption>`, alternative texte si complexe                     |
| Onglets   | `role="tablist"`, `role="tab"`, `aria-selected`, fleches gauche/droite       |
| Accordeon | `aria-expanded`, `aria-controls`, Entree/Espace toggle                       |

---

## 6. Performance

### 6.1 Eliminer les Dependances Lourdes du Critical Path

- **Librairies d'animation lourdes (~40KB+)** : remplacer par des animations CSS sur les pages critiques (landing, etc.)
  - Keyframes CSS pour : float, shimmer, fade, cursor-blink
  - `grid-template-rows` CSS transition pour les accordeons
  - SVG gradients animes en CSS pur
- **Gain mesure** : FCP -300ms, LCP -200ms, TBT -250ms, bundle -40KB
- **Audit regulier** : utiliser un bundle analyzer (webpack-bundle-analyzer, rollup-plugin-visualizer, etc.) pour identifier les gros modules

### 6.2 Imports Dynamiques avec Placeholders CLS-Safe

- Sections lourdes de page : chargement dynamique (lazy loading de composants) avec placeholder de hauteur fixe
- Hauteur du placeholder doit correspondre au contenu reel pour eviter le CLS
- Exemple : `<div style="height: 600px"></div>` comme placeholder de chargement

### 6.3 Pagination Cote Serveur

- Toutes les tables avec potentiellement >50 lignes : pagination server-side
- Pattern : `OFFSET (page - 1) * pageSize LIMIT pageSize`
- **Cursor-based pagination** pour les listes infinites (plus performant que offset)

### 6.4 Compression d'Images (Client-Side)

```javascript
// Compression avant upload (librairie browser-image-compression ou equivalent)
import imageCompression from 'browser-image-compression'
const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true }
const compressed = await imageCompression(file, options)
```

### 6.5 Optimisation des Polices

- Utiliser le loader de polices de votre framework si disponible, sinon `@font-face` avec `font-display: swap`
- Limiter strictement les graisses : maximum 3-4 (ex: 400, 500, 600, 700)
- Preferer `font-display: swap`
- **Subsetting** : ne charger que les caracteres utilises (latin, latin-extended)

### 6.6 Prevention du Hydration Mismatch

- Ne JAMAIS utiliser `Math.random()` dans les composants rendus cote serveur (SSR)
- Utiliser un generateur d'IDs deterministe cote serveur (ex: `useId()` en React 18+, ou equivalent dans votre framework)
- Les avertissements d'hydratation indiquent un desaccord entre le rendu serveur et le rendu client — les traiter comme des bugs

### 6.7 Analytics & Tracking

- Scripts de tracking : les charger de facon differee (apres le chargement de la page)
- Eviter les scripts de tracking en double (gerer via un tag manager uniquement)
- Supprimer les animations decoratives inutiles

### 6.8 Attributs `sizes` sur les Images

- TOUJOURS ajouter `sizes` sur les elements `<img>` avec `srcset` pour eviter le chargement de tailles inutiles
- Exemple : `sizes="(max-width: 768px) 100vw, 50vw"`

### 6.9 Core Web Vitals — Cibles

| Metrique    | Cible   | Quoi mesurer                                    |
| ----------- | ------- | ----------------------------------------------- |
| **LCP**     | < 2.5s  | Temps d'affichage du plus grand element visible |
| **FID/INP** | < 200ms | Reactivite aux interactions utilisateur         |
| **CLS**     | < 0.1   | Stabilite visuelle (pas de saut de layout)      |
| **TTFB**    | < 800ms | Temps de reponse du serveur                     |
| **FCP**     | < 1.8s  | Premier affichage de contenu                    |

### 6.10 Caching & Mise en Cache

```
# Cache headers pour les assets statiques
Cache-Control: public, max-age=31536000, immutable

# Cache headers pour les API
Cache-Control: private, no-cache, no-store, must-revalidate
```

- **Assets statiques** : `immutable` + hash dans le nom de fichier
- **API responses** : `no-cache` par defaut, `stale-while-revalidate` pour les donnees peu volatiles
- **Pages semi-statiques** (landing, pricing) : generation statique incrementale si votre framework le supporte, ou cache CDN avec revalidation
- **Rendu serveur** : preferer le rendu serveur au chargement client + fetch pour les donnees initiales

---

## 7. CSS & Styling

### 7.1 Pattern Overflow pour Modaux

```css
/* Wrapper du modal */
.modal-wrapper {
  overflow: hidden;
}

/* Corps du modal */
.modal-body {
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 85vh;
}

/* Zone de preview interne */
.preview-zone {
  overflow-y: auto;
  min-height: 0;
}
```

### 7.2 Tailles de Police (Regles Strictes)

| Element                     | Taille minimum | CSS                         |
| --------------------------- | -------------- | --------------------------- |
| Inputs, selects, textareas  | 16px           | `font-size: 16px`           |
| Valeurs principales (cards) | 24px+          | `font-size: 24px` ou plus   |
| Icones interactives         | 24px+          | `width: 24px; height: 24px` |
| Texte de corps              | 14px-16px      | `font-size: 14px` ou `16px` |
| Labels de formulaire        | 14px           | `font-size: 14px`           |

### 7.3 Typographie Fluide (Responsive)

```css
/* Typographie fluide avec clamp() — s'adapte sans breakpoints */
h1 {
  font-size: clamp(1.75rem, 4vw + 1rem, 3rem);
} /* 28px → 48px */
h2 {
  font-size: clamp(1.5rem, 3vw + 0.75rem, 2.25rem);
} /* 24px → 36px */
h3 {
  font-size: clamp(1.25rem, 2vw + 0.5rem, 1.75rem);
} /* 20px → 28px */
body {
  font-size: clamp(0.875rem, 1vw + 0.5rem, 1.125rem);
} /* 14px → 18px */
```

- Preferer `clamp()` aux media queries pour la typographie
- **Unites** : `rem` pour les tailles de police, `em` pour les marges relatives au texte, `px` pour les bordures

### 7.4 Animations CSS (Remplacement de Libraries)

Preferer les animations CSS natives pour les effets simples :

```css
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

/* Accordeon sans JS */
.accordion-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}
.accordion-content.open {
  grid-template-rows: 1fr;
}
```

### 7.5 Gestion des Logos SVG

- Convertir les elements `<text>` SVG en `<path>` pour eviter la substitution de polices cross-browser
- Prevoir 3 variantes : inline (icone + texte), icone seule, logo complet
- Utilisation contextuelle : inline pour headers, icone pour sidebar/mobile

### 7.6 Scrollbar Subtile

```css
.scrollbar-thin {
  scrollbar-width: thin;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
```

---

## 8. Formulaires & Inputs

### 8.1 Coherence Visuelle Creation/Edition

- Memes classes CSS, padding, tailles de police, couleurs entre les modaux de creation et d'edition
- Structure : corps scrollable + footer fixe avec boutons d'action

### 8.2 Autocompletion d'Adresse

- Declencher a un seuil pertinent (ex: 5 chiffres pour un code postal francais)
- Auto-remplir si resultat unique
- Dropdown si plusieurs resultats
- **Toujours prevoir un fallback manuel** si l'API est indisponible

### 8.3 Hierarchie de Categories / Arborescences

- Inclure TOUTES les sous-categories du type correct
- Calculer l'indentation dynamiquement selon la profondeur reelle
- Trier par code naturel (hierarchique)

### 8.4 Mode Edition

- Indicateur visuel clair du mode actif (edition vs lecture)
- Texte du bouton change, banniere d'information apparait
- Validation met a jour l'entree existante (pas de creation en double)

### 8.5 Pattern de Validation

```javascript
// Exemple avec une librairie de validation schema (Zod, Yup, Joi, etc.)
const schema = {
  description: { type: 'string', required: true, maxLength: 500, trim: true },
  amount: { type: 'number', positive: true, max: 999_999_999 },
  date: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/ },
  categoryId: { type: 'string', format: 'uuid', optional: true },
  email: { type: 'string', format: 'email' },
}

// Exemple Zod (populaire en TypeScript) :
// const schema = z.object({
//   description: z.string().min(1, 'Requis').max(500).transform(s => s.trim()),
//   amount: z.number().positive('Doit etre positif').max(999_999_999),
//   date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format invalide'),
//   categoryId: z.string().uuid().optional(),
//   email: z.string().email('Email invalide'),
// })
```

### 8.6 Gestion des Erreurs de Formulaire

- **Afficher les erreurs sous chaque champ** (pas uniquement en haut du formulaire)
- **Focus automatique** sur le premier champ en erreur apres soumission
- **Validation en temps reel** pour les champs critiques (email unique, mot de passe fort)
- **Validation a la perte de focus** (`onblur`) pour les champs simples
- **Ne pas effacer le formulaire** en cas d'erreur serveur
- **Desactiver le bouton submit** pendant le chargement (eviter les doubles soumissions)

```html
<!-- Pattern anti-double soumission -->
<button type="submit" id="submitBtn">Enregistrer</button>

<script>
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('submitBtn')
    btn.disabled = true
    btn.textContent = 'Chargement...'
    try {
      await submitForm()
    } finally {
      btn.disabled = false
      btn.textContent = 'Enregistrer'
    }
  })
</script>
```

---

## 9. Navigation

### 9.1 Exclusions du Middleware d'Auth

> **Verifiez la convention de nommage du fichier middleware de votre framework.**
> Certains frameworks changent le nom ou l'emplacement de ce fichier entre les versions majeures.
> Si deux fichiers de middleware coexistent, le build peut echouer.

Ces routes doivent TOUJOURS etre accessibles sans authentification :

- `manifest.webmanifest` (Google Search Console en depend)
- `robots.txt`, `sitemap.xml`
- Assets statiques (JS/CSS bundles, images)
- `favicon.ico`
- Routes API publiques (webhooks)

### 9.2 Navigation Mobile

- Menu burger pour les sections secondaires (admin, parametres)
- FAB (Floating Action Button) centre pour l'action principale
- Bouton d'aide "?" accessible dans la barre superieure ET la navigation mobile

### 9.3 Palette de Commandes

- Raccourci clavier `Ctrl/Cmd + K` pour recherche/navigation rapide
- Indispensable pour les power users

### 9.4 Funnel de Conversion (CTA)

- **Haut de page** : CTA vers decouverte/tarifs
- **Bas de page** : CTA vers inscription (l'utilisateur a scroll = il est informe)
- Coherence des redirections dans le funnel

### 9.5 Breadcrumbs

- Afficher sur toutes les pages au-dela du niveau 1 de navigation
- Utile pour le SEO (Schema.org `BreadcrumbList`)
- Cacher sur mobile si l'espace est limite, mais conserver un bouton "Retour"

### 9.6 Deep Linking & Permalinks

- Chaque page, modale ou onglet important doit avoir une URL unique (partageable)
- Utiliser les query params ou les hash pour les onglets : `/settings?tab=security`
- Rediriger intelligemment apres login : `returnUrl` en query param

---

## 10. Gestion des Erreurs

### 10.1 Pattern d'Action Serveur

```javascript
async function myAction(data) {
  try {
    // 1. Verifier l'authentification
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Non autorise' }

    // 2. Valider les donnees
    const validated = validate(schema, data)
    if (!validated.success) return { success: false, error: validated.errors[0].message }

    // 3. Executer la logique metier
    const result = await db.query('INSERT INTO entities ...', validated.data)
    return { success: true, data: result }
  } catch (error) {
    console.error('myAction error:', error)
    // Message GENERIQUE au client (jamais de details techniques)
    return { success: false, error: 'Une erreur est survenue' }
  }
}
```

### 10.2 Hierarchie des Erreurs

```javascript
// Classes d'erreur custom pour un meilleur handling
class AppError extends Error {
  constructor(message, code, statusCode = 500, isOperational = true) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}

class NotFoundError extends AppError {
  constructor(entity) {
    super(`${entity} non trouve`, 'NOT_FOUND', 404)
  }
}

class ForbiddenError extends AppError {
  constructor() {
    super('Acces interdit', 'FORBIDDEN', 403)
  }
}

// Usage dans les services
if (!member) throw new NotFoundError('Membre')
```

### 10.3 Error Boundaries / Gestionnaire d'Erreurs Global

- Implementer un gestionnaire d'erreurs global qui capture les erreurs non-gerees
- Afficher un message utilisateur generique ("Une erreur est survenue") avec un bouton "Reessayer"
- Reporter l'erreur a un service de monitoring (voir section Observabilite)
- **Pages d'erreur specifiques** : 404, 500, avec des messages adaptes au contexte
- **Chaque section de l'application** devrait avoir sa propre gestion d'erreur pour eviter qu'un composant casse toute la page

### 10.4 Logging Non-Bloquant

- Les logs d'audit ne doivent JAMAIS bloquer l'action utilisateur
- Wrapper les appels de log dans un try/catch : si ca echoue, log console et continue

### 10.5 Fallback de Services Externes

- Cache distribue : fallback vers SQL si erreur de quota
- APIs tierces : fallback gracieux avec message utilisateur
- **Toujours prevoir un mode degrade**
- **Circuit breaker pattern** : apres N echecs consecutifs, court-circuiter l'appel pendant M secondes

### 10.6 Chargement de Ressources Externes

- Logo dans les PDFs : gerer les deux cas (URL HTTP vs data URL)
- **Echec silencieux** : retourner `null` si le fetch echoue, ne pas casser le flux

---

## 11. Integrite des Donnees

### 11.1 Precision Financiere (CRITIQUE)

- **NE JAMAIS utiliser l'arithmetique native JS pour l'argent**
  - `0.1 + 0.2 = 0.30000000000000004` en JavaScript
- Utiliser une librairie de precision : `decimal.js`, `dinero.js`, `big.js`
- Arrondi : `ROUND_HALF_UP`

```javascript
// INTERDIT
const total = items.reduce((sum, item) => sum + item.price, 0)

// OBLIGATOIRE
import Decimal from 'decimal.js'
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })
const total = items.reduce((sum, item) => new Decimal(sum).plus(item.price), new Decimal(0))
```

### 11.2 Conversion des Types Decimal de l'ORM

- Les types `Decimal` de votre ORM doivent etre convertis correctement avant usage en JavaScript
- Ne pas supposer qu'un objet `Decimal` retourne par l'ORM se comporte comme un `number` natif

### 11.3 Limites d'Import

Definir des limites explicites pour tout import de donnees :

| Parametre            | Valeur recommandee |
| -------------------- | ------------------ |
| Lignes par import    | 500 max            |
| Longueur description | 500 caracteres     |
| Montant maximum      | 999 999 999        |
| Nom de fichier       | 100 caracteres     |
| Taille de fichier    | 5 MB               |

### 11.4 Detection de Doublons

- Sur les imports CSV/Excel : comparer avec les N derniers mois de donnees existantes
- Signaler les doublons potentiels a l'utilisateur plutot que de les rejeter silencieusement

### 11.5 Workflow Base de Donnees

1. **Avant modification du schema** : backup local de la DB
2. **Migration** : utiliser l'outil de migration de votre ORM ou des scripts SQL versiones
3. **STOP immediat** si l'outil signale une perte de donnees potentielle : proposer un script manuel
4. **Post-migration** : verifier avec un outil visuel (pgAdmin, DBeaver, etc.)
5. Tester les routes impactees

> **DANGER** : les outils de migration ORM peuvent proposer un **reset complet**
> de la base de donnees s'ils detectent un drift de schema (colonnes ajoutees manuellement hors migrations).
> **Ne jamais accepter un reset en production.** A la place, creer le fichier de migration manuellement,
> executer le SQL directement, puis marquer la migration comme appliquee dans l'outil.

### 11.6 Scripts de Seed

- **NE JAMAIS utiliser "chercher puis mettre a jour"** dans les scripts de seed : ca ecrase les donnees de production
- Pattern safe : creer de nouvelles entites de test ou utiliser des IDs/slugs explicites

### 11.7 Transactions & Consistance

```sql
-- Toujours utiliser des transactions pour les operations multi-tables
BEGIN;

INSERT INTO payments (id, member_id, amount) VALUES (...);
UPDATE members SET balance = balance - :amount WHERE id = :member_id;
INSERT INTO audit_log (action, entity_id) VALUES ('PAYMENT_CREATED', :payment_id);

COMMIT;
```

```javascript
// Equivalent avec un ORM (pseudo-code)
await db.transaction(async (tx) => {
  const payment = await tx.payments.create({ data: paymentData })
  await tx.members.update({
    where: { id: memberId },
    data: { balance: { decrement: amount } },
  })
  await tx.auditLog.create({ data: { action: 'PAYMENT_CREATED' } })
})
```

- **Transactions** : obligatoires pour toute operation impliquant plus d'une table
- **Idempotence** : les operations critiques (paiements, etc.) doivent etre idempotentes (cle d'idempotence)
- **Optimistic locking** : utiliser un champ `version` ou `updated_at` pour les mises a jour concurrentes

---

## 12. Architecture & Scalabilite

### 12.1 Isolation Multi-Tenant

- Chaque requete en base DOIT inclure l'identifiant du tenant (`organization_id`, `tenant_id`, etc.)
- Ne JAMAIS faire confiance a l'identifiant du tenant venant du client : le recuperer depuis la session server-side

### 12.2 Organisation du Code

```
src/
├── app/               (ou pages/, routes/ selon le framework)
│   ├── auth/          → Pages publiques d'auth
│   ├── dashboard/     → App protegee
│   ├── marketing/     → Pages publiques marketing
│   ├── admin/         → Super Admin
│   └── api/           → Routes API REST
├── components/
│   ├── ui/            → Composants reutilisables
│   └── layout/        → Navigation, Sidebar
├── lib/
│   ├── actions/       → Mutations serveur
│   ├── services/      → Logique metier
│   ├── utils/         → Fonctions utilitaires pures
│   ├── hooks/         → Hooks/composables reutilisables
│   ├── types/         → Types partages
│   └── constants/     → Constantes et enums applicatifs
└── services/          → Services specifiques (PDF, audit, IA)
```

### 12.3 Regle Anti "God Component"

- **Ne jamais depasser 300 lignes par composant**
- Si un composant grossit : le decomposer en sous-composants et fonctions extraites
- **Piege vecu** : un composant de 883 lignes a du etre decompose en 9 modules

### 12.4 Mutations vs API Routes

| Cas d'usage                             | Choix                                           |
| --------------------------------------- | ----------------------------------------------- |
| CRUD mutations                          | Mutations serveur (si le framework le supporte) |
| Queries complexes (pagination, filtres) | Mutations serveur ou API REST                   |
| Webhooks externes (paiement, etc.)      | API Routes REST                                 |
| Upload de fichiers                      | API Routes REST                                 |
| Endpoints publics                       | API Routes REST                                 |
| Appels depuis des apps tierces          | API Routes REST                                 |

### 12.5 Conventions de Nommage

| Element           | Convention            | Exemple                   |
| ----------------- | --------------------- | ------------------------- |
| Composants        | PascalCase            | `UserCard.vue/tsx/svelte` |
| Actions/Services  | camelCase             | `createUser.ts`           |
| Constantes        | SCREAMING_SNAKE       | `MAX_FILE_SIZE`           |
| Types/Interfaces  | PascalCase            | `UserProfile`             |
| Hooks/Composables | useCamelCase          | `useMembers.ts`           |
| Utils             | camelCase             | `formatDate.ts`           |
| Tests             | _.test.ts / _.spec.ts | `userService.test.ts`     |

### 12.6 Systeme de Quotas

Prevoir des limites par plan/tier des le depart :

| Ressource           | Free   | Premium | Enterprise |
| ------------------- | ------ | ------- | ---------- |
| Entites principales | Limite | Eleve   | Illimite   |
| Stockage            | 50 MB  | 2 GB    | 10 GB+     |
| Requetes API/jour   | 100    | 1000    | Illimite   |
| Utilisateurs        | 5      | 50      | Illimite   |

### 12.7 Periode d'Essai

- Essai sans carte bancaire (30 jours recommande)
- Gere dans le code (`trial_period_days`), PAS dans le dashboard du prestataire de paiement
- Le token de session doit contenir `plan` et `trialEndsAt` pour verification cote serveur/middleware
- Essai expire : bloquer tout sauf la page d'expiration, les parametres et la page d'abonnement

### 12.8 Pattern Bounded Context (BMAD)

Pour l'ajout de nouveaux modules a une application existante :

| Principe          | Application                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| **Bounded**       | Le module ne touche PAS aux modeles existants. Aucune FK croisee non-necessaire.                        |
| **Modular**       | Modeles, services et actions dedies. FK sortantes uniquement vers les entites partagees (tenant, user). |
| **Agile**         | Le module peut etre active/desactive par configuration (type de tenant, feature flag).                  |
| **Decentralized** | Service dedie, actions dediees, zero import depuis les modules adjacents.                               |

---

## 13. Maintenabilite & DX

### 13.1 Conventions de Commits

```
Format : <type>(<scope>): <description>

Types :
  feat     → Nouvelle fonctionnalite
  fix      → Correction de bug
  docs     → Documentation
  style    → Formatage (pas de changement de logique)
  refactor → Refactoring (pas de nouvelle feature, pas de fix)
  perf     → Amelioration de performance
  test     → Ajout/modification de tests
  chore    → Maintenance (deps, config, scripts)
  ci       → CI/CD
  revert   → Revert d'un commit precedent

Exemples :
  feat(calendar): add recurring events support
  fix(auth): prevent brute-force on login endpoint
  chore(deps): upgrade framework to latest version
```

- **Commits atomiques** : un commit = un changement logique
- **Messages en anglais** (convention internationale) ou en francais (si equipe francophone uniquement)
- Outils : commitlint + husky pour forcer le format

### 13.2 Strategie de Branching

```
main (production)
  └── develop (staging)
       ├── feature/calendar-module
       ├── feature/payment-integration
       ├── fix/login-brute-force
       └── hotfix/critical-security-patch (→ merge direct sur main)
```

| Strategie       | Quand l'utiliser                                              |
| --------------- | ------------------------------------------------------------- |
| **Trunk-based** | Equipe petite (1-3 devs), CI/CD mature, feature flags         |
| **Git Flow**    | Equipe moyenne, releases planifiees, environnements multiples |
| **GitHub Flow** | Equipe petite-moyenne, deploiement continu                    |

### 13.3 Code Review Checklist

Avant d'approuver une PR, verifier :

- [ ] **Securite** : identifiant tenant dans les requetes, validation des entrees, pas de donnees sensibles exposees
- [ ] **Types** : pas de `any`, types explicites sur les fonctions publiques
- [ ] **Erreurs** : les erreurs sont gerees (try/catch, error boundaries)
- [ ] **Mobile** : inputs en 16px, touch targets 44px, pas de scroll horizontal
- [ ] **Accessibilite** : aria-labels, labels lies, focus visible
- [ ] **Performance** : pas d'import lourd non-necessaire, selection explicite en DB
- [ ] **Tests** : cas nominaux + cas d'erreur couverts
- [ ] **Nommage** : coherent avec les conventions du projet
- [ ] **Taille** : < 300 lignes par composant, PR < 500 lignes si possible

### 13.4 Gestion des Dependances

```bash
# Audit avant chaque release
npm audit --audit-level=high
npm outdated

# Mise a jour progressive (jamais tout d'un coup)
npm update --save  # patches + minors
# Les majors : une par une, avec test complet
```

- **Lockfile** : TOUJOURS commiter le fichier de verrouillage des dependances
- **Politique de mise a jour** :
  - Patches : automatiques (Dependabot/Renovate)
  - Minors : review rapide + tests
  - Majors : migration planifiee avec changelog lu
- **Nombre de dependances** : auditer regulierement, supprimer les deps inutilisees

### 13.5 Configuration Linter & Formateur

```json
// Configuration linter type (adapter au framework)
{
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-explicit-any": "error",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "prefer-const": "error"
  }
}
```

```json
// Configuration formateur type (Prettier ou equivalent)
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

- **Pre-commit hooks** : husky + lint-staged (ou equivalent) pour formater/linter automatiquement
- **Compatibilite cross-platform** : ne jamais utiliser `ENV=val cmd` dans les scripts (incompatible Windows). Utiliser `cross-env` ou separer les outils
- **Migration de config linter** : verifier la version du linter — les versions recentes peuvent utiliser un format de configuration different (ex: flat config). Adapter en consequence
- **Configuration partageable** : packager la config linter/formateur pour reutilisation inter-projets

### 13.6 Documentation In-Code

```javascript
// NE PAS commenter l'evident
// INTERDIT : "Incremente le compteur"
counter++

// COMMENTER le "pourquoi", pas le "quoi"
// Le rate limiter retourne 429 apres 100 req/min.
// On fallback vers le cache SQL pour ne pas bloquer l'utilisateur.
if (rateLimitError.status === 429) {
  return fallbackToSqlCache()
}

// JSDoc sur les fonctions publiques des services
/**
 * Calcule le solde d'un membre en tenant compte des paiements et des remboursements.
 * Utilise une librairie de precision pour eviter les erreurs d'arrondi.
 * @throws {NotFoundError} si le membre n'existe pas
 */
async function getMemberBalance(memberId, tenantId) {
  /* ... */
}
```

### 13.7 Feature Flags

```javascript
// Pattern simple de feature flags via variables d'environnement
const FEATURES = {
  CALENDAR_MODULE: process.env.FF_CALENDAR === 'true',
  AI_SUGGESTIONS: process.env.FF_AI === 'true',
  NEW_PRICING: process.env.FF_NEW_PRICING === 'true',
}

// Usage
if (FEATURES.CALENDAR_MODULE) {
  // Afficher le module calendrier
}
```

- **Variables d'environnement** pour le MVP, service dedie (LaunchDarkly, Unleash, Flagsmith) quand ca grossit
- **Nettoyage** : supprimer les feature flags obsoletes apres stabilisation (dette technique sinon)

### 13.8 Gestion des Erreurs TypeScript / JavaScript

```javascript
// Typer les erreurs correctement
try {
  await riskyOperation()
} catch (error) {
  // TOUJOURS verifier le type avant d'acceder aux proprietes
  if (error instanceof AppError) {
    return { success: false, error: error.message, code: error.code }
  }
  if (error instanceof Error) {
    console.error('Unexpected error:', error.message)
  }
  return { success: false, error: 'Une erreur est survenue' }
}
```

- **En TypeScript** : jamais de `catch (error: any)` — toujours `unknown` + type guards
- **Jamais de `any`** dans le code applicatif — utiliser `unknown` + type guards

---

## 14. Internationalisation (i18n)

### 14.1 Architecture i18n

```
src/
├── locales/
│   ├── fr/
│   │   ├── common.json     → Textes partages (boutons, erreurs)
│   │   ├── auth.json        → Page login/register
│   │   ├── dashboard.json   → Dashboard
│   │   └── billing.json     → Facturation
│   ├── en/
│   │   ├── common.json
│   │   └── ...
│   └── index.ts             → Chargement et helpers
```

### 14.2 Regles Fondamentales

- **Ne JAMAIS hardcoder de texte dans les composants** (meme "OK", "Annuler", "Oui")
- **Externaliser les messages d'erreur** : les schemas de validation aussi doivent utiliser des cles i18n
- **Pluralisation** : utiliser les regles ICU (`{count, plural, one {# membre} other {# membres}}`)
- **Dates et nombres** : utiliser `Intl.DateTimeFormat` et `Intl.NumberFormat` (jamais de formatage manuel)

```javascript
// Formatage localise des dates
const formatDate = (date, locale) => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)

// Formatage localise des montants
const formatCurrency = (amount, locale, currency) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
```

### 14.3 Stack Recommandee

| Besoin                  | Solutions possibles                         |
| ----------------------- | ------------------------------------------- |
| Framework generique     | `i18next`, `Format.js (react-intl)`         |
| Vue.js                  | `vue-i18n`                                  |
| Svelte                  | `svelte-i18n`                               |
| Angular                 | `@angular/localize`, `ngx-translate`        |
| Gestion des traductions | Crowdin, Lokalise, ou fichiers JSON manuels |

### 14.4 SEO Multi-Langue

```html
<!-- Balises hreflang obligatoires pour le SEO multi-langue -->
<link rel="alternate" hreflang="fr" href="https://monapp.com/fr" />
<link rel="alternate" hreflang="en" href="https://monapp.com/en" />
<link rel="alternate" hreflang="x-default" href="https://monapp.com" />
```

### 14.5 RTL (Right-to-Left) — Si necessaire

- Utiliser les proprietes logiques CSS (`margin-inline-start` au lieu de `margin-left`)
- Tester avec `dir="rtl"` sur `<html>`
- Si votre CSS framework supporte un prefixe RTL, l'utiliser pour les ajustements specifiques

---

## 15. Observabilite & Monitoring

### 15.1 Les 3 Piliers

| Pilier        | Quoi                                | Exemples d'outils             |
| ------------- | ----------------------------------- | ----------------------------- |
| **Logs**      | Evenements textuels structures      | Pino, Winston, Bunyan         |
| **Metriques** | Valeurs numeriques dans le temps    | Prometheus, Datadog, Grafana  |
| **Traces**    | Suivi d'une requete de bout en bout | OpenTelemetry, Jaeger, Zipkin |

### 15.2 Logging Structure

```javascript
import pino from 'pino' // ou Winston, Bunyan, etc.

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Format JSON pour l'ingestion par les outils de monitoring
})

// Usage — toujours structurer les logs
logger.info({ userId, action: 'MEMBER_CREATED', memberId, tenantId }, 'Member created')
logger.error({ err, userId, action: 'PAYMENT_FAILED' }, 'Payment processing failed')

// INTERDIT
console.log('Payment failed for user ' + userId) // Non-structure, non-searchable
```

- **Correlation ID** : generer un ID unique par requete, le propager dans tous les logs

```javascript
// Middleware de correlation
function correlationMiddleware(req) {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID()
  // Propager dans les headers, logs, et appels downstream
  return correlationId
}
```

### 15.3 Metriques Business

Au-dela des metriques techniques, monitorer les metriques business :

| Metrique                        | Alerte              |
| ------------------------------- | ------------------- |
| Inscriptions / jour             | < 50% de la moyenne |
| Taux de conversion trial → paid | < 5%                |
| Erreurs 5xx / heure             | > 10                |
| Temps de reponse P95            | > 3s                |
| Taille de la base de donnees    | > 80% du quota      |
| Commandes cache / jour          | > 80% du quota      |

### 15.4 Alerting

```
Niveaux d'alerte :
  P1 (CRITIQUE)   → Site down, data breach, paiements casses → SMS + appel
  P2 (URGENT)     → Feature majeure cassee, erreurs 5xx en hausse → Slack + email
  P3 (ATTENTION)  → Performance degradee, quota a 80% → Email
  P4 (INFO)       → Anomalie mineure, metriques inhabituelles → Dashboard
```

- **Ne pas alerter sur tout** : alert fatigue = alerts ignorees
- **Runbook** : chaque alerte doit pointer vers une procedure de resolution

### 15.5 Monitoring en Production

| Type de monitoring                            | Usage                                 |
| --------------------------------------------- | ------------------------------------- |
| Analytics web                                 | Performance web (Core Web Vitals)     |
| Logs d'application                            | Erreurs runtime, invocations          |
| Error tracking (Sentry, Bugsnag)              | Capture et suivi des erreurs JS       |
| Dashboard DB                                  | Metriques base de donnees             |
| Dashboard cache (Redis, etc.)                 | Commandes, quota, boucles de requetes |
| Uptime monitoring (UptimeRobot, BetterUptime) | Ping toutes les 5 min                 |

### 15.6 Health Check Endpoint

```javascript
// GET /api/health
async function healthCheck(req, res) {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(), // 'ok' ou 'error'
      cache: await checkCache(), // 'ok' ou 'error'
      // ... autres services critiques
    },
  }

  const allHealthy = Object.values(checks.checks).every((c) => c === 'ok')
  res.status(allHealthy ? 200 : 503).json(checks)
}
```

---

## 16. SEO & Meta

### 16.1 Favicon & Icones

- **PNG raster 192x192** obligatoire a la racine publique
- SVG pour les navigateurs modernes
- `.ico` + `apple-touch-icon.png` a la racine
- SVG : recadrer le `viewBox` au contenu reel (eliminer les marges vides)
- **Ne JAMAIS se fier au .ico ou .svg seul** pour l'indexation Google

### 16.2 Web Manifest

- Fichier `manifest.webmanifest` requis
- Doit referencer l'icone 192x192 PNG
- DOIT etre exclu du middleware d'auth

### 16.3 Schema.org (Donnees Structurees)

- JSON-LD `Organization` avec `logo` pointant vers un PNG raster (pas SVG)
- JSON-LD `HowTo` pour les guides/tutoriels (rich snippets Google)
- JSON-LD `BreadcrumbList` pour la navigation
- JSON-LD `FAQPage` pour les pages FAQ
- JSON-LD `SoftwareApplication` pour les pages produit SaaS
- Ancres pour deep linking (`#section-name`)

### 16.4 Open Graph

- Format d'image : PNG (meilleur support que JPG pour les previews)
- References coherentes dans tous les layouts et pages marketing
- Taille recommandee : 1200x630px
- **Twitter Card** : `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`

### 16.5 Meta Tags Essentiels

```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Titre de la page | NomDuSite</title>
  <meta name="description" content="Description unique et pertinente (150-160 caracteres)" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://monapp.com/cette-page" />

  <!-- Open Graph -->
  <meta property="og:title" content="Titre" />
  <meta property="og:description" content="Description" />
  <meta property="og:image" content="https://monapp.com/og-image.png" />
  <meta property="og:url" content="https://monapp.com/cette-page" />
  <meta property="og:type" content="website" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Titre" />
  <meta name="twitter:description" content="Description" />
  <meta name="twitter:image" content="https://monapp.com/og-image.png" />
</head>
```

- **Chaque page** doit avoir un `title` et `description` uniques
- **`canonical`** : obligatoire pour eviter le contenu duplique
- **`robots`** : `noindex` sur les pages admin, staging, preview

### 16.6 Sitemap & Robots

```xml
<!-- sitemap.xml — generer dynamiquement -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://monapp.com/</loc>
    <lastmod>2026-03-24</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- ... autres pages publiques -->
</urlset>
```

```
# robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://monapp.com/sitemap.xml
```

---

## 17. Tests & Qualite

### 17.1 Strategie de Tests (Pyramide)

```
        /  E2E  \          → 10% — Parcours critiques (inscription, paiement)
       / Integration \      → 30% — API routes, mutations serveur, services avec DB
      /    Unitaires    \   → 60% — Fonctions pures, utils, validations, hooks
```

| Type        | Outils recommandes       | Quand                                                |
| ----------- | ------------------------ | ---------------------------------------------------- |
| Unitaire    | Vitest / Jest            | Fonctions pures, utils, hooks, schemas de validation |
| Integration | Vitest/Jest + DB de test | Services, mutations serveur, API Routes              |
| E2E         | Playwright / Cypress     | Parcours utilisateur complets                        |
| Visuel      | Storybook + Chromatic    | Composants UI, design system                         |

### 17.2 Checklist Pre-PR

```bash
# Verification des types (TypeScript)
npx tsc --noEmit

# Linting
npm run lint

# Build production
npm run build

# Tests unitaires/integration
npm test
```

### 17.3 Tests Specifiques a Ecrire

- **Precision financiere** : 100 operations de 0.10 doivent donner exactement 10.00
- **Flux d'inscription/essai** : creation compte → onboarding → dashboard → expiration → blocage
- **Limites d'import** : tester chaque limite (taille, nombre, longueur)
- **RBAC** : chaque role ne peut faire que ce qui est autorise
- **Multi-tenant** : un tenant ne peut JAMAIS voir les donnees d'un autre
- **Validation** : chaque schema de validation teste avec des donnees valides ET invalides
- **Edge cases** : caracteres speciaux, unicode, chaines vides, valeurs null/undefined

### 17.4 Tests de Securite

- Injection SQL / NoSQL
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Path traversal sur les uploads
- Rate limiting effectif
- **IDOR (Insecure Direct Object Reference)** : un user ne peut pas acceder aux ressources d'un autre tenant
- **Broken authentication** : tokens expires, sessions invalidees

### 17.5 Coverage & Qualite

- **Objectif minimum** : 80% de couverture sur les services et actions
- **Ne pas viser 100%** : ca mene a des tests fragiles qui testent l'implementation plutot que le comportement
- **Tester le comportement, pas l'implementation** : les tests doivent survivre a un refactoring

### 17.6 Tests d'Accessibilite Automatises

```bash
# En CI/CD
npx axe-core --exit  # Audit automatise
npx pa11y https://localhost:3000  # Audit de page
```

```javascript
// Dans les tests
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

it('should have no a11y violations', async () => {
  const { container } = render(MyComponent)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

## 18. Deploiement & DevOps

### 18.1 Configuration Hebergement

Configurer votre hebergeur avec au minimum :

- La commande de build (incluant la generation du client ORM si applicable)
- Le framework detecte
- La region de deploiement (privilegier une region proche de vos utilisateurs, EU si possible)

### 18.2 Budget & FinOps

- Definir un budget mensuel cap (ex: 80 EUR)
- Alerter a 80% du budget
- Mode survie automatique si depassement
- Purger regulierement les tables de logs (TTL 90 jours recommande)
- Monitorer la consommation des services de cache (commands/jour)
- Monitorer la taille des tables DB volumineuses (audit, feedback, analytics)

### 18.3 Checklist Paiement (Stripe ou equivalent)

- [ ] Cle publishable live configuree
- [ ] IDs de prix live configures
- [ ] Cle secrete live configuree
- [ ] Endpoint webhook cree avec secret
- [ ] Events webhook : `checkout.session.completed`, `subscription.updated`, `subscription.deleted`, `invoice.payment_failed`, `subscription.trial_will_end`
- [ ] Portail client : logo, couleurs, textes, descripteur de releve
- [ ] Mode test utilise en dev/staging (jamais de vraies cartes)

### 18.4 Workflow de Migration DB

1. Backup local
2. Migration avec nom descriptif
3. **STOP sur Data Loss Warning** → script manuel
4. Verification visuelle post-migration
5. Verifier que la structure ne genere pas de requetes de cache excessives
6. Verifier les secrets en production post-migration
7. Tester les flux impactes

> **DANGER** : les outils de migration ORM peuvent proposer un **reset complet**
> de la base de donnees s'ils detectent un drift de schema (colonnes ajoutees manuellement hors migrations).
> **Ne jamais accepter un reset en production.** A la place :
>
> ```bash
> # 1. Creer le fichier de migration SQL manuellement
> # 2. Executer le SQL directement sur la base
> # 3. Marquer la migration comme appliquee dans l'outil ORM
> # 4. Regenerer le client ORM si necessaire
> ```

### 18.5 CI/CD Pipeline

```yaml
# Pipeline type (GitHub Actions, GitLab CI, etc.)
name: CI
on: [push, pull_request]

jobs:
  quality:
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx tsc --noEmit # Types
      - run: npm run lint # Lint
      - run: npm audit --audit-level=high # Security
      - run: npm test # Tests
      - run: npm run build # Build

  # Deploiement automatique sur main
  deploy:
    needs: quality
    if: github.ref == 'refs/heads/main'
    steps:
      # Executer les migrations de production
      # Deployer l'application
```

### 18.6 Environnements

| Environnement  | Usage          | Donnees                  | URL                |
| -------------- | -------------- | ------------------------ | ------------------ |
| **local**      | Developpement  | Seed / mock              | localhost:3000     |
| **preview**    | Review de PR   | Seed                     | auto-generee       |
| **staging**    | Pre-production | Copie anonymisee de prod | staging.monapp.com |
| **production** | Live           | Reelles                  | monapp.com         |

- **Jamais** de vraies donnees en local/preview/staging
- **Meme infrastructure** staging = production (memes services, memes versions)

### 18.7 Backup & Recovery

- **DB** : backups automatiques quotidiens (la plupart des providers cloud le font nativement)
- **Fichiers/uploads** : replication cross-region ou backup quotidien
- **Point-in-time recovery** : verifier que le provider DB le supporte
- **Tester la restoration** : au moins 1 fois par trimestre
- **RTO (Recovery Time Objective)** : definir le temps max acceptable de downtime
- **RPO (Recovery Point Objective)** : definir la perte de donnees max acceptable

---

## 19. Incident Response

### 19.1 Severite des Incidents

| Niveau   | Description               | Temps de reponse | Exemples                           |
| -------- | ------------------------- | ---------------- | ---------------------------------- |
| **SEV1** | Service indisponible      | < 15 min         | Site down, DB inaccessible, breach |
| **SEV2** | Feature majeure cassee    | < 1h             | Paiements casses, auth cassee      |
| **SEV3** | Feature secondaire cassee | < 4h             | Export PDF casse, UI bug visible   |
| **SEV4** | Bug mineur                | Prochain sprint  | Typo, alignement, edge case rare   |

### 19.2 Procedure de Reponse

```
1. DETECTER
   → Alerting automatique (error tracking, uptime monitor)
   → Rapport utilisateur

2. TRIER
   → Determiner la severite (SEV1-4)
   → Assigner un responsable

3. CONTENIR
   → Rollback si possible (redeployer un commit precedent)
   → Feature flag OFF si le probleme est isole
   → Page de maintenance si SEV1

4. CORRIGER
   → Hotfix sur branche dediee
   → Tests de non-regression
   → Deploy

5. POST-MORTEM
   → Documenter : timeline, cause racine, impact, actions correctives
   → Mettre a jour ce document si nouvelle regle decouverte
   → Partager avec l'equipe
```

### 19.3 Rollback

- **Hebergeur** : la plupart des hebergeurs modernes permettent un rollback instantane (redeployer un commit precedent)
- **DB** : point-in-time recovery si migration destructive
- **Feature flags** : desactiver la feature problematique sans rollback complet
- **Procedure** : toujours tester le rollback en staging avant de le faire en prod

### 19.4 Page de Maintenance

```javascript
// Dans le middleware de votre framework — activer en cas de SEV1
if (process.env.MAINTENANCE_MODE === 'true') {
  // Autoriser uniquement les admins et le health check
  if (!isAdmin(req) && !req.url.includes('/api/health')) {
    // Rediriger vers la page de maintenance
    return redirectToMaintenancePage()
  }
}
```

### 19.5 Communication de Crise

- **Page de statut** : statuspage.io ou betteruptime.com (gratuit pour les petits projets)
- **Template de communication** :
  - "Nous rencontrons actuellement un probleme avec [feature]. Nos equipes travaillent a la resolution."
  - "Le probleme a ete identifie et un correctif est en cours de deploiement."
  - "Le service est retabli. Nous vous presentons nos excuses pour la gene occasionnee."

---

## 20. Checklist Pre-Production

### Securite

- [ ] Headers HTTP de securite configures (CSP, HSTS, X-Frame-Options)
- [ ] CORS configure avec whitelist stricte
- [ ] Protection CSRF active sur les API Routes
- [ ] Rate limiting actif (routes normales + routes sensibles)
- [ ] Validation des entrees sur tous les endpoints (client ET serveur)
- [ ] Upload securise (MIME whitelist + magic bytes, sanitisation, taille max)
- [ ] Sanitisation XSS (DOMPurify si contenu riche)
- [ ] Pas de donnees sensibles dans les logs (redaction automatique)
- [ ] Secrets differents entre dev et prod
- [ ] HTTPS force (HSTS preload)
- [ ] Audit des dependances sans vulns high/critical
- [ ] Variables d'environnement validees au demarrage

### RGPD

- [ ] Bandeau de consentement cookies (pas de tracking avant consentement)
- [ ] Politique de confidentialite a jour
- [ ] Mentions legales completes
- [ ] Procedure droit d'acces (export JSON/CSV)
- [ ] Procedure droit a l'effacement (anonymisation + suppression)
- [ ] Registre des traitements documente
- [ ] DPA avec chaque sous-traitant verifie
- [ ] Durees de conservation definies et implementees
- [ ] Donnees de dev anonymisees (pas de vraies donnees en staging)

### Mobile & Responsivite

- [ ] Aucun scroll horizontal (tester sur iPhone SE 375px, Galaxy S8 360px)
- [ ] Tous les inputs en 16px minimum (pas de zoom iOS)
- [ ] Touch targets 44x44px minimum
- [ ] `inputMode` correct sur tous les champs
- [ ] Modaux scrollables avec overflow correct
- [ ] Navigation mobile (burger menu ou tab bar)
- [ ] Date pickers natifs fonctionnels sur iOS et Android
- [ ] Tableaux responsifs (card view ou scroll horizontal)
- [ ] Print stylesheet pour les pages imprimables (factures, rapports)

### UX

- [ ] Etats vides sur toutes les pages de listing
- [ ] Tooltips sur les termes techniques
- [ ] Onboarding pour les nouveaux utilisateurs
- [ ] Feedback visuel sur toutes les actions (loading, succes, erreur)
- [ ] Dark mode fonctionnel (si implemente)
- [ ] Skeleton loaders (pas de spinner plein ecran)

### Accessibilite

- [ ] `lang` sur la balise `<html>`
- [ ] Skip link "Aller au contenu principal"
- [ ] Contrastes WCAG AA (ratio 4.5:1 minimum)
- [ ] `aria-label` sur tous les boutons icone-only
- [ ] Labels lies aux inputs (`for`/`id`)
- [ ] `aria-live` sur les notifications dynamiques
- [ ] Focus trap dans les modales
- [ ] Focus restore apres fermeture de modale
- [ ] `prefers-reduced-motion` respecte
- [ ] `forced-colors` gere (mode contraste eleve Windows)
- [ ] Navigation au clavier fonctionnelle (Echap, Tab, Entree)
- [ ] Structure semantique HTML (main, nav, header, h1-h6)
- [ ] Alternatives textuelles pour les graphiques
- [ ] Test avec axe DevTools sans violation

### Performance

- [ ] Core Web Vitals dans le vert (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- [ ] Pas de librairie lourde dans le critical path
- [ ] Images optimisees avec `sizes` et formats modernes (WebP/AVIF)
- [ ] Polices limitees (3-4 graisses max)
- [ ] Pagination server-side pour les grandes listes
- [ ] Imports dynamiques avec placeholders CLS-safe
- [ ] Cache headers corrects (immutable pour les assets)

### SEO

- [ ] Favicon PNG 192x192
- [ ] manifest.webmanifest exclu du middleware auth
- [ ] Open Graph images (1200x630px PNG)
- [ ] Schema.org JSON-LD (Organization, BreadcrumbList)
- [ ] Meta titles et descriptions uniques par page
- [ ] Sitemap dynamique
- [ ] Canonical URLs
- [ ] robots.txt

### Observabilite

- [ ] Logging structure (JSON, correlation ID)
- [ ] Error tracking configure
- [ ] Uptime monitoring (ping toutes les 5 min)
- [ ] Health check endpoint
- [ ] Alerting configure (SEV1 → SMS, SEV2 → Slack/email)
- [ ] Metriques business monitorees

### Deploiement

- [ ] Variables d'environnement configurees en prod
- [ ] CI/CD pipeline fonctionnel (lint + types + tests + build)
- [ ] Budget et alertes configures
- [ ] Webhooks de paiement testes
- [ ] Backup DB automatise
- [ ] Procedure de rollback testee
- [ ] Page de maintenance prete

### Maintenabilite

- [ ] Conventional commits configures (commitlint)
- [ ] Pre-commit hooks (husky + lint-staged ou equivalent)
- [ ] Dependabot/Renovate active
- [ ] Code review checklist partagee avec l'equipe
- [ ] Feature flags pour les fonctionnalites en cours

---

Version 1.0 — 24/03/2026

---

> **Ce document est un living document.** Il est concu pour etre mis a jour quand une nouvelle regle est decouverte en session de developpement. Il est applicable a tout projet web moderne, quel que soit le framework ou la stack technique.
