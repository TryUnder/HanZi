import { describe, expect, it } from "vitest";
import { buildHskDiagnostics } from "./hskDiagnostics.mjs";

describe("buildHskDiagnostics", () => {
  it("detects words assigned to multiple HSK levels", () => {
    const result = buildHskDiagnostics([
      {
        word: "你好",
        levels: [1, 2],
        entries: [],
      },
    ]);

    expect(result.statistics.wordsInMultipleLevels).toBe(1);
    expect(result.wordsInMultipleLevels[0].levels).toEqual([1, 2]);
  });

  it("detects multiple pronunciations", () => {
    const result = buildHskDiagnostics([
      {
        word: "啊",
        levels: [3],
        entries: [
          { pinyin: "a1", definitions: ["Ah"] },
          { pinyin: "a2", definitions: ["Eh"] },
          { pinyin: "a3", definitions: ["Oh"] },
        ],
      },
    ]);

    expect(result.statistics.wordsWithMultiplePronunciations).toBe(1);
    expect(
      result.wordsWithMultiplePronunciations[0].pronunciations,
    ).toHaveLength(3);
  });

  it("detects multiple entries with the same pronunciation", () => {
    const result = buildHskDiagnostics([
      {
        word: "安宁",
        levels: [6],
        entries: [
          { pinyin: "an1 ning2", definitions: ["peaceful"] },
          { pinyin: "An1 ning2", definitions: ["see another entry"] },
        ],
      },
    ]);

    expect(result.statistics.wordsWithMultipleEntriesSamePronunciation).toBe(1);

    expect(
      result.wordsWithMultipleEntriesSamePronunciation[0].pronunciations[0]
        .entriesCount,
    ).toBe(2);
  });

  it("does not confuse different pronunciations with duplicate entries", () => {
    const result = buildHskDiagnostics([
      {
        word: "宿",
        levels: [6],
        entries: [
          { pinyin: "su4", definitions: ["to stay overnight"] },
          { pinyin: "xiu3", definitions: ["night"] },
        ],
      },
    ]);

    expect(result.statistics.wordsWithMultiplePronunciations).toBe(1);
    expect(result.statistics.wordsWithMultipleEntriesSamePronunciation).toBe(0);
  });

  it("handles words with a single pronunciation and entry", () => {
    const result = buildHskDiagnostics([
      {
        word: "爱",
        levels: [1],
        entries: [{ pinyin: "ai4", definitions: ["to love"] }],
      },
    ]);

    expect(result.statistics.wordsWithMultiplePronunciations).toBe(0);
    expect(result.statistics.wordsWithMultipleEntriesSamePronunciation).toBe(0);
  });

  it("handles empty input", () => {
    const result = buildHskDiagnostics([]);

    expect(result.statistics).toEqual({
      wordsInMultipleLevels: 0,
      wordsWithMultiplePronunciations: 0,
      wordsWithMultipleEntriesSamePronunciation: 0,
    });
  });
});
