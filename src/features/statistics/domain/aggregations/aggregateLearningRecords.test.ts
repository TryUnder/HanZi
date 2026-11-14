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

  it("ranks items by recorded difficulty", () => {
    const result = aggregateLearningRecords(records);

    expect(result.items[0]?.item.id).toBe("ni");
    expect(result.items[1]?.item.id).toBe("hello");
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
