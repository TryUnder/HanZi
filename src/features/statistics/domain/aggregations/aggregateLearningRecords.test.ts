
import { describe, expect, it } from "vitest";

import type { LearningRecord } from "../../../learning/domain/types";

import { aggregateLearningRecords } from "./aggregateLearningRecords";

const records: LearningRecord[] = [
  {
    id: "writing-1",
    recordType: "attempt",
    activity: "writing",
    item: { kind: "character", id: "ni" },
    occurredAt: "2026-11-10T10:00:00.000Z",
    context: {
      courseId: "hsk-1",
      lessonId: "lesson-1",
      activityId: "writing",
      sessionId: "session-1",
    },
    details: {
      correctStrokes: 8,
      totalStrokes: 10,
      mistakes: 2,
    },
  },
  {
    id: "listening-1",
    recordType: "attempt",
    activity: "listening",
    item: { kind: "vocabulary", id: "hello" },
    occurredAt: "2026-11-10T11:00:00.000Z",
    context: {
      courseId: "hsk-1",
      lessonId: "lesson-1",
      activityId: "listening",
      sessionId: "session-1",
    },
    details: {
      mode: "pinyin",
      questionCount: 10,
      correctAnswers: 7,
    },
  },
  {
    id: "recognition-1",
    recordType: "attempt",
    activity: "recognition",
    item: { kind: "character", id: "ni" },
    occurredAt: "2026-11-11T10:00:00.000Z",
    details: {
      isCorrect: false,
      responseTimeMs: 2500,
    },
  },
  {
    id: "flashcard-1",
    recordType: "attempt",
    activity: "flashcard",
    item: { kind: "vocabulary", id: "hello" },
    occurredAt: "2026-11-11T11:00:00.000Z",
    details: {
      rating: "hard",
      responseTimeMs: 1800,
    },
  },
  {
    id: "status-1",
    recordType: "status-changed",
    item: { kind: "character", id: "ni" },
    occurredAt: "2026-11-11T12:00:00.000Z",
    status: "needs-practice",
  },
];

const vocabularyExerciseRecords: LearningRecord[] = [
  {
    id: "recognition-1",
    recordType: "attempt",
    activity: "recognition",
    item: { kind: "vocabulary", id: "hello" },
    occurredAt: "2026-11-12T10:00:00.000Z",
    details: {
      isCorrect: true,
      responseTimeMs: 1200,
    },
  },
  {
    id: "recognition-2",
    recordType: "attempt",
    activity: "recognition",
    item: { kind: "vocabulary", id: "hello" },
    occurredAt: "2026-11-12T10:01:00.000Z",
    details: {
      isCorrect: false,
      responseTimeMs: 2400,
    },
  },
  {
    id: "writing-character-1",
    recordType: "attempt",
    activity: "writing",
    item: { kind: "character", id: "ni" },
    occurredAt: "2026-11-12T10:02:00.000Z",
    details: {
      kind: "vocabulary-character",
      correctStrokes: 7,
      totalStrokes: 10,
      mistakes: 1,
    },
  },
  {
    id: "writing-vocabulary-1",
    recordType: "attempt",
    activity: "writing",
    item: { kind: "vocabulary", id: "hello" },
    occurredAt: "2026-11-12T10:03:00.000Z",
    details: {
      kind: "vocabulary",
      correctStrokes: 7,
      totalStrokes: 10,
      mistakes: 1,
      characters: [
        {
          character: "你",
          correctStrokes: 7,
          totalStrokes: 10,
          mistakes: 1,
        },
      ],
    },
  },
  {
    id: "memory-writing-1",
    recordType: "attempt",
    activity: "writing",
    item: { kind: "vocabulary", id: "hello" },
    occurredAt: "2026-11-12T10:04:00.000Z",
    details: {
      kind: "memory",
      correctStrokes: 4,
      totalStrokes: 10,
      mistakes: 3,
      characters: [
        {
          character: "你",
          correctStrokes: 4,
          totalStrokes: 10,
          mistakes: 3,
        },
      ],
    },
  },
];

describe("aggregateLearningRecords", () => {
  it("calculates the overview from actual records", () => {
    const result = aggregateLearningRecords(records);

    expect(result.overview).toEqual({
      recordCount: 5,
      attemptCount: 4,
      statusChangeCount: 1,
      distinctItemCount: 2,
      trackedSessionCount: 1,
      firstActivityAt: "2026-11-10T10:00:00.000Z",
      lastActivityAt: "2026-11-11T12:00:00.000Z",
    });
  });

  it("calculates writing accuracy using stroke counts", () => {
    const result = aggregateLearningRecords(records);

    const writing = result.activities.find(
      (activity) => activity.activity === "writing",
    );

    expect(writing?.accuracyRate).toBe(0.8);
    expect(writing?.measuredSuccesses).toBe(8);
    expect(writing?.measuredTotal).toBe(10);
  });

  it("calculates listening accuracy using question counts", () => {
    const result = aggregateLearningRecords(records);

    const listening = result.activities.find(
      (activity) => activity.activity === "listening",
    );

    expect(listening?.accuracyRate).toBe(0.7);
  });

  it("does not treat flashcard ratings as objective accuracy", () => {
    const result = aggregateLearningRecords(records);

    const flashcards = result.activities.find(
      (activity) => activity.activity === "flashcard",
    );

    expect(flashcards?.accuracyRate).toBeNull();
    expect(flashcards?.flashcardRatings.hard).toBe(1);
    expect(flashcards?.averageResponseTimeMs).toBe(1800);
  });

  it("orders items by their latest attempt", () => {
    const result = aggregateLearningRecords(records);

    expect(result.items[0]?.item.id).toBe("hello");
    expect(result.items[1]?.item.id).toBe("ni");
  });

  it("keeps recognition, guided writing and memory writing separate", () => {
    const result = aggregateLearningRecords(vocabularyExerciseRecords);

    const vocabulary = result.items.find(
      (item) => item.item.id === "hello",
    );

    expect(vocabulary).toBeDefined();
    expect(vocabulary?.exerciseStatistics).toHaveLength(3);

    expect(vocabulary?.exerciseStatistics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exerciseType: "vocabulary-recognition",
          attemptCount: 2,
          correctCount: 1,
          incorrectCount: 1,
          accuracyRate: 0.5,
          difficultyRate: 0.5,
          averageResponseTimeMs: 1800,
        }),
        expect.objectContaining({
          exerciseType: "writing-practice",
          attemptCount: 1,
          perfectAttemptCount: 0,
          imperfectAttemptCount: 1,
          correctStrokes: 7,
          totalStrokes: 10,
          strokeAccuracyRate: 0.7,
        }),
        expect.objectContaining({
          exerciseType: "memory-writing",
          attemptCount: 1,
          perfectAttemptCount: 0,
          imperfectAttemptCount: 1,
          correctStrokes: 4,
          totalStrokes: 10,
          strokeAccuracyRate: 0.4,
        }),
      ]),
    );
    const writingStatistics = vocabulary?.exerciseStatistics.find(
  (statistics) => statistics.exerciseType === "writing-practice",
);

  const memoryStatistics = vocabulary?.exerciseStatistics.find(
    (statistics) => statistics.exerciseType === "memory-writing",
  );

  expect(writingStatistics?.difficultyRate).toBeCloseTo(0.3);
  expect(memoryStatistics?.difficultyRate).toBeCloseTo(0.6);
  });

  it("does not count supporting character records as separate attempts", () => {
    const result = aggregateLearningRecords(vocabularyExerciseRecords);

    const vocabulary = result.items.find(
      (item) => item.item.id === "hello",
    );

    expect(result.overview.attemptCount).toBe(4);
    expect(vocabulary?.attemptCount).toBe(4);

    const character = result.items.find(
      (item) => item.item.id === "ni",
    );

    expect(character).toBeUndefined();

    const writing = result.activities.find(
      (activity) => activity.activity === "writing",
    );

    expect(writing?.attemptCount).toBe(2);
    expect(writing?.measuredSuccesses).toBe(11);
    expect(writing?.measuredTotal).toBe(20);
  });

  it("uses the latest status change for an item", () => {
    const result = aggregateLearningRecords(records);

    const ni = result.items.find((item) => item.item.id === "ni");

    expect(ni?.latestStatus).toBe("needs-practice");
  });

  it("groups attempts by UTC calendar day", () => {
    const result = aggregateLearningRecords(records);

    expect(result.dailyActivity).toHaveLength(2);
    expect(result.dailyActivity[0]).toMatchObject({
      date: "2026-11-10",
      attemptCount: 2,
    });
    expect(result.dailyActivity[1]).toMatchObject({
      date: "2026-11-11",
      attemptCount: 2,
    });
  });

  it("returns empty statistics for an empty history", () => {
    const result = aggregateLearningRecords([]);

    expect(result.overview.recordCount).toBe(0);
    expect(result.overview.attemptCount).toBe(0);
    expect(result.activities).toHaveLength(0);
    expect(result.items).toHaveLength(0);
    expect(result.dailyActivity).toHaveLength(0);
  });
});
