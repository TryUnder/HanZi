
import { describe, expect, it } from "vitest";

import {
  createVocabularyLearningRepository,
} from "./vocabularyLearningRepository";

import type {
  VocabularyEntry,
  VocabularyLearningDataset,
} from "../types/vocabulary";

const vocabularyFixture: VocabularyEntry[] = [
  {
    id: "vocab-ni",
    simplified: "你",
    traditionalVariants: ["你"],
    hskLevels: [1],
    readings: [
      {
        pinyin: "nǐ",
        sourcePinyinVariants: ["ni3"],
        entries: [{ traditional: "你", definitions: ["you"] }],
      },
    ],
    audioUrl: null,
  },
  {
    id: "vocab-hao",
    simplified: "好",
    traditionalVariants: ["好"],
    hskLevels: [1, 2],
    readings: [
      {
        pinyin: "hǎo",
        sourcePinyinVariants: ["hao3"],
        entries: [{ traditional: "好", definitions: ["good"] }],
      },
    ],
    audioUrl: null,
  },
  {
    id: "vocab-zhongguo",
    simplified: "中国",
    traditionalVariants: ["中國"],
    hskLevels: [2],
    readings: [
      {
        pinyin: "zhōng guó",
        sourcePinyinVariants: ["zhong1 guo2"],
        entries: [{ traditional: "中國", definitions: ["China"] }],
      },
    ],
    audioUrl: null,
  },
];

const learningFixture: VocabularyLearningDataset = {
  "vocab-ni": {
    status: "verified",
    meanings: ["ty"],
    examples: [
      {
        simplified: "你好",
        pinyin: "nǐ hǎo",
        meaning: "Cześć.",
      },
    ],
    notes: [],
  },
  "vocab-hao": {
    status: "draft",
    meanings: ["dobry"],
    examples: [],
    notes: ["Wymaga sprawdzenia."],
  },
};

function createTestRepository() {
  return createVocabularyLearningRepository(
    vocabularyFixture,
    learningFixture,
  );
}

describe("vocabularyLearningRepository", () => {
  it("returns all vocabulary entries", () => {
    const repository = createTestRepository();

    expect(repository.getAllVocabulary()).toEqual(vocabularyFixture);
    expect(repository.getVocabularyCount()).toBe(3);
  });

  it("returns a vocabulary entry by ID", () => {
    const repository = createTestRepository();

    expect(repository.getVocabularyById("vocab-ni")).toEqual(
      vocabularyFixture[0],
    );
  });

  it("returns undefined for an unknown vocabulary ID", () => {
    const repository = createTestRepository();

    expect(repository.getVocabularyById("unknown-id")).toBeUndefined();
    expect(repository.getVocabularyLearningData("unknown-id")).toBeUndefined();
  });

  it("returns vocabulary entries assigned to an HSK level", () => {
    const repository = createTestRepository();

    expect(
      repository.getVocabularyByHskLevel(1).map((entry) => entry.id),
    ).toEqual(["vocab-ni", "vocab-hao"]);

    expect(
      repository.getVocabularyByHskLevel(2).map((entry) => entry.id),
    ).toEqual(["vocab-hao", "vocab-zhongguo"]);
  });

  it("returns learning data for an existing vocabulary entry", () => {
    const repository = createTestRepository();

    expect(repository.getVocabularyLearningData("vocab-ni")).toEqual(
      learningFixture["vocab-ni"],
    );
  });

  it("returns only verified vocabulary entries", () => {
    const repository = createTestRepository();

    expect(
      repository.getVerifiedVocabulary().map((entry) => entry.id),
    ).toEqual(["vocab-ni"]);

    expect(repository.getVerifiedVocabularyCount()).toBe(1);
  });

  it("returns entries without learning records as unreviewed", () => {
    const repository = createTestRepository();

    expect(
      repository.getUnreviewedVocabulary().map((entry) => entry.id),
    ).toEqual(["vocab-zhongguo"]);
  });

  it("rejects learning records referencing unknown vocabulary IDs", () => {
    const invalidDataset: VocabularyLearningDataset = {
      "unknown-id": {
        status: "draft",
        meanings: ["example"],
        examples: [],
        notes: [],
      },
    };

    expect(() =>
      createVocabularyLearningRepository(
        vocabularyFixture,
        invalidDataset,
      ),
    ).toThrow("unknown vocabulary ID");
  });
});
