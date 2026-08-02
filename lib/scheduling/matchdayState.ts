// État d'UNE journée, par opposition à `competitionState.ts` qui décrit la
// compétition entière.
//
// C'est la brique qui permet de supprimer l'opposition brouillon / officiel.
// Aujourd'hui l'admin bascule entre deux écrans — deux modèles mentaux — alors
// qu'en base il n'y a qu'un fait : `DraftSlot.convertedMatchId` est nul ou ne
// l'est pas. Une journée n'est pas « dans le brouillon » ou « dans l'officiel »,
// elle a un état, et cet état se déduit de ses créneaux.
//
// Règle qui gouverne tout le module, et qui est la réponse au reproche
// « pas de droit à l'erreur » : **rien n'est définitif tant qu'aucun score
// n'est saisi.** Publier et dépublier sont symétriques ; le seul vrai verrou
// est un match joué, parce que dépublier effacerait un résultat.

import type { ActionState } from './competitionState';

export type MatchdayMatch = {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type MatchdaySlot = {
  slotId: string;
  /** Rang de la date dans le calendrier — sert à regrouper et à ordonner. */
  matchday: number;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  plannedHomeClubId: string | null;
  plannedAwayClubId: string | null;
  /** Match créé à partir de ce créneau, s'il existe. */
  match: MatchdayMatch | null;
};

export type MatchdayStatus =
  /** Aucune affiche posée : le tirage n'a pas encore couvert cette journée. */
  | 'vide'
  /** Affiches posées, rien de publié. */
  | 'tiree'
  /** Une partie seulement des créneaux est publiée. */
  | 'partielle'
  /** Tout est publié, aucun score saisi — donc encore entièrement réversible. */
  | 'publiee'
  /** Au moins un score saisi : la journée a commencé à exister sportivement. */
  | 'jouee';

export type MatchdayCounts = {
  total: number;
  /** Créneaux portant une affiche (les deux équipes connues). */
  drawn: number;
  published: number;
  played: number;
};

export type Matchday = {
  matchday: number;
  date: string;
  slotIds: string[];
  status: MatchdayStatus;
  counts: MatchdayCounts;
  actions: {
    publish: ActionState;
    unpublish: ActionState;
  };
};

/**
 * Un match compte comme joué dès qu'un score est saisi, même partiellement, ou
 * que son statut est terminal. On ne se fie pas au seul statut : un score peut
 * être saisi avant que quiconque pense à changer le statut, et c'est bien le
 * score qu'on refuse de détruire.
 */
export function isPlayed(m: MatchdayMatch): boolean {
  return m.homeScore != null || m.awayScore != null || m.status === 'FINISHED';
}

const LABEL: Record<MatchdayStatus, string> = {
  vide: 'à tirer',
  tiree: 'tirée',
  partielle: 'partiellement publiée',
  publiee: 'publiée',
  jouee: 'jouée',
};

export function matchdayLabel(status: MatchdayStatus): string {
  return LABEL[status];
}

/**
 * Regroupe les créneaux d'UNE compétition par journée et déduit l'état de
 * chacune. Les journées sortent triées par date, puis par rang — l'ordre dans
 * lequel l'admin les lit.
 */
export function computeMatchdays(slots: MatchdaySlot[]): Matchday[] {
  const groups = new Map<number, MatchdaySlot[]>();
  for (const s of slots) {
    const bucket = groups.get(s.matchday);
    if (bucket) bucket.push(s);
    else groups.set(s.matchday, [s]);
  }

  const out: Matchday[] = [];
  for (const [matchday, group] of groups) {
    const total = group.length;
    const drawn = group.filter(
      (s) => s.plannedHomeClubId != null && s.plannedAwayClubId != null,
    ).length;
    const published = group.filter((s) => s.match != null).length;
    const played = group.filter((s) => s.match != null && isPlayed(s.match)).length;

    out.push({
      matchday,
      date: group[0].date,
      slotIds: group.map((s) => s.slotId),
      status: statusOf({ total, drawn, published, played }),
      counts: { total, drawn, published, played },
      actions: {
        publish: publishAction(total, published),
        unpublish: unpublishAction(published, played),
      },
    });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.matchday - b.matchday);
}

function statusOf({ total, drawn, published, played }: MatchdayCounts): MatchdayStatus {
  if (played > 0) return 'jouee';
  if (published === 0) return drawn === 0 ? 'vide' : 'tiree';
  if (published < total) return 'partielle';
  return 'publiee';
}

function publishAction(total: number, published: number): ActionState {
  if (published >= total) {
    return { allowed: false, reason: 'Toute la journée est déjà publiée.' };
  }
  return { allowed: true };
}

function unpublishAction(published: number, played: number): ActionState {
  if (published === 0) {
    return { allowed: false, reason: "Rien n'est publié sur cette journée." };
  }
  if (played > 0) {
    return {
      allowed: false,
      reason:
        played === 1
          ? 'Un match de cette journée a déjà un score : dépublier l’effacerait.'
          : `${played} matchs de cette journée ont déjà un score : dépublier les effacerait.`,
    };
  }
  return { allowed: true };
}
