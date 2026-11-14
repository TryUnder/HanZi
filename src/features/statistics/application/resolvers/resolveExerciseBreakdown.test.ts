
import { describe, expect, it } from "vitest";

import type {
  ExerciseItemStatistics,
  ItemStatistics,
  VocabularyRecognitionStatistics,
  VocabularyWritingStatistics,
} from "../../domain/types/statistics";

import { resolveExerciseBreakdown } from "./resolveExerciseBreakdown";

type ItemExerciseStatistics = Pick<ItemStatistics, "exerciseStatistics">;

function createRecognitionStatistics(
  overrides: Partial<VocabularyRecognitionStatistics> = {},
): VocabularyRecognitionStatistics {
  return {
    exerciseType: "vocabulary-recognition",
    attemptCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    accuracyRate: 0,
    difficultyRate: 0,
    averageResponseTimeMs: 0,
    lastAttemptAt: "2026-11-14T00:00:00.000Z",
    ...overrides,
  };
}

function createWritingStatistics(
  exerciseType: "writing-practice" | "memory-writing",
  overrides: Partial<VocabularyWritingStatistics> = {},
): VocabularyWritingStatistics {
  return {
    exerciseType,
    attemptCount: 0,
    perfectAttemptCount: 0,
    imperfectAttemptCount: 0,
    perfectAttemptRate: 0,
    correctStrokes: 0,
    totalStrokes: 0,
    strokeAccuracyRate: 0,
    difficultyRate: 0,
    lastAttemptAt: "2026-11-14T00:00:00.000Z",
    ...overrides,
  };
}

function createItem(
  exerciseStatistics: readonly ExerciseItemStatistics[],
): ItemExerciseStatistics {
  return { exerciseStatistics };
}

describe("resolveExerciseBreakdown", () => {
  it("returns all exercise types with zero attempts when there is no data", () => {
    const result = resolveExerciseBreakdown([]);

    expect(result).toHaveLength(3);

    expect(result.map((exercise) => exercise.exerciseType)).toEqual([
      "vocabulary-recognition",
      "writing-practice",
      "memory-writing",
    ]);

    for (const exercise of result) {
      expect(exercise.attemptCount).toBe(0);
      expect(exercise.accuracyRate).toBeNull();
    }
  });

  it("aggregates vocabulary recognition statistics across items", () => {
    const items: ItemExerciseStatistics[] = [
      createItem([
        createRecognitionStatistics({
          attemptCount: 10,
          correctCount: 7,
          incorrectCount: 3,
        }),
      ]),
      createItem([
        createRecognitionStatistics({
          attemptCount: 2,
          correctCount: 2,
          incorrectCount: 0,
        }),
      ]),
    ];

    const result = resolveExerciseBreakdown(items);

    const recognition = result.find(
      (exercise) =>
        exercise.exerciseType === "vocabulary-recognition",
    )!;

    expect(recognition.attemptCount).toBe(12);
    expect(recognition.accuracyRate).toBeCloseTo(9 / 12);
  });

  it("aggregates guided writing and memory writing independently", () => {
    const items: ItemExerciseStatistics[] = [
      createItem([
        createWritingStatistics("writing-practice", {
          attemptCount: 4,
          correctStrokes: 24,
          totalStrokes: 30,
        }),
        createWritingStatistics("memory-writing", {
          attemptCount: 2,
          correctStrokes: 7,
          totalStrokes: 10,
        }),
      ]),
    ];

    const result = resolveExerciseBreakdown(items);

    const guidedWriting = result[1]!;
    const memoryWriting = result[2]!;

    expect(guidedWriting.exerciseType).toBe("writing-practice");
    expect(guidedWriting.attemptCount).toBe(4);
    expect(guidedWriting.accuracyRate).toBeCloseTo(24 / 30);

    expect(memoryWriting.exerciseType).toBe("memory-writing");
    expect(memoryWriting.attemptCount).toBe(2);
    expect(memoryWriting.accuracyRate).toBeCloseTo(7 / 10);
  });
});
