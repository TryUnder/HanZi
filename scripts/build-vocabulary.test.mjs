import { describe, expect, it } from "vitest";

import {
  buildVocabulary,
  createVocabularyId,
  validateVocabulary,
} from "./build-vocabulary.mjs";

describe("createVocabularyId", () => {
  it("creates a deterministic ID from a Chinese word", () => {
    expect(createVocabularyId("爱")).toBe("vocab-7231");
    expect(createVocabularyId("爱")).toBe(createVocabularyId("爱"));
  });

  it("supports words containing multiple Unicode characters", () => {
    expect(createVocabularyId("中国")).toBe("vocab-4e2d-56fd");
  });

  it("supports supplementary Unicode characters", () => {
    expect(createVocabularyId("𠮷")).toBe("vocab-20bb7");
  });

  it("rejects empty or invalid input", () => {
    expect(() => createVocabularyId("")).toThrow();
    expect(() => createVocabularyId(null)).toThrow();
  });
});

describe("buildVocabulary", () => {
  it("converts a matched word into the vocabulary model", () => {
    const result = buildVocabulary([
      {
        word: "爱",
        levels: [1],
        entries: [
          {
            traditional: "愛",
            simplified: "爱",
            pinyin: "ai4",
            normalizedPinyin: "ai4",
            definitions: ["to love", "to be fond of"],
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        id: "vocab-7231",
        simplified: "爱",
        traditionalVariants: ["愛"],
        hskLevels: [1],
        readings: [
          {
            pinyin: "ai4",
            sourcePinyinVariants: ["ai4"],
            entries: [
              {
                traditional: "愛",
                definitions: ["to love", "to be fond of"],
              },
            ],
          },
        ],
        audioUrl: null,
      },
    ]);
  });

  it("groups entries with the same normalized pronunciation", () => {
    const result = buildVocabulary([
      {
        word: "好",
        levels: [1],
        entries: [
          {
            traditional: "好",
            simplified: "好",
            pinyin: "hao3",
            normalizedPinyin: "hao3",
            definitions: ["good", "well"],
          },
          {
            traditional: "好",
            simplified: "好",
            pinyin: "Hao3",
            normalizedPinyin: "hao3",
            definitions: ["quite", "very"],
          },
        ],
      },
    ]);

    expect(result[0].readings).toHaveLength(1);
    expect(result[0].readings[0].entries).toHaveLength(2);

    expect(result[0].readings[0].sourcePinyinVariants).toEqual([
      "Hao3",
      "hao3",
    ]);
  });

  it("preserves multiple pronunciations", () => {
    const result = buildVocabulary([
      {
        word: "好",
        levels: [1],
        entries: [
          {
            traditional: "好",
            simplified: "好",
            pinyin: "hao3",
            normalizedPinyin: "hao3",
            definitions: ["good"],
          },
          {
            traditional: "好",
            simplified: "好",
            pinyin: "hao4",
            normalizedPinyin: "hao4",
            definitions: ["to be fond of"],
          },
        ],
      },
    ]);

    expect(result[0].readings).toHaveLength(2);

    expect(result[0].readings.map((reading) => reading.pinyin)).toEqual([
      "hao3",
      "hao4",
    ]);
  });

  it("preserves different traditional forms", () => {
    const result = buildVocabulary([
      {
        word: "台",
        levels: [2],
        entries: [
          {
            traditional: "台",
            simplified: "台",
            pinyin: "tai2",
            normalizedPinyin: "tai2",
            definitions: ["platform"],
          },
          {
            traditional: "臺",
            simplified: "台",
            pinyin: "tai2",
            normalizedPinyin: "tai2",
            definitions: ["platform", "stage"],
          },
        ],
      },
    ]);

    expect(result[0].traditionalVariants).toEqual(["台", "臺"]);
    expect(result[0].readings[0].entries).toHaveLength(2);
  });

  it("preserves multiple HSK levels without duplicates", () => {
    const result = buildVocabulary([
      {
        word: "学习",
        levels: [3, 1, 3, 2],
        entries: [],
      },
    ]);

    expect(result[0].hskLevels).toEqual([1, 2, 3]);
  });

  it("keeps unmatched HSK words", () => {
    const result = buildVocabulary([
      {
        word: "打篮球",
        levels: [2],
        entries: [],
      },
    ]);

    expect(result[0]).toEqual({
      id: "vocab-6253-7bee-7403",
      simplified: "打篮球",
      traditionalVariants: [],
      hskLevels: [2],
      readings: [],
      audioUrl: null,
    });
  });

  it("sorts vocabulary deterministically", () => {
    const result = buildVocabulary([
      { word: "中国", levels: [1], entries: [] },
      { word: "爱", levels: [1], entries: [] },
    ]);

    expect(result.map((entry) => entry.simplified)).toEqual(["中国", "爱"]);
  });

  it("rejects invalid matcher input", () => {
    expect(() => buildVocabulary(null)).toThrow();
    expect(() =>
      buildVocabulary([{ word: "好", levels: null, entries: [] }]),
    ).toThrow();
  });
});

describe("validateVocabulary", () => {
  const validEntry = {
    id: "vocab-7231",
    simplified: "爱",
    traditionalVariants: ["愛"],
    hskLevels: [1],
    readings: [
      {
        pinyin: "ai4",
        sourcePinyinVariants: ["ai4"],
        entries: [
          {
            traditional: "愛",
            definitions: ["to love"],
          },
        ],
      },
    ],
    audioUrl: null,
  };

  it("accepts valid vocabulary", () => {
    expect(validateVocabulary([validEntry])).toBe(true);
  });

  it("accepts an empty vocabulary array", () => {
    expect(validateVocabulary([])).toBe(true);
  });

  it("rejects duplicate IDs", () => {
    expect(() =>
      validateVocabulary([validEntry, { ...validEntry, simplified: "好" }]),
    ).toThrow(/Duplicate vocabulary ID/);
  });

  it("rejects duplicate simplified words", () => {
    expect(() =>
      validateVocabulary([validEntry, { ...validEntry, id: "another-id" }]),
    ).toThrow(/Duplicate simplified word/);
  });

  it("rejects invalid HSK levels", () => {
    expect(() =>
      validateVocabulary([{ ...validEntry, hskLevels: [7] }]),
    ).toThrow(/Invalid HSK level/);
  });

  it("rejects malformed dictionary entries", () => {
    expect(() =>
      validateVocabulary([
        {
          ...validEntry,
          readings: [
            {
              pinyin: "ai4",
              sourcePinyinVariants: ["ai4"],
              entries: [
                {
                  traditional: "愛",
                  definitions: [123],
                },
              ],
            },
          ],
        },
      ]),
    ).toThrow(/Invalid dictionary entry/);
  });
});
