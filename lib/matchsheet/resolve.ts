/**
 * Saisie rapide de journée — étape 2 : structure lue + données de la base → plan.
 *
 * FONCTION PURE : l'action serveur (lib/actions/matchsheet.ts) charge les
 * données et les passe ici. Aucun accès base, donc chaque garde-fou du cadrage
 * (docs/SAISIE_RAPIDE_JOURNEE.md §5) est testable avec des données inventées
 * (resolve.test.ts).
 *
 * Le plan est RECALCULÉ côté serveur à l'écriture, à partir du texte et des
 * choix de l'admin : on n'écrit jamais un plan renvoyé par le navigateur (§9).
 */
import { fold } from './parse';
import type {
  CardKindText,
  MatchdayPlan,
  ParsedSheet,
  PersonDecision,
  PersonQuestion,
  PlanAlert,
  PlannedEvent,
  PlannedMatch,
} from './types';

/* ───────────── Données d'entrée (chargées par l'action serveur) ───────────── */

export type ResolveClub = {
  id: string;
  name: string;
  shortCode: string | null;
  slug: string;
  kind: 'STANDALONE' | 'ENTENTE';
  /** Clubs membres d'une entente (où sont licenciés ses joueurs). */
  parentClubs: { id: string; name: string; shortCode: string | null }[];
};

export type ResolveMember = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  clubId: string;
};

export type ResolveMatch = {
  id: string;
  kickoffAt: Date;
  homeClubId: string | null;
  awayClubId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  counts: { goals: number; cards: number; injuries: number };
};

export type ResolveInput = {
  competitionLabel: string;
  matchday: number;
  sheet: ParsedSheet;
  /** Matchs de la compétition pour cette journée, triés par coup d'envoi. */
  matches: ResolveMatch[];
  clubs: ResolveClub[];
  /** Joueurs des clubs concernés ET des clubs membres des ententes. */
  members: ResolveMember[];
  decisions: Record<string, PersonDecision>;
  /** Matchs déjà saisis dont l'admin a confirmé le remplacement (§5.6). */
  confirmedOverwrite: string[];
};

/* ───────────── Ce qui sera écrit (jamais renvoyé tel quel au client) ───────────── */

export type PersonRef =
  | { type: 'member'; memberId: string }
  | { type: 'create'; key: string }
  | { type: 'free'; name: string };

export type MatchWrite = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  goals: { clubId: string; person: PersonRef }[];
  cards: { clubId: string; person: PersonRef; kind: CardKindText }[];
  injuries: { clubId: string; person: PersonRef; notes: string }[];
};

export type MemberCreation = {
  key: string;
  clubId: string;
  clubCode: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
};

export type ResolveResult = {
  plan: MatchdayPlan;
  writes: MatchWrite[];
  creations: MemberCreation[];
};

/* ───────────── Rapprochement des noms ───────────── */

const STOP = new Set(['de', 'du', 'des', 'la', 'le', 'l', 'd', 'et', 'club']);

function tokens(s: string): string[] {
  return fold(s)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t && !STOP.has(t));
}

/**
 * Score de ressemblance entre un libellé de la feuille et un club : 100 pour
 * une égalité avec le code court, le slug ou le nom ; sinon le nombre de mots
 * en commun. « Entente SDHC/HHS/Zarlors » partage 3 mots avec l'entente et 1
 * seul avec HHS : c'est l'entente qui gagne, sans liste d'alias à maintenir.
 */
function clubScore(text: string, club: ResolveClub): number {
  const t = tokens(text).join(' ');
  if (!t) return 0;
  const aliases = [club.shortCode ?? '', club.slug.replace(/-/g, ' '), club.name].map((a) => tokens(a).join(' '));
  if (aliases.includes(t)) return 100;
  const words = new Set([
    ...tokens(club.name),
    ...tokens(club.shortCode ?? ''),
    ...tokens(club.slug),
    ...club.parentClubs.flatMap((p) => tokens(p.shortCode ?? '')),
  ]);
  return tokens(text).filter((w) => words.has(w)).length;
}

/** Le meilleur club, s'il est unique et non nul. `null` = introuvable ou ambigu. */
function bestClub(text: string, pool: ResolveClub[]): { club: ResolveClub | null; ambiguous: boolean } {
  const scored = pool.map((c) => ({ c, s: clubScore(text, c) })).sort((a, b) => b.s - a.s);
  if (!scored.length || scored[0].s === 0) return { club: null, ambiguous: false };
  if (scored[1] && scored[1].s === scored[0].s) return { club: null, ambiguous: true };
  return { club: scored[0].c, ambiguous: false };
}

function clubLabel(c: { name: string; shortCode: string | null }): string {
  return c.shortCode ?? c.name;
}

function memberLabel(m: ResolveMember, clubs: Map<string, { name: string; shortCode: string | null }>): string {
  const club = clubs.get(m.clubId);
  const name = `${m.firstName} ${m.lastName}`.trim();
  return `${name}${m.jerseyNumber != null ? ` #${m.jerseyNumber}` : ''}${club ? ` · ${clubLabel(club)}` : ''}`;
}

/**
 * Découpe un nom de feuille en prénom / nom. Les mots entièrement en
 * MAJUSCULES sont le nom de famille (« Ryan FILO ») ; sinon le dernier mot
 * (« Jean Yves Filo » → Jean Yves / Filo) ; un mot seul est un prénom.
 */
export function splitSheetName(name: string): { firstName: string; lastName: string } {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return { firstName: words[0], lastName: '' };
  const upper = words.filter((w) => w.length > 1 && w === w.toUpperCase() && /\p{L}/u.test(w));
  if (upper.length > 0 && upper.length < words.length) {
    const cap = (w: string) => w.charAt(0) + w.slice(1).toLowerCase();
    return {
      firstName: words.filter((w) => !upper.includes(w)).join(' '),
      lastName: upper.map(cap).join(' '),
    };
  }
  return { firstName: words.slice(0, -1).join(' '), lastName: words[words.length - 1] };
}

type PersonMatch =
  | { kind: 'resolved'; member: ResolveMember; note: string | null }
  | { kind: 'question'; reason: PersonQuestion['reason']; candidates: ResolveMember[] };

/**
 * Identifie une personne dans un vivier de joueurs, sur le NOM (§5.3).
 *
 * - tous les mots identiques (dans n'importe quel ordre) → trouvé ;
 * - mots de la feuille tous présents en base, sans contradiction (« Esma »
 *   pour « Esma Trebalage ») → trouvé s'il est seul, avec une note ;
 * - un mot commun mais un autre qui contredit (« Jerry » / « Quentin
 *   Celestin ») → question, jamais de rattachement d'office (§5.5) ;
 * - plusieurs candidats → le maillot ne sert QU'À départager (§5.3).
 */
function matchPerson(name: string, jersey: number | null, pool: ResolveMember[]): PersonMatch {
  const sheet = tokens(name).sort();
  const key = sheet.join(' ');
  const exact = pool.filter((m) => tokens(`${m.firstName} ${m.lastName}`).sort().join(' ') === key);
  const subset = exact.length
    ? exact
    : pool.filter((m) => {
        const words = new Set(tokens(`${m.firstName} ${m.lastName}`));
        return sheet.length > 0 && sheet.every((w) => words.has(w));
      });

  if (subset.length > 1 && jersey != null) {
    const byJersey = subset.filter((m) => m.jerseyNumber === jersey);
    if (byJersey.length === 1) {
      return { kind: 'resolved', member: byJersey[0], note: `homonymes départagés par le maillot #${jersey}` };
    }
  }
  if (subset.length > 1) return { kind: 'question', reason: 'homonyms', candidates: subset };
  if (subset.length === 1) {
    return {
      kind: 'resolved',
      member: subset[0],
      note: exact.length ? null : `identifié(e) par « ${name} » seul`,
    };
  }

  const partial = pool.filter((m) => {
    const words = new Set(tokens(`${m.firstName} ${m.lastName}`));
    return sheet.some((w) => w.length >= 3 && words.has(w));
  });
  return partial.length
    ? { kind: 'question', reason: 'partial', candidates: partial }
    : { kind: 'question', reason: 'absent', candidates: [] };
}

/* ───────────── Résolution ───────────── */

export function resolveMatchday(input: ResolveInput): ResolveResult {
  const { sheet, clubs, members, decisions } = input;
  const labelById = new Map<string, { name: string; shortCode: string | null }>();
  for (const c of clubs) {
    labelById.set(c.id, c);
    for (const p of c.parentClubs) labelById.set(p.id, p);
  }

  const globalAlerts: PlanAlert[] = sheet.issues.map((i) => ({
    level: i.blocking ? 'blocking' : 'warning',
    message: `${i.message} — « ${i.text} »`,
    line: i.line,
  }));

  const questions = new Map<string, PersonQuestion>();
  const creations = new Map<string, MemberCreation>();
  const plannedMatches: PlannedMatch[] = [];
  const writes: MatchWrite[] = [];
  const used = new Set<string>();

  /** Vivier d'un club : ses joueurs, ou ceux de ses clubs membres pour une entente. */
  const poolOf = (club: ResolveClub) => {
    const ids = new Set([club.id, ...club.parentClubs.map((p) => p.id)]);
    return members.filter((m) => ids.has(m.clubId));
  };

  /**
   * Transforme une personne de la feuille en référence d'écriture, ou en
   * question pour l'admin. Toutes les apparitions d'un même nom dans un même
   * club partagent la même question : un seul choix règle la journée.
   */
  const personRef = (
    name: string,
    jersey: number | null,
    club: ResolveClub,
    alerts: PlanAlert[],
    line: number,
  ): { ref: PersonRef | null; who: string; as: PlannedEvent['as'] } => {
    const found = matchPerson(name, jersey, poolOf(club));
    if (found.kind === 'resolved') {
      const m = found.member;
      if (jersey != null && m.jerseyNumber != null && m.jerseyNumber !== jersey) {
        alerts.push({
          level: 'warning', line,
          message: `${name} : #${jersey} sur la feuille, #${m.jerseyNumber} en base. Attribué sur le NOM ; le numéro en base n'est pas modifié.`,
        });
      }
      if (found.note) alerts.push({ level: 'warning', line, message: `${name} → ${memberLabel(m, labelById)} (${found.note}).` });
      return { ref: { type: 'member', memberId: m.id }, who: memberLabel(m, labelById), as: 'member' };
    }

    const key = `${club.id}|${tokens(name).sort().join(' ')}`;
    const createIn = club.kind === 'ENTENTE'
      ? club.parentClubs.map((p) => ({ clubId: p.id, label: clubLabel(p) }))
      : [{ clubId: club.id, label: clubLabel(club) }];
    const decision = decisions[key] ?? null;
    if (!questions.has(key)) {
      questions.set(key, {
        key, name, jersey,
        teamClubId: club.id,
        teamClubLabel: clubLabel(club),
        reason: found.reason,
        candidates: found.candidates.map((m) => ({ id: m.id, label: memberLabel(m, labelById) })),
        createIn,
        decision,
      });
    }

    if (decision?.type === 'member' && found.candidates.some((c) => c.id === decision.memberId)) {
      const m = found.candidates.find((c) => c.id === decision.memberId)!;
      return { ref: { type: 'member', memberId: m.id }, who: memberLabel(m, labelById), as: 'member' };
    }
    if (decision?.type === 'create' && createIn.some((c) => c.clubId === decision.clubId)) {
      if (!creations.has(key)) {
        const { firstName, lastName } = splitSheetName(name);
        const target = labelById.get(decision.clubId)!;
        creations.set(key, {
          key, clubId: decision.clubId, clubCode: clubLabel(target), firstName, lastName, jerseyNumber: jersey,
        });
      }
      return { ref: { type: 'create', key }, who: `${name} (nouveau, ${clubLabel(labelById.get(decision.clubId)!)})`, as: 'create' };
    }
    if (decision?.type === 'free') {
      return { ref: { type: 'free', name }, who: `${name} (nom libre)`, as: 'free' };
    }
    return { ref: null, who: name, as: 'unresolved' };
  };

  for (const pm of sheet.matches) {
    const alerts: PlanAlert[] = [];
    const matchdayClubIds = new Set(input.matches.flatMap((m) => [m.homeClubId, m.awayClubId]).filter(Boolean) as string[]);
    const pool = clubs.filter((c) => matchdayClubIds.has(c.id));

    const home = bestClub(pm.homeText, pool);
    const away = bestClub(pm.awayText, pool);
    const title = `${pm.homeText} ${pm.homeScore}-${pm.awayScore} ${pm.awayText}`;
    const planned: PlannedMatch = {
      line: pm.line, matchId: null, title, kickoffLabel: null,
      score: { home: pm.homeScore, away: pm.awayScore },
      events: [], existing: null, alerts,
    };
    plannedMatches.push(planned);

    for (const [side, r, text] of [['domicile', home, pm.homeText], ['visiteur', away, pm.awayText]] as const) {
      if (!r.club) {
        alerts.push({
          level: 'blocking', line: pm.line,
          message: r.ambiguous
            ? `Équipe ${side} « ${text} » ambiguë : plusieurs clubs de la journée y ressemblent. Utilisez le code court.`
            : `Équipe ${side} « ${text} » introuvable parmi les clubs de cette journée.`,
        });
      }
    }
    if (!home.club || !away.club) continue;
    const homeClub = home.club;
    const awayClub = away.club;

    // Rencontre du calendrier. Deux affiches identiques dans la journée (cas
    // des rassemblements jeunes) sont appariées dans l'ordre : la Nième
    // occurrence du texte ↔ le Nième match par coup d'envoi.
    const candidates = input.matches.filter(
      (m) => m.homeClubId === homeClub.id && m.awayClubId === awayClub.id && !used.has(m.id),
    );
    const match = candidates[0];
    if (!match) {
      const reversed = input.matches.some((m) => m.homeClubId === awayClub.id && m.awayClubId === homeClub.id);
      alerts.push({
        level: 'blocking', line: pm.line,
        message: reversed
          ? `Au calendrier, c'est ${clubLabel(awayClub)} qui reçoit ${clubLabel(homeClub)}. Inversez les équipes ET le score dans le texte.`
          : `Aucune rencontre ${clubLabel(homeClub)} – ${clubLabel(awayClub)} (restante) dans cette journée du calendrier.`,
      });
      continue;
    }
    used.add(match.id);
    planned.matchId = match.id;
    planned.title = `${clubLabel(homeClub)} ${pm.homeScore}-${pm.awayScore} ${clubLabel(awayClub)}`;
    planned.kickoffLabel = match.kickoffAt.toISOString();

    // §5.6 — ce qui existe déjà sera remplacé.
    const hasData = match.counts.goals + match.counts.cards + match.counts.injuries > 0 || match.homeScore != null;
    if (hasData) {
      planned.existing = {
        ...match.counts,
        score: match.homeScore != null && match.awayScore != null ? `${match.homeScore}-${match.awayScore}` : null,
        status: match.status,
      };
      if (!input.confirmedOverwrite.includes(match.id)) {
        alerts.push({
          level: 'blocking', line: pm.line,
          message: 'Ce match est déjà saisi : confirmez le remplacement de ses données actuelles.',
        });
      }
    }

    /** Côté d'une section : comparé aux deux clubs ET aux libellés du titre. */
    const sideOf = (teamText: string): 'home' | 'away' | null => {
      const s = (club: ResolveClub, headerText: string) => {
        const t = tokens(teamText).join(' ');
        if (t && t === tokens(headerText).join(' ')) return 100;
        const headerWords = new Set(tokens(headerText));
        return Math.max(clubScore(teamText, club), tokens(teamText).filter((w) => headerWords.has(w)).length);
      };
      const h = s(homeClub, pm.homeText);
      const a = s(awayClub, pm.awayText);
      if (h === a) return null;
      return h > a ? 'home' : 'away';
    };
    const clubOf = (side: 'home' | 'away') => (side === 'home' ? homeClub : awayClub);

    const write: MatchWrite = { matchId: match.id, homeScore: pm.homeScore, awayScore: pm.awayScore, goals: [], cards: [], injuries: [] };
    let complete = true;
    const counted = { home: 0, away: 0 };

    // Buts.
    for (const g of pm.goals) {
      const side = sideOf(g.teamText);
      if (!side) {
        alerts.push({ level: 'blocking', line: g.line, message: `Section « Buteurs ${g.teamText} » : équipe non reconnue pour cette rencontre.` });
        complete = false;
        continue;
      }
      if (g.count == null) {
        // §5.2 — « n° 4 Kenny Iva » : but de plus ou ligne d'effectif ?
        alerts.push({
          level: 'blocking', line: g.line,
          message: `« ${g.name} » n'a pas de nombre de buts. Si c'est un buteur, écrivez « ${g.name} : 1 but » ; sinon supprimez la ligne.`,
        });
        complete = false;
        continue;
      }
      counted[side] += g.count;
      const r = personRef(g.name, g.jersey, clubOf(side), alerts, g.line);
      planned.events.push({ kind: 'goal', side, who: r.who, as: r.as, detail: `${g.count} but${g.count > 1 ? 's' : ''}` });
      if (!r.ref) { complete = false; continue; }
      for (let i = 0; i < g.count; i++) write.goals.push({ clubId: clubOf(side).id, person: r.ref });
    }

    // §5.1 — buts listés ≠ score, contrôlé PAR CAMP.
    for (const side of ['home', 'away'] as const) {
      const score = side === 'home' ? pm.homeScore : pm.awayScore;
      if (counted[side] !== score && pm.goals.every((g) => g.count != null)) {
        alerts.push({
          level: 'blocking', line: pm.line,
          message: `${clubLabel(clubOf(side))} : ${counted[side]} but${counted[side] > 1 ? 's' : ''} listé${counted[side] > 1 ? 's' : ''} pour un score de ${score}.`,
        });
      }
    }
    for (const t of pm.announcedTotals) {
      const side = sideOf(t.teamText);
      if (side && t.count !== (side === 'home' ? pm.homeScore : pm.awayScore)) {
        alerts.push({ level: 'blocking', line: t.line, message: `« ${t.teamText} (${t.count} buts) » contredit le score de la rencontre.` });
      }
    }
    for (const n of pm.noScorer) {
      const side = sideOf(n.teamText);
      if (!side) {
        alerts.push({ level: 'blocking', line: n.line, message: `« ${n.teamText} : Aucun buteur » : équipe non reconnue.` });
      } else if ((side === 'home' ? pm.homeScore : pm.awayScore) > 0) {
        alerts.push({ level: 'blocking', line: n.line, message: `« Aucun buteur » pour ${clubLabel(clubOf(side))}, qui a pourtant marqué.` });
      }
    }

    // Cartons et blessures : l'équipe est celle de la section, ou se déduit du
    // joueur quand la section n'en donne pas.
    const sideForPerson = (teamText: string | null, name: string, line: number): 'home' | 'away' | null => {
      if (teamText) {
        const side = sideOf(teamText);
        if (!side) alerts.push({ level: 'blocking', line, message: `Équipe « ${teamText} » non reconnue pour cette rencontre.` });
        return side;
      }
      const inHome = matchPerson(name, null, poolOf(homeClub)).kind === 'resolved';
      const inAway = matchPerson(name, null, poolOf(awayClub)).kind === 'resolved';
      if (inHome !== inAway) return inHome ? 'home' : 'away';
      alerts.push({ level: 'blocking', line, message: `« ${name} » : précisez l'équipe dans le titre de la section, ex. « Sanctions (${clubLabel(homeClub)}) : ».` });
      return null;
    };

    for (const c of pm.cards) {
      const side = sideForPerson(c.teamText, c.name, c.line);
      if (!side) { complete = false; continue; }
      const r = personRef(c.name, c.jersey, clubOf(side), alerts, c.line);
      const label = { GREEN: 'Carton vert', YELLOW: 'Carton jaune', RED: 'Carton rouge' }[c.kind];
      planned.events.push({ kind: 'card', side, who: r.who, as: r.as, detail: label });
      if (!r.ref) { complete = false; continue; }
      write.cards.push({ clubId: clubOf(side).id, person: r.ref, kind: c.kind });
    }
    for (const inj of pm.injuries) {
      const side = sideForPerson(inj.teamText, inj.name, inj.line);
      if (!side) { complete = false; continue; }
      const r = personRef(inj.name, inj.jersey, clubOf(side), alerts, inj.line);
      planned.events.push({ kind: 'injury', side, who: r.who, as: r.as, detail: inj.description || 'Blessure' });
      if (!r.ref) { complete = false; continue; }
      write.injuries.push({ clubId: clubOf(side).id, person: r.ref, notes: inj.description });
    }

    if (complete) writes.push(write);
  }

  // Rencontres de la journée absentes du texte : laissées intactes, on le dit.
  const untouched = input.matches.filter((m) => !used.has(m.id)).length;
  if (untouched > 0 && sheet.matches.length > 0) {
    globalAlerts.push({
      level: 'warning',
      message: `${untouched} rencontre${untouched > 1 ? 's' : ''} de cette journée ne figure${untouched > 1 ? 'nt' : ''} pas dans le texte : ${untouched > 1 ? 'elles ne seront pas modifiées' : 'elle ne sera pas modifiée'}.`,
    });
  }
  if (sheet.matches.length === 0) {
    globalAlerts.push({ level: 'blocking', message: 'Aucune rencontre reconnue. Chaque rencontre commence par une ligne « Équipe A 3 - 1 Équipe B ».' });
  }

  const questionList = [...questions.values()];
  const unanswered = questionList.filter((q) => !isAnswered(q)).length;
  if (unanswered > 0) {
    globalAlerts.push({
      level: 'blocking',
      message: `${unanswered} personne${unanswered > 1 ? 's' : ''} à identifier (voir « Joueurs à identifier »).`,
    });
  }

  const blocking = [...globalAlerts, ...plannedMatches.flatMap((m) => m.alerts)].some((a) => a.level === 'blocking');
  return {
    plan: {
      competitionLabel: input.competitionLabel,
      matchday: input.matchday,
      matches: plannedMatches,
      questions: questionList,
      alerts: globalAlerts,
      overwriteMatchIds: plannedMatches.filter((m) => m.existing && m.matchId).map((m) => m.matchId!),
      ready: !blocking && writes.length === plannedMatches.length && writes.length > 0,
    },
    writes,
    creations: [...creations.values()],
  };

  function isAnswered(q: PersonQuestion): boolean {
    const d = q.decision;
    if (!d) return false;
    if (d.type === 'free') return true;
    if (d.type === 'member') return q.candidates.some((c) => c.id === d.memberId);
    return q.createIn.some((c) => c.clubId === d.clubId);
  }
}

/**
 * Catégorie d'un joueur créé depuis la feuille, déduite de la compétition
 * (« U10-U12 » → U11, « U14 » → U14…). Défaut : SENIOR.
 */
export function memberCategoryFor(competitionCategory: string): 'U11' | 'U14' | 'U17' | 'U19' | 'SENIOR' | 'VETERAN' {
  const f = fold(competitionCategory);
  if (/veteran/.test(f)) return 'VETERAN';
  const n = f.match(/u\s*(\d+)/);
  if (!n) return 'SENIOR';
  const age = Number(n[1]);
  if (age <= 11) return 'U11';
  if (age <= 14) return 'U14';
  if (age <= 17) return 'U17';
  if (age <= 19) return 'U19';
  return 'SENIOR';
}

/** Licence provisoire : `PROV-<CLUB>-<NOM>-<INITIALE>` (convention des scripts, §5.4). */
export function provisionalLicense(clubCode: string, firstName: string, lastName: string): string {
  const up = (s: string) => fold(s).replace(/[^a-z0-9]+/g, '').toUpperCase();
  const last = up(lastName) || up(firstName);
  const initial = lastName ? up(firstName).charAt(0) : '';
  return ['PROV', up(clubCode), last, initial].filter(Boolean).join('-');
}
