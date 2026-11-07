import { describe, expect, it } from "vitest";
import {
  isVocabularyLearningData,
  validateVocabularyLearningDataset,
} from "./vocabularyLearningValidation";

const vocabulary = [{ id: "vocab-7231" }, { id: "vocab-4e00" }];

const validEntry = {
  status: "draft",
  meanings: ["kochać", "lubić"],
  examples: [
    {
      simplified: "我爱你。",
      pinyin: "Wǒ ài nǐ.",
      meaning: "Kocham cię.",
    },
  ],
  notes: [],
};

describe("validateVocabularyLearningDataset", () => {
  it("accepts a valid learning dataset", () => {
    expect(
      validateVocabularyLearningDataset(
        {
          "vocab-7231": validEntry,
        },
        vocabulary,
      ),
    ).toEqual([]);
  });

  it("accepts an empty dataset", () => {
    expect(validateVocabularyLearningDataset({}, vocabulary)).toEqual([]);
  });

  it("rejects a non-object dataset", () => {
    expect(validateVocabularyLearningDataset([], vocabulary)).toContain(
      "Learning dataset: expected an object keyed by vocabulary ID.",
    );
  });

  it("rejects unknown vocabulary IDs", () => {
    const errors = validateVocabularyLearningDataset(
      {
        "vocab-unknown": validEntry,
      },
      vocabulary,
    );

    expect(errors).toContain('Learning dataset["vocab-unknown"]: unknown vocabulary ID.');
  });

  it("rejects an invalid status", () => {
    const errors = validateVocabularyLearningDataset(
      {
        "vocab-7231": { ...validEntry, status: "published" },
      },
      vocabulary,
    );

    expect(errors).toContain(
      'Learning dataset["vocab-7231"].status: expected "draft" or "verified".',
    );
  });

  it("rejects empty meanings in a verified entry", () => {
    const errors = validateVocabularyLearningDataset(
      {
        "vocab-7231": { ...validEntry, status: "verified", meanings: [] },
      },
      vocabulary,
    );

    expect(errors).toContain(
      'Learning dataset["vocab-7231"]: verified entries must contain at least one meaning.',
    );
  });

  it("rejects malformed examples", () => {
    const errors = validateVocabularyLearningDataset(
      {
        "vocab-7231": {
          ...validEntry,
          examples: [{ simplified: "我爱你。", pinyin: "", meaning: "Kocham cię." }],
        },
      },
      vocabulary,
    );

    expect(errors).toContain(
      'Learning dataset["vocab-7231"].examples[0].pinyin: expected a non-empty string.',
    );
  });

  it("rejects empty notes", () => {
    const errors = validateVocabularyLearningDataset(
      {
        "vocab-7231": { ...validEntry, notes: ["   "] },
      },
      vocabulary,
    );

    expect(errors).toContain(
      'Learning dataset["vocab-7231"].notes: expected an array of non-empty strings.',
    );
  });

  it("rejects unexpected properties", () => {
    const errors = validateVocabularyLearningDataset(
      {
        "vocab-7231": { ...validEntry, translation: "love" },
      },
      vocabulary,
    );

    expect(errors).toContain(
      'Learning dataset["vocab-7231"]: contains unexpected properties.',
    );
  });
});

describe("isVocabularyLearningData", () => {
  it("recognizes a valid learning record", () => {
    expect(isVocabularyLearningData(validEntry)).toBe(true);
  });

  it("rejects a verified record without meanings", () => {
    expect(
      isVocabularyLearningData({
        ...validEntry,
        status: "verified",
        meanings: [],
      }),
    ).toBe(false);
  });

  it("rejects a record with an invalid example", () => {
    expect(
      isVocabularyLearningData({
        ...validEntry,
        examples: [{ simplified: "我爱你。", pinyin: "", meaning: "Kocham cię." }],
      }),
    ).toBe(false);
  });
});