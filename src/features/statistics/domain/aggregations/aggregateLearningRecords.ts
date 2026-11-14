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
  ItemStatistics,
  LearningStatistics,
} from "../types/statistics";

const ACTIVITIES: readonly LearningActivity[] = [
  "writing",
  "speaking",
  "listening",
  "recognition",
  "flashcard",
];

interface ActivityAccumulator {
  attemptCount: number;
  measuredSuccesses: number;
  measuredTotal: number;
  responseTimeTotal: number;
  responseTimeCount: number;
  flashcardRatings: Record<FlashcardRating, number>;
}

interface ItemAccumulator {
  item: LearningAttempt["item"];
  attemptCount: number;
  difficultyTotal: number;
  difficultyCount: number;
  lastAttemptAt: string | null;
  latestStatus: LearningStatus | null;
  latestStatusAt: string | null;
  activities: Record<LearningActivity, number>;
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

function createItemAccumulator(item: LearningAttempt["item"]): ItemAccumulator {
  return {
    item,
    attemptCount: 0,
    difficultyTotal: 0,
    difficultyCount: 0,
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
  };
}

function getItemKey(item: LearningAttempt["item"]): string {
  return `${item.kind}:${item.id}`;
}

/**
 * Returns an error/difficulty indicator between 0 and 1.
 * Null means the attempt cannot be objectively evaluated.
 */
function getAttemptDifficulty(attempt: LearningAttempt): number | null {
  switch (attempt.activity) {
    case "writing": {
      const { correctStrokes, totalStrokes } = attempt.details;

      if (totalStrokes <= 0) {
        return null;
      }

      return 1 - correctStrokes / totalStrokes;
    }

    case "speaking": {
      const status = attempt.details.assessmentStatus;

      if (status === "matched") {
        return 0;
      }

      if (status === "ambiguous") {
        return 0.5;
      }

      if (status === "uncertain") {
        return 1;
      }

      return null;
    }

    case "listening": {
      const { correctAnswers, questionCount } = attempt.details;

      if (questionCount <= 0) {
        return null;
      }

      return 1 - correctAnswers / questionCount;
    }

    case "recognition":
      return attempt.details.isCorrect ? 0 : 1;

    case "flashcard":
      switch (attempt.details.rating) {
        case "again":
          return 1;
        case "hard":
          return 0.5;
        case "good":
        case "easy":
          return 0;
      }
  }
}

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

function toItemStatistics(accumulator: ItemAccumulator): ItemStatistics {
  const difficultyRate =
    accumulator.difficultyCount > 0
      ? accumulator.difficultyTotal / accumulator.difficultyCount
      : null;

  const activities = ACTIVITIES.filter(
    (activity) => accumulator.activities[activity] > 0,
  ).map((activity) => ({
    activity,
    attemptCount: accumulator.activities[activity],
  }));

  return {
    item: accumulator.item,
    attemptCount: accumulator.attemptCount,
    difficultyRate,
    lastAttemptAt: accumulator.lastAttemptAt,
    latestStatus: accumulator.latestStatus,
    activities,
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

    const itemKey = getItemKey(record.item);

    let itemAccumulator = itemAccumulators.get(itemKey);

    if (!itemAccumulator) {
      itemAccumulator = createItemAccumulator(record.item);
      itemAccumulators.set(itemKey, itemAccumulator);
    }

    if (record.recordType === "status-changed") {
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

    attemptCount += 1;
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

    const difficulty = getAttemptDifficulty(record);

    if (difficulty !== null) {
      itemAccumulator.difficultyTotal += difficulty;
      itemAccumulator.difficultyCount += 1;
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
      if (a.difficultyRate === null) return 1;
      if (b.difficultyRate === null) return -1;

      return b.difficultyRate - a.difficultyRate;
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
