export type WritingMode = "learn" | "practice";

export interface WritingProgress {
  correctStrokes: number;
  totalStrokes: number;
  mistakes: number;
  completed: boolean;
}

export interface WritingSessionResult {
  characterId: string;
  character: string;
  correctStrokes: number;
  totalStrokes: number;
  mistakes: number;
  completedAt: string;
}

export interface StoredWritingSession extends WritingSessionResult {
  id: string;
}
