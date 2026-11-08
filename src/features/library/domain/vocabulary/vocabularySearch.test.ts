
import { describe, expect, it } from "vitest";
import type { VocabularyDisplay } from "./vocabularyDisplay";
import {
  matchesVocabularySearch,
  normalizeVocabularySearchValue,
} from "./vocabularySearch";

const vocabulary: VocabularyDisplay = {
  id: "vocab-ni3",
  simplified: "你",
  traditionalVariants: ["你"],
  hskLevels: [1],
  readings: [
    {
      pinyin: "nǐ",
      definitions: ["you", "your"],
      traditionalForms: ["你"],
    },
  ],
  meanings: ["ty", "tobie"],
  examples: [
    {
      simplified: "你好",
      pinyin: "nǐ hǎo",
      meaning: "Cześć",
    },
  ],
  notes: ["Podstawowy zaimek osobowy"],
  isVerified: true,
  audioUrl: null,
};

describe("normalizeVocabularySearchValue", () => {
  it.each([
    ["nǐ", "ni"],
    ["ni3", "ni"],
    ["NǏ", "ni"],
    ["nǚ", "nu"],
    ["nv3", "nu"],
    ["nu:3", "nu"],
    ["HÀO3", "hao"],
    ["  hello  ", "hello"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeVocabularySearchValue(input)).toBe(expected);
  });
});

describe("matchesVocabularySearch", () => {
  it("matches simplified Chinese characters", () => {
    expect(matchesVocabularySearch(vocabulary, "你")).toBe(true);
  });

  it("matches traditional character variants", () => {
    expect(matchesVocabularySearch(vocabulary, "你")).toBe(true);
  });

  it("matches Pinyin with tone marks", () => {
    expect(matchesVocabularySearch(vocabulary, "nǐ")).toBe(true);
  });

  it("matches Pinyin without tone marks", () => {
    expect(matchesVocabularySearch(vocabulary, "ni")).toBe(true);
  });

  it("matches Pinyin with numeric tones", () => {
    expect(matchesVocabularySearch(vocabulary, "ni3")).toBe(true);
  });

  it("matches English dictionary definitions", () => {
    expect(matchesVocabularySearch(vocabulary, "you")).toBe(true);
  });

  it("matches curated Polish meanings", () => {
    expect(matchesVocabularySearch(vocabulary, "tobie")).toBe(true);
  });

  it("matches example sentences", () => {
    expect(matchesVocabularySearch(vocabulary, "你好")).toBe(true);
    expect(matchesVocabularySearch(vocabulary, "Cześć")).toBe(true);
  });

  it("matches notes", () => {
    expect(matchesVocabularySearch(vocabulary, "zaimek")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(matchesVocabularySearch(vocabulary, "YOU")).toBe(true);
  });

  it("returns true for an empty search", () => {
    expect(matchesVocabularySearch(vocabulary, "")).toBe(true);
  });

  it("returns false when there is no match", () => {
    expect(matchesVocabularySearch(vocabulary, "student")).toBe(false);
  });
});
