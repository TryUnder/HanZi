import { describe, expect, it } from "vitest";
import { matchHskWithCedict } from "./hskCedictMatcher.mjs";

const cedictEntries = [
  {
    traditional: "你好",
    simplified: "你好",
    pinyin: "ni3 hao3",
    definitions: ["hello", "hi"],
  },
  {
    traditional: "你好",
    simplified: "你好",
    pinyin: "ni3 hao3",
    definitions: ["a greeting"],
  },
  {
    traditional: "宿",
    simplified: "宿",
    pinyin: "su4",
    definitions: ["to stay overnight"],
  },
  {
    traditional: "宿",
    simplified: "宿",
    pinyin: "xiu3",
    definitions: ["night"],
  },
];

describe("matchHskWithCedict", () => {
  it("matches HSK words with CC-CEDICT", () => {
    const result = matchHskWithCedict(
      [{ word: "你好", level: 1 }],
      cedictEntries,
    );

    expect(result.statistics.matchedWords).toBe(1);
    expect(result.words[0].entries).toHaveLength(2);
  });

  it("preserves all dictionary entries", () => {
    const result = matchHskWithCedict(
      [{ word: "宿", level: 4 }],
      cedictEntries,
    );

    expect(result.words[0].entries).toHaveLength(2);
    expect(result.words[0].entries.map((entry) => entry.pinyin)).toEqual([
      "su4",
      "xiu3",
    ]);
  });

  it("adds normalized Pinyin without changing the original", () => {
    const result = matchHskWithCedict(
      [{ word: "你好", level: 1 }],
      cedictEntries,
    );

    expect(result.words[0].entries[0].pinyin).toBe("ni3 hao3");
    expect(result.words[0].entries[0].normalizedPinyin).toBe("ni3 hao3");
  });

  it("merges a word assigned to multiple HSK levels", () => {
    const result = matchHskWithCedict(
      [
        { word: "你好", level: 1 },
        { word: "你好", level: 2 },
      ],
      cedictEntries,
    );

    expect(result.words).toHaveLength(1);
    expect(result.words[0].levels).toEqual([1, 2]);
    expect(result.statistics.duplicateWordsAcrossLevels).toBe(1);
  });

  it("keeps unmatched HSK words", () => {
    const result = matchHskWithCedict(
      [{ word: "不存在", level: 6 }],
      cedictEntries,
    );

    expect(result.words[0].entries).toEqual([]);
    expect(result.statistics.unmatchedWords).toBe(1);
  });

  it("calculates coverage percentage", () => {
    const result = matchHskWithCedict(
      [
        { word: "你好", level: 1 },
        { word: "不存在", level: 1 },
      ],
      cedictEntries,
    );

    expect(result.statistics.coveragePercentage).toBe(50);
  });

  it("handles empty input", () => {
    const result = matchHskWithCedict([], []);

    expect(result.words).toEqual([]);
    expect(result.statistics.coveragePercentage).toBe(0);
  });
});
