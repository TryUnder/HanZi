import { describe, expect, it } from "vitest";
import { parseCedictFile, parseCedictLine } from "./cedictParser.mjs";

describe("parseCedictLine", () => {
  it("parses a standard dictionary entry", () => {
    expect(parseCedictLine("我 我 [wo3] /I; me; my/")).toEqual({
      traditional: "我",
      simplified: "我",
      pinyin: "wo3",
      definitions: ["I; me; my"],
    });
  });

  it("supports different traditional and simplified characters", () => {
    expect(parseCedictLine("我們 我们 [wo3 men5] /we; us; ourselves/")).toEqual(
      {
        traditional: "我們",
        simplified: "我们",
        pinyin: "wo3 men5",
        definitions: ["we; us; ourselves"],
      },
    );
  });

  it("preserves multiple definitions", () => {
    const result = parseCedictLine(
      "好 好 [hao3] /good/appropriate; proper/all right!/",
    );

    expect(result?.definitions).toEqual([
      "good",
      "appropriate; proper",
      "all right!",
    ]);
  });

  it("preserves alternative pronunciations as separate entries", () => {
    const first = parseCedictLine("好 好 [hao3] /good/");
    const second = parseCedictLine("好 好 [hao4] /to be fond of/");

    expect(first?.pinyin).toBe("hao3");
    expect(second?.pinyin).toBe("hao4");
  });

  it("supports numbered and Latin-letter pronunciations", () => {
    expect(parseCedictLine("3D 3D [san1 D] /three dimensional/")?.pinyin).toBe(
      "san1 D",
    );
  });

  it("ignores comments and empty lines", () => {
    expect(parseCedictLine("# CC-CEDICT")).toBeNull();
    expect(parseCedictLine("   ")).toBeNull();
  });

  it("rejects malformed entries", () => {
    expect(() => parseCedictLine("我 我 wo3 /I; me/")).toThrow(
      "Invalid CC-CEDICT entry",
    );
  });

  it("rejects entries without definitions", () => {
    expect(() => parseCedictLine("我 我 [wo3] //")).toThrow(
      "Entry has no definitions",
    );
  });
});

describe("parseCedictFile", () => {
  it("parses multiple entries and skips comments", () => {
    const content = [
      "# CC-CEDICT",
      "",
      "我 我 [wo3] /I; me; my/",
      "你 你 [ni3] /you/",
      "我们 我们 [wo3 men5] /we; us/",
    ].join("\n");

    const result = parseCedictFile(content);

    expect(result).toHaveLength(3);
    expect(result.map((entry) => entry.simplified)).toEqual([
      "我",
      "你",
      "我们",
    ]);
  });

  it("reports the line number of malformed entries", () => {
    const content = [
      "# CC-CEDICT",
      "我 我 [wo3] /I; me/",
      "invalid entry",
    ].join("\n");

    expect(() => parseCedictFile(content)).toThrow(
      "CC-CEDICT parsing failed at line 3",
    );
  });
});
