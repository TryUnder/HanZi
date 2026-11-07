import { describe, expect, it } from "vitest";
import { isLearningRecord } from "./learningRecordValidation";

const baseRecord = {
  id: "record-001",
  item: {
    kind: "character",
    id: "ni",
  },
  occurredAt: "2026-11-07T18:00:00.000Z",
};

describe("isLearningRecord", () => {
  it("accepts a valid writing attempt", () => {
    const record = {
      ...baseRecord,
      recordType: "attempt",
      activity: "writing",
      details: {
        correctStrokes: 7,
        totalStrokes: 7,
        mistakes: 2,
        strokeMistakes: [
          {
            strokeIndex: 1,
            mistakes: 2,
          },
        ],
      },
    };

    expect(isLearningRecord(record)).toBe(true);
  });

  it("accepts a valid speaking attempt", () => {
    const record = {
      ...baseRecord,
      recordType: "attempt",
      activity: "speaking",
      details: {
        expectedTone: 3,
        detectedTone: 3,
        assessmentStatus: "matched",
        confidence: 85,
        candidates: [
          { tone: 3, score: 85 },
          { tone: 2, score: 72 },
        ],
      },
    };

    expect(isLearningRecord(record)).toBe(true);
  });

  it("accepts an ambiguous speaking result", () => {
    const record = {
      ...baseRecord,
      recordType: "attempt",
      activity: "speaking",
      details: {
        expectedTone: 1,
        assessmentStatus: "ambiguous",
        confidence: 91,
        candidates: [
          { tone: 1, score: 91 },
          { tone: 5, score: 90 },
        ],
      },
    };

    expect(isLearningRecord(record)).toBe(true);
  });

  it("accepts a vocabulary listening attempt", () => {
    const record = {
      ...baseRecord,
      item: {
        kind: "vocabulary",
        id: "vocab-4f60",
      },
      recordType: "attempt",
      activity: "listening",
      details: {
        mode: "pinyin",
        questionCount: 10,
        correctAnswers: 8,
      },
    };

    expect(isLearningRecord(record)).toBe(true);
  });

  it("accepts a flashcard attempt", () => {
    const record = {
      ...baseRecord,
      recordType: "attempt",
      activity: "flashcard",
      details: {
        rating: "good",
        responseTimeMs: 2400,
      },
    };

    expect(isLearningRecord(record)).toBe(true);
  });

  it("accepts a self-assessment status change", () => {
    const record = {
      ...baseRecord,
      recordType: "status-changed",
      status: "learning",
    };

    expect(isLearningRecord(record)).toBe(true);
  });

  it("rejects an unknown item kind", () => {
    const record = {
      ...baseRecord,
      item: {
        kind: "sentence",
        id: "sentence-001",
      },
      recordType: "status-changed",
      status: "learning",
    };

    expect(isLearningRecord(record)).toBe(false);
  });

  it("rejects an invalid tone", () => {
    const record = {
      ...baseRecord,
      recordType: "attempt",
      activity: "speaking",
      details: {
        expectedTone: 6,
        assessmentStatus: "matched",
        detectedTone: 6,
        confidence: 90,
        candidates: [],
      },
    };

    expect(isLearningRecord(record)).toBe(false);
  });

  it("rejects writing mistakes outside the stroke range", () => {
    const record = {
      ...baseRecord,
      recordType: "attempt",
      activity: "writing",
      details: {
        correctStrokes: 7,
        totalStrokes: 7,
        mistakes: 1,
        strokeMistakes: [
          {
            strokeIndex: 7,
            mistakes: 1,
          },
        ],
      },
    };

    expect(isLearningRecord(record)).toBe(false);
  });

  it("rejects duplicate stroke mistake entries", () => {
    const record = {
      ...baseRecord,
      recordType: "attempt",
      activity: "writing",
      details: {
        correctStrokes: 7,
        totalStrokes: 7,
        mistakes: 2,
        strokeMistakes: [
          { strokeIndex: 1, mistakes: 1 },
          { strokeIndex: 1, mistakes: 1 },
        ],
      },
    };

    expect(isLearningRecord(record)).toBe(false);
  });

  it("rejects an invalid listening score", () => {
    const record = {
      ...baseRecord,
      recordType: "attempt",
      activity: "listening",
      details: {
        mode: "character",
        questionCount: 5,
        correctAnswers: 6,
      },
    };

    expect(isLearningRecord(record)).toBe(false);
  });

  it("rejects invalid dates", () => {
    const record = {
      ...baseRecord,
      occurredAt: "not-a-date",
      recordType: "status-changed",
      status: "known",
    };

    expect(isLearningRecord(record)).toBe(false);
  });

  it("rejects null and primitive values", () => {
    expect(isLearningRecord(null)).toBe(false);
    expect(isLearningRecord(undefined)).toBe(false);
    expect(isLearningRecord("record")).toBe(false);
    expect(isLearningRecord(123)).toBe(false);
  });
});
