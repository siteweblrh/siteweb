// État complet d'une compétition sur un calendrier : où elle en est, ce qui
// est possible, et POURQUOI ce qui ne l'est pas.
//
// Pourquoi ce module existe
// -------------------------
// Chaque bouton du panneau calculait sa propre condition dans son coin. Deux
// bugs en une journée en sont sortis : un bouton d'ajustement masqué dès la
// première journée convertie (condition oubliée lors d'un assouplissement
// serveur), et un bouton de tirage grisé à tort sur une configuration valide
// (créneaux de phase finale comptés comme un excédent).
//
// La règle qu'on en tire : **une seule fonction décide, l'interface ne fait que
// rendre.** Et surtout, une action interdite porte toujours sa raison — c'est
// ce qui permet d'expliquer au lieu de simplement bloquer.
//
// Fonction pure et client-safe : testable sans base ni navigateur.

import { computeCoverage, type Coverage, type CoverageSlot, type CoverageConfig } from './coverage';
import { cupLayout } from './bracket';

export type CompetitionFormat = 'CHAMPIONSHIP' | 'CHAMPIONSHIP_PLAYOFFS' | 'CUP';

export type StateSlot = CoverageSlot & {
  matchday: number;
  /** ISO `YYYY-MM-DD`, pour ordonner les journées. */
  date: string;
};

export type CompetitionStateInput = {
  format: CompetitionFormat;
  teamCount: number;
  doubleRound: boolean;
  slots: StateSlot[];
};

export type StepId = 'teams' | 'dates' | 'draw' | 'publish';
export type StepStatus = 'todo' | 'doing' | 'done' | 'blocked';

export type Step = {
  id: StepId;
  label: string;
  status: StepStatus;
  /** Ce qu'on peut lire d'un coup d'œil : « 4 inscrites », « 3 sur 4 publiées ». */
  detail: string;
};

/** Une action possible, ou impossible AVEC SA RAISON — jamais un simple `false`. */
export type ActionState = { allowed: true } | { allowed: false; reason: string };

export type CompetitionState = {
  coverage: Coverage;
  /** Les créneaux ne forment pas la structure exigée par le format. */
  shapeWrong: boolean;
  /** Répartition par journée attendue, si le format en impose une. */
  wantedShape: number[] | null;
  actualShape: number[];
  steps: Step[];
  /** Étape sur laquelle l'utilisateur doit agir maintenant. */
  currentStep: StepId;
  actions: {
    autoFit: ActionState;
    draw: ActionState;
    clear: ActionState;
  };
};

const FINALS_SLOTS = 2;

export function computeCompetitionState(input: CompetitionStateInput): CompetitionState {
  const { format, teamCount, doubleRound, slots } = input;
  const isCup = format === 'CUP';
  const hasFinals = format === 'CHAMPIONSHIP_PLAYOFFS';

  const config: CoverageConfig = isCup
    ? { kind: 'cup', teamCount, includeThirdPlace: true }
    : { kind: 'round-robin', teamCount, doubleRound, finalsSlots: hasFinals ? FINALS_SLOTS : 0 };

  const coverage = computeCoverage(config, slots);

  // --- forme : le total peut être juste et la structure fausse -------------
  const actualShape = shapeOf(slots);
  const wantedShape = isCup ? nonEmpty(cupLayout(teamCount, true)) : null;
  const shapeWrong =
    wantedShape != null &&
    (actualShape.length !== wantedShape.length ||
      actualShape.some((n, i) => n !== wantedShape[i]));

  const countsWrong =
    coverage.status === 'missing-slots' || coverage.status === 'extra-slots';
  const unusableTeams =
    coverage.status === 'no-teams' || coverage.status === 'unbalanced-bracket';

  // --- actions, chacune avec sa raison de refus ----------------------------
  const autoFit: ActionState = unusableTeams
    ? { allowed: false, reason: coverage.message }
    : coverage.slotCount === 0
      ? { allowed: false, reason: "Ajoutez d'abord la compétition au calendrier." }
      : { allowed: true };

  const draw: ActionState = unusableTeams
    ? { allowed: false, reason: coverage.message }
    : coverage.slotCount === 0
      ? { allowed: false, reason: "Aucun créneau : ajoutez la compétition au calendrier." }
      : countsWrong
        ? { allowed: false, reason: "Le nombre de créneaux ne correspond pas au nombre de matchs. Ajustez le calendrier d'abord." }
        : shapeWrong
          ? { allowed: false, reason: `La répartition par journée ne forme pas un tableau : il faut ${wantedShape!.join(' puis ')} matchs.` }
          : { allowed: true };

  const clear: ActionState = coverage.plannedCount === 0
    ? { allowed: false, reason: 'Aucun tirage à effacer.' }
    : { allowed: true };

  // --- étapes ---------------------------------------------------------------
  // `drawableSlots` vient de coverage : le recalculer ici m'avait déjà fait
  // écrire une formule fausse pour les championnats à phase finale.
  const { drawableSlots } = coverage;
  const drawDone = coverage.plannedCount > 0 && coverage.plannedCount >= drawableSlots;
  const publishTotal = coverage.slotCount;

  const steps: Step[] = [
    {
      id: 'teams',
      label: 'Équipes',
      status: unusableTeams ? 'blocked' : 'done',
      detail: unusableTeams
        ? coverage.message
        : `${teamCount} inscrite${teamCount > 1 ? 's' : ''}`,
    },
    {
      id: 'dates',
      label: 'Dates',
      status: unusableTeams
        ? 'todo'
        : coverage.slotCount === 0 || countsWrong || shapeWrong
          ? 'blocked'
          : 'done',
      detail: describeDates(coverage, actualShape, wantedShape, shapeWrong, countsWrong),
    },
    {
      id: 'draw',
      label: 'Tirage',
      status: !draw.allowed && !drawDone
        ? 'todo'
        : drawDone
          ? 'done'
          : coverage.plannedCount > 0
            ? 'doing'
            : 'todo',
      detail: drawDone
        ? `${coverage.plannedCount} match${coverage.plannedCount > 1 ? 's' : ''} réparti${coverage.plannedCount > 1 ? 's' : ''}`
        : coverage.plannedCount > 0
          ? `${coverage.plannedCount} sur ${Math.max(drawableSlots, 0)}`
          : 'pas encore lancé',
    },
    {
      id: 'publish',
      label: 'Publication',
      status: coverage.convertedCount === 0
        ? 'todo'
        : coverage.convertedCount >= publishTotal
          ? 'done'
          : 'doing',
      detail: coverage.convertedCount === 0
        ? 'aucun match publié'
        : `${coverage.convertedCount} sur ${publishTotal} publié${coverage.convertedCount > 1 ? 's' : ''}`,
    },
  ];

  const currentStep =
    steps.find((s) => s.status === 'blocked')?.id
    ?? steps.find((s) => s.status === 'todo' || s.status === 'doing')?.id
    ?? 'publish';

  return { coverage, shapeWrong, wantedShape, actualShape, steps, currentStep, actions: { autoFit, draw, clear } };
}

/** Nombre de créneaux par journée, dans l'ordre chronologique. */
function shapeOf(slots: StateSlot[]): number[] {
  const perDay = new Map<number, { date: string; n: number }>();
  for (const s of slots) {
    const cur = perDay.get(s.matchday) ?? { date: s.date, n: 0 };
    cur.n += 1;
    if (s.date < cur.date) cur.date = s.date;
    perDay.set(s.matchday, cur);
  }
  return [...perDay.values()].sort((a, b) => a.date.localeCompare(b.date)).map((d) => d.n);
}

function nonEmpty(a: number[]): number[] | null {
  return a.length > 0 ? a : null;
}

function describeDates(
  coverage: Coverage,
  actual: number[],
  wanted: number[] | null,
  shapeWrong: boolean,
  countsWrong: boolean,
): string {
  if (coverage.slotCount === 0) return 'aucune journée';
  if (countsWrong) {
    return coverage.slotDelta > 0
      ? `il manque ${coverage.slotDelta} créneau${coverage.slotDelta > 1 ? 'x' : ''}`
      : `${-coverage.slotDelta} créneau${-coverage.slotDelta > 1 ? 'x' : ''} de trop`;
  }
  if (shapeWrong && wanted) return `${actual.join('+')} au lieu de ${wanted.join('+')}`;
  return `${actual.length} journée${actual.length > 1 ? 's' : ''} · ${actual.join('+')} matchs`;
}
