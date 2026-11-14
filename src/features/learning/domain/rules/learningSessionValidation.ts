import type {
  LearningExerciseType,
  LearningSession,
  LearningSessionStatus,
} from "../types/learningSession";

const EXERCISE_TYPES: readonly LearningExerciseType[] = [
  "vocabulary-recognition",
  "writing-practice",
  "memory-writing",
  "flashcards",
];

const SESSION_STATUSES: readonly LearningSessionStatus[] = [
  "in-progress",
  "completed",
  "abandoned",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isLearningSession(value: unknown): value is LearningSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;

  if (
    !isNonEmptyString(session.id) ||
    !EXERCISE_TYPES.includes(session.exerciseType as LearningExerciseType) ||
    !SESSION_STATUSES.includes(session.status as LearningSessionStatus) ||
    typeof session.startedAt !== "string" ||
    !Number.isFinite(Date.parse(session.startedAt)) ||
    !Number.isInteger(session.totalItems) ||
    !Number.isInteger(session.completedItems) ||
    (session.totalItems as number) <= 0 ||
    (session.completedItems as number) < 0 ||
    (session.completedItems as number) > (session.totalItems as number)
  ) {
    return false;
  }

  if (
    session.completedAt !== null &&
    (typeof session.completedAt !== "string" ||
      !Number.isFinite(Date.parse(session.completedAt)))
  ) {
    return false;
  }

  if (session.status === "completed") {
    if (
      session.completedAt === null ||
      session.completedItems !== session.totalItems
    ) {
      return false;
    }
  } else if (session.completedAt !== null) {
    return false;
  }

  if (
    session.context !== undefined &&
    (typeof session.context !== "object" ||
      session.context === null ||
      !isNonEmptyString(
        (session.context as Record<string, unknown>).courseId,
      ) ||
      !isNonEmptyString(
        (session.context as Record<string, unknown>).lessonId,
      ) ||
      !isNonEmptyString(
        (session.context as Record<string, unknown>).activityId,
      ))
  ) {
    return false;
  }

  return true;
}
