export type WritingMode = "learn" | "practice";

export interface StrokeMistake {
  /**
   * Zero-based index returned by Hanzi Writer.
   * Example: 0 represents the first stroke.
   */
  strokeIndex: number;
  mistakes: number;
}

export interface WritingMistakeEvent {
  strokeNum: number;
  mistakesOnStroke: number;
  totalMistakes: number;
}

export interface WritingProgress {
  correctStrokes: number;
  totalStrokes: number;
  mistakes: number;
  strokeMistakes: StrokeMistake[];
  completed: boolean;
}

export interface WritingSessionResult {
  characterId: string;
  character: string;
  correctStrokes: number;
  totalStrokes: number;
  mistakes: number;
  completedAt: string;

  /**
   * Optional to support sessions saved by older versions of HanZi.
   */
  strokeMistakes?: StrokeMistake[];
}

export interface PracticeCharacterResult {
  readonly character: string;
  readonly correctStrokes: number;
  readonly totalStrokes: number;
  readonly totalMistakes: number;
}
