import { describe, expect, it } from "vitest";
import { parseHskCollection, parseHskFile } from "./hskParser.mjs";

describe("parseHskFile", () => {
  it("parses a valid HSK file", () => {
    const result = parseHskFile("HSK1\n的\n一\n是\n", 1);

    expect(result).toEqual([
      { word: "的", level: 1 },
      { word: "一", level: 1 },
      { word: "是", level: 1 },
    ]);
  });

  it("removes a UTF-8 BOM", () => {
    const result = parseHskFile("\uFEFFHSK1\n的\n", 1);

    expect(result).toEqual([{ word: "的", level: 1 }]);
  });

  it("supports Windows line endings", () => {
    const result = parseHskFile("HSK2\r\n就\r\n", 2);

    expect(result).toEqual([{ word: "就", level: 2 }]);
  });

  it("ignores empty lines", () => {
    const result = parseHskFile("HSK1\n\n的\n\n一\n", 1);

    expect(result).toHaveLength(2);
  });

  it("rejects an incorrect header", () => {
    expect(() => parseHskFile("HSK2\n的\n", 1)).toThrow(
      'Expected header "HSK1"',
    );
  });

  it("rejects an invalid HSK level", () => {
    expect(() => parseHskFile("HSK7\n的\n", 7)).toThrow("Invalid HSK level");
  });

  it("rejects an empty vocabulary list", () => {
    expect(() => parseHskFile("HSK1\n", 1)).toThrow("contains no vocabulary");
  });

  it("rejects duplicate words", () => {
    expect(() => parseHskFile("HSK1\n的\n的\n", 1)).toThrow(
      "contains duplicate words",
    );
  });
});

describe("parseHskCollection", () => {
  it("combines all six HSK levels", () => {
    const sources = new Map([
      [1, "HSK1\n的\n"],
      [2, "HSK2\n就\n"],
      [3, "HSK3\n啊\n"],
      [4, "HSK4\n得\n"],
      [5, "HSK5\n嗯\n"],
      [6, "HSK6\n哦\n"],
    ]);

    const result = parseHskCollection(sources);

    expect(result).toHaveLength(6);
    expect(result.map((entry) => entry.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("rejects a missing HSK level", () => {
    const sources = new Map([[1, "HSK1\n的\n"]]);

    expect(() => parseHskCollection(sources)).toThrow(
      "Missing source file for HSK2",
    );
  });
});
