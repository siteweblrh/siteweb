/**
 * Saisie rapide de journée — étape 1 : texte collé → structure.
 *
 * FONCTION PURE, zéro I/O (cf. docs/SAISIE_RAPIDE_JOURNEE.md §7) : elle ne
 * connaît ni la base ni les clubs, elle LIT. Toute interprétation (quel club,
 * quel joueur) appartient à l'étape 2. C'est ce qui rend les cas tordus des
 * vraies feuilles testables (parse.test.ts) et ce qui permettrait à une API
 * fédérale de remplacer cette seule étape.
 *
 * Grammaire, calquée sur ce que la ligue produit déjà (§4) :
 *
 *   ### HCP (Domicile) 10 – 4 Entente SDHC/HHS/Zarlors (Visiteurs)
 *   * **Score final :** 10 - 4
 *   * **Buteurs HCP (10 buts) :**
 *   * **Mathieu Ledoux** (#18) : **3 buts**
 *   * **Buteurs Entente (4 buts) :**   ·   Entente : Aucun buteur
 *   * **Sanctions enregistrées (Entente) :**
 *   * **Alexandre Orange** (#17) : Carton vert
 *   * **Blessure signalée (USPG) :**
 *   * **Bertrand Vidot** (#10) : Choc balle orteil droit
 *
 * Règle centrale : on ne devine pas. Une ligne incomprise à l'intérieur d'une
 * rencontre est BLOQUANTE — ce peut être un but perdu.
 */
import type {
  CardKindText,
  ParsedMatch,
  ParsedSheet,
  ParseIssue,
  SheetPerson,
} from './types';

/** Plafond du texte collé (§9) : une journée tient très largement dans 64 Ko. */
export const MAX_SHEET_LENGTH = 64 * 1024;

/** Minuscules, sans accents : pour reconnaître les mots-clés, jamais pour afficher. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Retire la décoration Markdown (titres, puces, gras, italique) et normalise
 * les espaces. `- ` en début de ligne est une puce, pas un signe : aucune
 * ligne de la grammaire ne commence par un nombre négatif.
 */
export function cleanLine(raw: string): string {
  return raw
    .replace(/\*\*|__|`/g, '')
    .replace(/^[\s#>*•·–—-]+/, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const DASH = '[-–—]';
const SCORE_FINAL = new RegExp(`^score(?:\\s+final)?\\s*:?\\s*(\\d+)\\s*${DASH}\\s*(\\d+)`);
// « AZO 2-1 HHS », « HCP (Domicile) 10 – 4 Entente (Visiteurs) ». Le tiret
// ENTRE deux nombres est l'ancre : « Jean-Yves Filo : 2 buts » n'y ressemble pas.
const MATCH_HEADER = new RegExp(`^(.*?\\D)\\s*(\\d+)\\s*${DASH}\\s*(\\d+)\\s*(\\D.*)$`);

/** « (Domicile) », « Match 1 — », « 09:00 · »… : tout ce qui entoure un nom d'équipe. */
function cleanTeam(s: string): string {
  return s
    .replace(/^(?:match|rencontre)\s*(?:n°\s*)?\d*\s*[:.·–—-]?\s*/i, '')
    .replace(/^\d{1,2}\s*[:h]\s*\d{2}\s*[·:–—-]?\s*/i, '')
    .replace(/\((?:domicile|dom\.?|visiteurs?|ext\.?|exterieur|extérieur)\)/gi, '')
    .replace(/[:·–—-]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrait le maillot (« (#18) », « #18 », « n° 4 ») et rend le nom nettoyé. */
export function splitPerson(text: string): SheetPerson {
  let jersey: number | null = null;
  const m =
    text.match(/\(\s*(?:#|n°)?\s*(\d{1,3})\s*\)/i) ??
    text.match(/#\s*(\d{1,3})\b/) ??
    text.match(/\bn°\s*(\d{1,3})\b/i);
  if (m) jersey = Number(m[1]);
  const name = text
    .replace(/\(\s*(?:#|n°)?\s*\d{1,3}\s*\)/gi, '')
    .replace(/#\s*\d{1,3}\b/g, '')
    .replace(/\bn°\s*\d{1,3}\b/gi, '')
    .replace(/[:,;]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { name, jersey };
}

/** Équipe d'un titre de section : le contenu des parenthèses, sinon le reste. */
function sectionTeam(rest: string): string | null {
  // « (8 buts) » est le total annoncé, pas une équipe : on l'ôte d'abord,
  // sinon « Buteurs HCO (8 buts) » prendrait « 8 buts » pour le nom.
  const withoutTotal = rest.replace(/\(\s*\d+\s*buts?\s*\)/gi, '');
  const paren = withoutTotal.match(/\(([^)]+)\)/);
  const raw = paren
    ? paren[1]
    : withoutTotal.replace(/\b(?:enregistr|signal|relev)\w*/gi, '').replace(/[:()]/g, '');
  const team = raw.replace(/\s+/g, ' ').trim();
  return team || null;
}

type Section =
  | { kind: 'goals'; team: string }
  | { kind: 'cards'; team: string | null }
  | { kind: 'injuries'; team: string | null }
  | null;

const CARD_WORDS: Record<string, CardKindText> = { vert: 'GREEN', jaune: 'YELLOW', rouge: 'RED' };

export function parseMatchSheet(input: string): ParsedSheet {
  const matches: ParsedMatch[] = [];
  const issues: ParseIssue[] = [];
  let current: ParsedMatch | null = null;
  let section: Section = null;

  const lines = input.slice(0, MAX_SHEET_LENGTH).split(/\r?\n/);
  if (input.length > MAX_SHEET_LENGTH) {
    issues.push({
      line: lines.length,
      text: '',
      message: 'Texte tronqué à 64 Ko : collez une journée à la fois.',
      blocking: true,
    });
  }

  const issue = (line: number, text: string, message: string) => {
    // Avant le premier titre de rencontre : en-tête libre (« Journée 2 »), ignoré.
    issues.push({ line, text, message, blocking: current !== null });
  };

  lines.forEach((raw, index) => {
    const line = index + 1;
    const l = cleanLine(raw);
    if (!l) return;
    const f = fold(l);

    // 1. Score final : réaffirme le score du titre (ou le complète).
    const score = f.match(SCORE_FINAL);
    if (score) {
      if (!current) return issue(line, l, 'Score final sans rencontre au-dessus.');
      const [hs, as] = [Number(score[1]), Number(score[2])];
      if (hs !== current.homeScore || as !== current.awayScore) {
        issues.push({
          line, text: l, blocking: true,
          message: `Le score final (${hs}-${as}) contredit le titre de la rencontre (${current.homeScore}-${current.awayScore}).`,
        });
      }
      return;
    }

    // 2. « Adversaire : Aucun buteur » — zéro but déclaré pour ce camp.
    const none = l.match(/^(?:buteurs?\s+)?(.+?)\s*:\s*aucun(?:\s+buteur)?\s*$/i);
    if (none && current) {
      current.noScorer.push({
        teamText: cleanTeam(none[1].replace(/\(\s*\d+\s*buts?\s*\)/i, '')),
        line,
      });
      section = null;
      return;
    }

    // 3. Titres de section.
    if (/^buteurs?\b/.test(f)) {
      if (!current) return issue(line, l, 'Section « Buteurs » sans rencontre au-dessus.');
      const rest = l.replace(/^buteurs?\s*/i, '');
      const team = sectionTeam(rest);
      if (!team) return issue(line, l, 'Section « Buteurs » sans nom d’équipe.');
      const total = rest.match(/\(\s*(\d+)\s*buts?\s*\)/i);
      if (total) current.announcedTotals.push({ teamText: team, count: Number(total[1]), line });
      section = { kind: 'goals', team };
      return;
    }
    if (/^(?:sanctions?|cartons?)\b/.test(f)) {
      if (!current) return issue(line, l, 'Section « Sanctions » sans rencontre au-dessus.');
      section = { kind: 'cards', team: sectionTeam(l.replace(/^\S+\s*/, '')) };
      return;
    }
    if (/^blessures?\b/.test(f)) {
      if (!current) return issue(line, l, 'Section « Blessure » sans rencontre au-dessus.');
      section = { kind: 'injuries', team: sectionTeam(l.replace(/^\S+\s*/, '')) };
      return;
    }

    // 4. Titre de rencontre.
    const header = l.match(MATCH_HEADER);
    if (header) {
      const homeText = cleanTeam(header[1]);
      const awayText = cleanTeam(header[4]);
      if (homeText && awayText) {
        current = {
          line, homeText, awayText,
          homeScore: Number(header[2]),
          awayScore: Number(header[3]),
          goals: [], announcedTotals: [], noScorer: [], cards: [], injuries: [],
        };
        matches.push(current);
        section = null;
        return;
      }
    }

    // 5. Lignes d'une section.
    if (!current) return issue(line, l, 'Ligne ignorée : aucune rencontre au-dessus.');
    if (!section) {
      return issue(line, l, 'Ligne hors section : précédez-la de « Buteurs <équipe> : », « Sanctions (<équipe>) : » ou « Blessure (<équipe>) : ».');
    }

    const colon = l.indexOf(':');
    const who = colon >= 0 ? l.slice(0, colon) : l;
    const what = colon >= 0 ? l.slice(colon + 1).trim() : '';

    if (section.kind === 'goals') {
      // « Nom : 3 buts », « Nom : 1 », « Nom (#18) 2 buts ». Sans nombre lisible
      // (« n° 4 Kenny Iva »), `count` reste nul : but de plus ou ligne
      // d'effectif ? L'étape 2 pose la question, on ne tranche pas (§5.2).
      let person: SheetPerson;
      let count: number | null = null;
      if (colon >= 0) {
        person = splitPerson(who);
        const n = what.match(/^(\d+)\b/);
        if (n) count = Number(n[1]);
      } else {
        const tail = l.match(/^(.*?)\s+(\d+)\s*buts?\s*$/i);
        person = splitPerson(tail ? tail[1] : l);
        if (tail) count = Number(tail[2]);
      }
      if (!person.name) return issue(line, l, 'Buteur sans nom.');
      current.goals.push({ ...person, line, teamText: section.team, count });
      return;
    }

    if (section.kind === 'cards') {
      const card = fold(what || l).match(/carton\s+(vert|jaune|rouge)/);
      if (!card) return issue(line, l, 'Sanction non reconnue : écrivez « Carton vert », « Carton jaune » ou « Carton rouge ».');
      const person = splitPerson(colon >= 0 ? who : l.replace(/carton\s+\S+.*$/i, ''));
      if (!person.name) return issue(line, l, 'Carton sans nom de joueur.');
      current.cards.push({ ...person, line, teamText: section.team, kind: CARD_WORDS[card[1]] });
      return;
    }

    const person = splitPerson(who);
    if (!person.name) return issue(line, l, 'Blessure sans nom de joueur.');
    current.injuries.push({ ...person, line, teamText: section.team, description: what });
  });

  return { matches, issues };
}
