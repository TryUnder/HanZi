export type LearningExerciseType =
  | "vocabulary-recognition"
  | "writing-practice"
  | "memory-writing"
  | "flashcards";

export type LearningSessionStatus = "in-progress" | "completed" | "abandoned";

export interface LearningSessionContext {
  readonly courseId: string;
  readonly lessonId: string;
  readonly activityId: string;
}

export interface LearningSession {
  readonly id: string;
  readonly exerciseType: LearningExerciseType;
  readonly status: LearningSessionStatus;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly totalItems: number;
  readonly completedItems: number;
  readonly context?: LearningSessionContext;
}
