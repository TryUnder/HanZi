import { describe, expect, it } from "vitest";
import { createVocabularyDisplay, formatPinyin } from "./vocabularyDisplay";
import type {
  VocabularyEntry,
  VocabularyLearningData,
} from "../../types/vocabulary";

describe("formatPinyin", () => {
  it.each([
    ["ni3", "nǐ"],
    ["hao3", "hǎo"],
    ["zhong1", "zhōng"],
    ["xue2", "xué"],
    ["nv3", "nǚ"],
    ["ma5", "ma"],
    ["yi1", "yī"],
    ["liu4", "liù"],
    ["gui3", "guǐ"],
    ["dui4", "duì"],
    ["shui3", "shuǐ"],
    ["mei3", "měi"],
    ["nu:3", "nǚ"],
  ])("converts %s into %s", (input, expected) => {
    expect(formatPinyin(input)).toBe(expected);
  });

  it("formats multiple syllables", () => {
    expect(formatPinyin("ni3 hao3")).toBe("nǐ hǎo");
  });

  it("handles whitespace", () => {
    expect(formatPinyin("  ni3   hao3  ")).toBe("nǐ hǎo");
  });

  it("preserves unrecognized input", () => {
    expect(formatPinyin("unknown")).toBe("unknown");
  });
});

describe("createVocabularyDisplay", () => {
  const vocabularyEntry: VocabularyEntry = {
    id: "vocab-4f60",
    simplified: "你",
    traditionalVariants: ["你"],
    hskLevels: [1],
    readings: [
      {
        pinyin: "ni3",
        sourcePinyinVariants: ["ni3"],
        entries: [
          {
            traditional: "你",
            definitions: ["you", "your"],
          },
        ],
      },
    ],
    audioUrl: null,
  };

  it("uses source definitions when learning data is unavailable", () => {
    const result = createVocabularyDisplay(vocabularyEntry);

    expect(result.meanings).toEqual(["you", "your"]);
    expect(result.isVerified).toBe(false);
    expect(result.examples).toEqual([]);
  });

  it("prefers verified Polish meanings when available", () => {
    const learningData: VocabularyLearningData = {
      status: "verified",
      meanings: ["ty", "tobie"],
      examples: [],
      notes: [],
    };

    const result = createVocabularyDisplay(vocabularyEntry, learningData);

    expect(result.meanings).toEqual(["ty", "tobie"]);
    expect(result.isVerified).toBe(true);
  });

  it("formats reading pronunciation", () => {
    const result = createVocabularyDisplay(vocabularyEntry);

    expect(result.readings).toHaveLength(1);
    expect(result.readings[0]?.pinyin).toBe("nǐ");
  });

  it("does not mutate source vocabulary", () => {
    const original = structuredClone(vocabularyEntry);

    createVocabularyDisplay(vocabularyEntry);

    expect(vocabularyEntry).toEqual(original);
  });
});
