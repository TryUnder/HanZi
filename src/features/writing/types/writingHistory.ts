import type { StrokeMistake } from "./writing";

export interface WritingHistoryEntry {
  readonly id: string;
  readonly characterId: string;
  readonly character: string;
  readonly correctStrokes: number;
  readonly totalStrokes: number;
  readonly mistakes: number;
  readonly completedAt: string;
  readonly strokeMistakes: readonly StrokeMistake[];
}
