import type { DraftCalendarData } from './types';

// Extrait de DraftCalendarAdmin.tsx (2200 lignes) — un fichier, une responsabilite.

export type Patch =
  | { kind: 'delete-calendar'; id: string }
  | { kind: 'add-calendar'; cal: DraftCalendarData };

export function reducer(state: DraftCalendarData[], patch: Patch): DraftCalendarData[] {
  switch (patch.kind) {
    case 'delete-calendar':
      return state.filter((c) => c.id !== patch.id);
    case 'add-calendar':
      return [patch.cal, ...state];
    default:
      return state;
  }
}
