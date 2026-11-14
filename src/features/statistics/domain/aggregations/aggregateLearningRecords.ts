
import type {
  FlashcardRating,
  LearningActivity,
  LearningAttempt,
  LearningRecord,
  LearningStatus,
} from "../../../learning/domain/types";

import type {
  ActivityStatistics,
  DailyActivityStatistics,
  ExerciseItemStatistics,
  ItemStatistics,
  LearningStatistics,
  VocabularyRecognitionStatistics,
  VocabularyWritingStatistics,
} from "../types/statistics";

const ACTIVITIES: readonly LearningActivity[] = [
  "writing",
  "speaking",
  "listening",
  "recognition",
  "flashcard",
];

type VocabularyExerciseType =
  | "vocabulary-recognition"
  | "writing-practice"
  | "memory-writing";

interface ActivityAccumulator {
  attemptCount: number;
  measuredSuccesses: number;
  measuredTotal: number;
  responseTimeTotal: number;
  responseTimeCount: number;
  flashcardRatings: Record<FlashcardRating, number>;
}

interface RecognitionExerciseAccumulator {
  exerciseType: "vocabulary-recognition";
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  responseTimeTotal: number;
  responseTimeCount: number;
  lastAttemptAt: string;
}

interface WritingExerciseAccumulator {
  exerciseType: "writing-practice" | "memory-writing";
  attemptCount: number;
  perfectAttemptCount: number;
  imperfectAttemptCount: number;
  correctStrokes: number;
  totalStrokes: number;
  lastAttemptAt: string;
}

type ExerciseAccumulator =
  | RecognitionExerciseAccumulator
  | WritingExerciseAccumulator;

interface ItemAccumulator {
  item: LearningAttempt["item"];
  attemptCount: number;
  lastAttemptAt: string | null;
  latestStatus: LearningStatus | null;
  latestStatusAt: string | null;
  activities: Record<LearningActivity, number>;
  exerciseStatistics: Map<VocabularyExerciseType, ExerciseAccumulator>;
}

interface DailyAccumulator {
  date: string;
  attemptCount: number;
  activities: Partial<Record<LearningActivity, number>>;
}

function createActivityAccumulator(): ActivityAccumulator {
  return {
    attemptCount: 0,
    measuredSuccesses: 0,
    measuredTotal: 0,
    responseTimeTotal: 0,
    responseTimeCount: 0,
    flashcardRatings: {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    },
  };
}

function createItemAccumulator(
  item: LearningAttempt["item"],
): ItemAccumulator {
  return {
    item,
    attemptCount: 0,
    lastAttemptAt: null,
    latestStatus: null,
    latestStatusAt: null,
    activities: {
      writing: 0,
      speaking: 0,
      listening: 0,
      recognition: 0,
      flashcard: 0,
    },
    exerciseStatistics: new Map(),
  };
}

function getItemKey(item: LearningAttempt["item"]): string {
  return `${item.kind}:${item.id}`;
}

function isVocabularyCharacterAttempt(
  attempt: LearningAttempt,
): boolean {
  return (
    attempt.activity === "writing" &&
    "kind" in attempt.details &&
    attempt.details.kind === "vocabulary-character"
  );
}

function getVocabularyExerciseType(
  attempt: LearningAttempt,
): VocabularyExerciseType | null {
  if (attempt.item.kind !== "vocabulary") {
    return null;
  }

  if (attempt.activity === "recognition") {
    return "vocabulary-recognition";
  }

  if (attempt.activity !== "writing" || !("kind" in attempt.details)) {
    return null;
  }

  if (attempt.details.kind === "vocabulary") {
    return "writing-practice";
  }

  if (attempt.details.kind === "memory") {
    return "memory-writing";
  }

  return null;
}

function createExerciseAccumulator(
  exerciseType: VocabularyExerciseType,
  occurredAt: string,
): ExerciseAccumulator {
  if (exerciseType === "vocabulary-recognition") {
    return {
      exerciseType,
      attemptCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      responseTimeTotal: 0,
      responseTimeCount: 0,
      lastAttemptAt: occurredAt,
    };
  }

  return {
    exerciseType,
    attemptCount: 0,
    perfectAttemptCount: 0,
    imperfectAttemptCount: 0,
    correctStrokes: 0,
    totalStrokes: 0,
    lastAttemptAt: occurredAt,
  };
}

function addExerciseResult(
  accumulator: ExerciseAccumulator,
  attempt: LearningAttempt,
): void {
  accumulator.attemptCount += 1;

  if (attempt.occurredAt > accumulator.lastAttemptAt) {
    accumulator.lastAttemptAt = attempt.occurredAt;
  }

  if (accumulator.exerciseType === "vocabulary-recognition") {
    if (attempt.activity !== "recognition") {
      return;
    }

    if (attempt.details.isCorrect) {
      accumulator.correctCount += 1;
    } else {
      accumulator.incorrectCount += 1;
    }

    if (attempt.details.responseTimeMs !== undefined) {
      accumulator.responseTimeTotal += attempt.details.responseTimeMs;
      accumulator.responseTimeCount += 1;
    }

    return;
  }

  if (attempt.activity !== "writing" || !("kind" in attempt.details)) {
    return;
  }

  const details = attempt.details;

  if (
    accumulator.exerciseType === "writing-practice" &&
    details.kind !== "vocabulary"
  ) {
    return;
  }

  if (
    accumulator.exerciseType === "memory-writing" &&
    details.kind !== "memory"
  ) {
    return;
  }

  accumulator.correctStrokes += details.correctStrokes;
  accumulator.totalStrokes += details.totalStrokes;

  if (details.mistakes === 0) {
    accumulator.perfectAttemptCount += 1;
  } else {
    accumulator.imperfectAttemptCount += 1;
  }
}

/**
 * Returns an error/difficulty indicator between 0 and 1.
 * Null means the attempt cannot be objectively evaluated.
 */

function addActivityResult(
  accumulator: ActivityAccumulator,
  attempt: LearningAttempt,
): void {
  accumulator.attemptCount += 1;

  switch (attempt.activity) {
    case "writing": {
      accumulator.measuredSuccesses += attempt.details.correctStrokes;
      accumulator.measuredTotal += attempt.details.totalStrokes;
      break;
    }

    case "speaking": {
      const status = attempt.details.assessmentStatus;

      if (status !== "insufficient-data") {
        accumulator.measuredTotal += 1;

        if (status === "matched") {
          accumulator.measuredSuccesses += 1;
        }
      }

      break;
    }

    case "listening": {
      accumulator.measuredSuccesses += attempt.details.correctAnswers;
      accumulator.measuredTotal += attempt.details.questionCount;
      break;
    }

    case "recognition": {
      accumulator.measuredTotal += 1;

      if (attempt.details.isCorrect) {
        accumulator.measuredSuccesses += 1;
      }

      if (attempt.details.responseTimeMs !== undefined) {
        accumulator.responseTimeTotal += attempt.details.responseTimeMs;
        accumulator.responseTimeCount += 1;
      }

      break;
    }

    case "flashcard": {
      accumulator.flashcardRatings[attempt.details.rating] += 1;

      if (attempt.details.responseTimeMs !== undefined) {
        accumulator.responseTimeTotal += attempt.details.responseTimeMs;
        accumulator.responseTimeCount += 1;
      }

      break;
    }
  }
}

function toActivityStatistics(
  activity: LearningActivity,
  accumulator: ActivityAccumulator,
): ActivityStatistics {
  const accuracyRate =
    accumulator.measuredTotal > 0
      ? accumulator.measuredSuccesses / accumulator.measuredTotal
      : null;

  const averageResponseTimeMs =
    accumulator.responseTimeCount > 0
      ? accumulator.responseTimeTotal / accumulator.responseTimeCount
      : null;

  return {
    activity,
    attemptCount: accumulator.attemptCount,
    accuracyRate,
    measuredSuccesses: accumulator.measuredSuccesses,
    measuredTotal: accumulator.measuredTotal,
    averageResponseTimeMs,
    flashcardRatings: { ...accumulator.flashcardRatings },
  };
}

function toRecognitionStatistics(
  accumulator: RecognitionExerciseAccumulator,
): VocabularyRecognitionStatistics {
  const attemptCount = accumulator.attemptCount;

  const accuracyRate =
    attemptCount > 0 ? accumulator.correctCount / attemptCount : 0;

  const averageResponseTimeMs =
    accumulator.responseTimeCount > 0
      ? accumulator.responseTimeTotal / accumulator.responseTimeCount
      : null;

  return {
    exerciseType: accumulator.exerciseType,
    attemptCount,
    correctCount: accumulator.correctCount,
    incorrectCount: accumulator.incorrectCount,
    accuracyRate,
    difficultyRate: 1 - accuracyRate,
    averageResponseTimeMs,
    lastAttemptAt: accumulator.lastAttemptAt,
  };
}

function toWritingStatistics(
  accumulator: WritingExerciseAccumulator,
): VocabularyWritingStatistics {
  const attemptCount = accumulator.attemptCount;

  const perfectAttemptRate =
    attemptCount > 0
      ? accumulator.perfectAttemptCount / attemptCount
      : 0;

  const strokeAccuracyRate =
    accumulator.totalStrokes > 0
      ? accumulator.correctStrokes / accumulator.totalStrokes
      : null;

  return {
    exerciseType: accumulator.exerciseType,
    attemptCount,
    perfectAttemptCount: accumulator.perfectAttemptCount,
    imperfectAttemptCount: accumulator.imperfectAttemptCount,
    perfectAttemptRate,
    correctStrokes: accumulator.correctStrokes,
    totalStrokes: accumulator.totalStrokes,
    strokeAccuracyRate,
    difficultyRate:
      strokeAccuracyRate === null ? null : 1 - strokeAccuracyRate,
    lastAttemptAt: accumulator.lastAttemptAt,
  };
}

function toExerciseStatistics(
  accumulator: ExerciseAccumulator,
): ExerciseItemStatistics {
  if (accumulator.exerciseType === "vocabulary-recognition") {
    return toRecognitionStatistics(accumulator);
  }

  return toWritingStatistics(accumulator);
}

function toItemStatistics(accumulator: ItemAccumulator): ItemStatistics {
  const activities = ACTIVITIES.filter(
    (activity) => accumulator.activities[activity] > 0,
  ).map((activity) => ({
    activity,
    attemptCount: accumulator.activities[activity],
  }));

  const exerciseStatistics = Array.from(
    accumulator.exerciseStatistics.values(),
  )
    .map(toExerciseStatistics)
    .sort((a, b) => {
      const order: readonly VocabularyExerciseType[] = [
        "vocabulary-recognition",
        "writing-practice",
        "memory-writing",
      ];

      return (
        order.indexOf(a.exerciseType) - order.indexOf(b.exerciseType)
      );
    });

  return {
    item: accumulator.item,
    attemptCount: accumulator.attemptCount,
    lastAttemptAt: accumulator.lastAttemptAt,
    latestStatus: accumulator.latestStatus,
    activities,
    exerciseStatistics,
  };
}

function toDailyActivityStatistics(
  accumulator: DailyAccumulator,
): DailyActivityStatistics {
  return {
    date: accumulator.date,
    attemptCount: accumulator.attemptCount,
    activities: { ...accumulator.activities },
  };
}

/**
 * Aggregates persisted learning records into statistics.
 *
 * Vocabulary-character records are supporting details of a word-writing
 * attempt. They are excluded from attempt-level totals to avoid double
 * counting the same exercise.
 *
 * This function has no side effects and does not depend on React,
 * Supabase or browser storage.
 */
export function aggregateLearningRecords(
  records: readonly LearningRecord[],
): LearningStatistics {
  const activityAccumulators = new Map<LearningActivity, ActivityAccumulator>();

  for (const activity of ACTIVITIES) {
    activityAccumulators.set(activity, createActivityAccumulator());
  }

  const itemAccumulators = new Map<string, ItemAccumulator>();
  const dailyAccumulators = new Map<string, DailyAccumulator>();
  const trackedSessions = new Set<string>();

  let attemptCount = 0;
  let statusChangeCount = 0;

  let firstActivityAt: string | null = null;
  let lastActivityAt: string | null = null;

  for (const record of records) {
    if (firstActivityAt === null || record.occurredAt < firstActivityAt) {
      firstActivityAt = record.occurredAt;
    }

    if (lastActivityAt === null || record.occurredAt > lastActivityAt) {
      lastActivityAt = record.occurredAt;
    }

    if (record.context?.sessionId) {
      trackedSessions.add(record.context.sessionId);
    }

    if (record.recordType === "status-changed") {
      const itemKey = getItemKey(record.item);

      let itemAccumulator = itemAccumulators.get(itemKey);

      if (!itemAccumulator) {
        itemAccumulator = createItemAccumulator(record.item);
        itemAccumulators.set(itemKey, itemAccumulator);
      }

      statusChangeCount += 1;

      if (
        itemAccumulator.latestStatusAt === null ||
        record.occurredAt >= itemAccumulator.latestStatusAt
      ) {
        itemAccumulator.latestStatus = record.status;
        itemAccumulator.latestStatusAt = record.occurredAt;
      }

      continue;
    }

    // Character-level records are supporting data for vocabulary writing.
    // The corresponding word-level record represents the actual attempt.
    if (isVocabularyCharacterAttempt(record)) {
      continue;
    }

    attemptCount += 1;

    const itemKey = getItemKey(record.item);

    let itemAccumulator = itemAccumulators.get(itemKey);

    if (!itemAccumulator) {
      itemAccumulator = createItemAccumulator(record.item);
      itemAccumulators.set(itemKey, itemAccumulator);
    }

    itemAccumulator.attemptCount += 1;
    itemAccumulator.activities[record.activity] += 1;

    if (
      itemAccumulator.lastAttemptAt === null ||
      record.occurredAt > itemAccumulator.lastAttemptAt
    ) {
      itemAccumulator.lastAttemptAt = record.occurredAt;
    }

    const activityAccumulator = activityAccumulators.get(record.activity);

    if (activityAccumulator) {
      addActivityResult(activityAccumulator, record);
    }

    const exerciseType = getVocabularyExerciseType(record);

    if (exerciseType) {
      let exerciseAccumulator =
        itemAccumulator.exerciseStatistics.get(exerciseType);

      if (!exerciseAccumulator) {
        exerciseAccumulator = createExerciseAccumulator(
          exerciseType,
          record.occurredAt,
        );

        itemAccumulator.exerciseStatistics.set(
          exerciseType,
          exerciseAccumulator,
        );
      }

      addExerciseResult(exerciseAccumulator, record);
    }

    const date = record.occurredAt.slice(0, 10);

    let dailyAccumulator = dailyAccumulators.get(date);

    if (!dailyAccumulator) {
      dailyAccumulator = {
        date,
        attemptCount: 0,
        activities: {},
      };

      dailyAccumulators.set(date, dailyAccumulator);
    }

    dailyAccumulator.attemptCount += 1;
    dailyAccumulator.activities[record.activity] =
      (dailyAccumulator.activities[record.activity] ?? 0) + 1;
  }

  const activities = ACTIVITIES.map((activity) =>
    toActivityStatistics(activity, activityAccumulators.get(activity)!),
  ).filter((activity) => activity.attemptCount > 0);

  const items = Array.from(itemAccumulators.values())
    .map(toItemStatistics)
    .sort((a, b) => {
      const aLastAttempt = a.lastAttemptAt ?? "";
      const bLastAttempt = b.lastAttemptAt ?? "";

      return bLastAttempt.localeCompare(aLastAttempt);
    });

  const dailyActivity = Array.from(dailyAccumulators.values())
    .map(toDailyActivityStatistics)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    overview: {
      recordCount: records.length,
      attemptCount,
      statusChangeCount,
      distinctItemCount: itemAccumulators.size,
      trackedSessionCount: trackedSessions.size,
      firstActivityAt,
      lastActivityAt,
    },
    activities,
    items,
    dailyActivity,
  };
}
